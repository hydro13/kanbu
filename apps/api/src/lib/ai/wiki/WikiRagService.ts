/**
 * Wiki RAG Service
 * Version: 1.0.0
 *
 * Retrieval-Augmented Generation for Wiki content.
 * Enables natural language Q&A over wiki pages with source citations.
 *
 * Fase 15.3 - Ask the Wiki
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * =============================================================================
 */

import type { PrismaClient } from '@prisma/client';
import {
  getWikiAiService,
  getWikiEmbeddingService,
  type WikiContext,
  type WikiAiService,
  type WikiEmbeddingService,
} from './index';

// =============================================================================
// Types
// =============================================================================

export interface RagContext {
  pageId: number;
  title: string;
  slug: string;
  content: string;
  score: number;
  groupId: string;
}

export interface RagSource {
  pageId: number;
  title: string;
  slug: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface RagAnswer {
  answer: string;
  sources: RagSource[];
  context: RagContext[];
  tokensUsed?: number;
  model?: string;
  provider?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: RagSource[];
  timestamp: Date;
}

export interface Conversation {
  id: string;
  workspaceId: number;
  projectId?: number;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AskWikiOptions {
  /** Maximum number of context pages to retrieve */
  maxContextPages?: number;
  /** Minimum relevance score for context (0-1) */
  minRelevanceScore?: number;
  /** Maximum tokens for context (approximate) */
  maxContextTokens?: number;
  /** Include conversation history for follow-up questions */
  conversationId?: string;
  /** Scope: workspace or specific project */
  projectId?: number;
  /** Temperature for response generation */
  temperature?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_CONTEXT_PAGES = 5;
const DEFAULT_MIN_RELEVANCE_SCORE = 0.5;
const DEFAULT_MAX_CONTEXT_TOKENS = 4000;
const APPROX_CHARS_PER_TOKEN = 4;

const SYSTEM_PROMPT = `Je bent een behulpzame assistent die vragen beantwoordt op basis van de wiki documentatie van het team.

REGELS:
1. Gebruik ALLEEN informatie uit de gegeven context
2. Als je het antwoord niet weet of de context onvoldoende is, zeg dat eerlijk
3. Citeer je bronnen door de pagina titel te noemen, bijvoorbeeld: "Volgens [Pagina Titel]..."
4. Antwoord in dezelfde taal als de vraag
5. Wees beknopt maar volledig
6. Gebruik bullet points of genummerde lijsten waar gepast
7. Als de vraag onduidelijk is, vraag om verduidelijking

CONTEXT:
{context}

Beantwoord nu de vraag van de gebruiker. Verwijs naar de relevante bronnen in je antwoord.`;

// =============================================================================
// In-Memory Conversation Storage
// =============================================================================

// Simple in-memory store for conversations
// In production, this should be Redis or database
const conversationStore = new Map<string, Conversation>();

function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// WikiRagService Class
// =============================================================================

export class WikiRagService {
  private prisma: PrismaClient;
  private wikiAiService: WikiAiService;
  private wikiEmbeddingService: WikiEmbeddingService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.wikiAiService = getWikiAiService(prisma);
    this.wikiEmbeddingService = getWikiEmbeddingService(prisma);
  }

  // ===========================================================================
  // Main RAG Pipeline
  // ===========================================================================

  /**
   * Ask a question about the wiki content
   *
   * Pipeline:
   * 1. Retrieve relevant context via semantic search
   * 2. Format context for LLM
   * 3. Build prompt with conversation history (if any)
   * 4. Generate answer via reasoning provider
   * 5. Extract sources from response
   */
  async askWiki(
    question: string,
    workspaceId: number,
    options: AskWikiOptions = {}
  ): Promise<RagAnswer> {
    const {
      maxContextPages = DEFAULT_MAX_CONTEXT_PAGES,
      minRelevanceScore = DEFAULT_MIN_RELEVANCE_SCORE,
      maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS,
      conversationId,
      projectId,
      temperature = 0.7,
    } = options;

    const context: WikiContext = { workspaceId, projectId };

    // Check if reasoning provider is available
    const capabilities = await this.wikiAiService.getCapabilities(context);
    if (!capabilities.reasoning) {
      throw new Error('No reasoning provider configured for this workspace');
    }

    // Step 1: Retrieve relevant context
    const retrievedContext = await this.retrieveContext(question, workspaceId, {
      projectId,
      maxPages: maxContextPages,
      minScore: minRelevanceScore,
      maxTokens: maxContextTokens,
    });

    if (retrievedContext.length === 0) {
      return {
        answer:
          "Ik kon geen relevante informatie vinden in de wiki om je vraag te beantwoorden. Probeer je vraag anders te formuleren of controleer of er wiki pagina's over dit onderwerp bestaan.",
        sources: [],
        context: [],
      };
    }

    // Step 2: Format context for LLM
    const formattedContext = this.formatContext(retrievedContext);

    // Step 3: Build messages with conversation history
    const messages = this.buildMessages(question, formattedContext, conversationId);

    // Step 4: Generate answer
    const response = await this.wikiAiService.chat(context, messages, {
      temperature,
      maxTokens: 2000,
    });

    // Step 5: Extract sources from response and context
    const sources = this.extractSources(response, retrievedContext);

    // Step 6: Update conversation history
    if (conversationId) {
      this.updateConversation(conversationId, question, response, sources);
    }

    return {
      answer: response,
      sources,
      context: retrievedContext,
      model: capabilities.reasoningModel,
      provider: capabilities.reasoningProvider,
    };
  }

  // ===========================================================================
  // Context Retrieval
  // ===========================================================================

  /**
   * Retrieve relevant wiki pages for a question
   */
  private async retrieveContext(
    query: string,
    workspaceId: number,
    options: {
      projectId?: number;
      maxPages: number;
      minScore: number;
      maxTokens: number;
    }
  ): Promise<RagContext[]> {
    const context: WikiContext = {
      workspaceId,
      projectId: options.projectId,
    };

    // Use semantic search to find relevant pages
    const searchResults = await this.wikiEmbeddingService.semanticSearch(context, query, {
      workspaceId,
      projectId: options.projectId,
      limit: options.maxPages * 2, // Get extra to filter by score
      scoreThreshold: options.minScore,
    });

    if (searchResults.length === 0) {
      return [];
    }

    // Fetch full page content for top results
    const pageIds = searchResults.slice(0, options.maxPages).map((r) => r.pageId);

    // Determine which wiki table to query based on projectId
    const pages = options.projectId
      ? await this.prisma.wikiPage.findMany({
          where: { id: { in: pageIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
          },
        })
      : await this.prisma.workspaceWikiPage.findMany({
          where: { id: { in: pageIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
          },
        });

    // Build context with scores
    const contextPages: RagContext[] = [];
    let totalTokens = 0;

    for (const result of searchResults) {
      const page = pages.find((p) => p.id === result.pageId);
      if (!page) continue;

      // Estimate tokens
      const contentTokens = Math.ceil(page.content.length / APPROX_CHARS_PER_TOKEN);

      // Check if we have room for this page
      if (totalTokens + contentTokens > options.maxTokens) {
        // Truncate content to fit
        const remainingTokens = options.maxTokens - totalTokens;
        const truncatedContent =
          page.content.substring(0, remainingTokens * APPROX_CHARS_PER_TOKEN) + '...';

        contextPages.push({
          pageId: page.id,
          title: page.title,
          slug: page.slug,
          content: truncatedContent,
          score: result.score,
          groupId: result.groupId,
        });
        break;
      }

      contextPages.push({
        pageId: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        score: result.score,
        groupId: result.groupId,
      });

      totalTokens += contentTokens;
    }

    return contextPages;
  }

  // ===========================================================================
  // Context Formatting
  // ===========================================================================

  /**
   * Format retrieved context for the LLM prompt
   */
  private formatContext(context: RagContext[]): string {
    if (context.length === 0) {
      return "Geen relevante wiki pagina's gevonden.";
    }

    return context
      .map((page, index) => {
        const relevance =
          page.score >= 0.8
            ? 'zeer relevant'
            : page.score >= 0.6
              ? 'relevant'
              : 'mogelijk relevant';
        return `--- BRON ${index + 1}: ${page.title} (${relevance}) ---
${page.content}
--- EINDE BRON ${index + 1} ---`;
      })
      .join('\n\n');
  }

  // ===========================================================================
  // Message Building
  // ===========================================================================

  /**
   * Build chat messages including conversation history
   */
  private buildMessages(
    question: string,
    formattedContext: string,
    conversationId?: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const systemPrompt = SYSTEM_PROMPT.replace('{context}', formattedContext);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if available
    if (conversationId) {
      const conversation = conversationStore.get(conversationId);
      if (conversation) {
        // Add last few exchanges for context (limit to avoid token overflow)
        const recentMessages = conversation.messages.slice(-6);
        for (const msg of recentMessages) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add current question
    messages.push({ role: 'user', content: question });

    return messages;
  }

  // ===========================================================================
  // Source Extraction
  // ===========================================================================

  /**
   * Extract sources mentioned in the answer
   */
  private extractSources(answer: string, context: RagContext[]): RagSource[] {
    const sources: RagSource[] = [];
    const mentionedTitles = new Set<string>();

    // Look for page titles mentioned in the answer
    for (const page of context) {
      // Check if page title is mentioned (case-insensitive)
      const titleLower = page.title.toLowerCase();
      const answerLower = answer.toLowerCase();

      if (answerLower.includes(titleLower) || answerLower.includes(`[${titleLower}]`)) {
        mentionedTitles.add(page.title);
        sources.push({
          pageId: page.pageId,
          title: page.title,
          slug: page.slug,
          relevance: page.score >= 0.8 ? 'high' : page.score >= 0.6 ? 'medium' : 'low',
        });
      }
    }

    // Also include high-relevance context pages that weren't explicitly mentioned
    // (they likely contributed to the answer)
    for (const page of context) {
      if (!mentionedTitles.has(page.title) && page.score >= 0.7) {
        sources.push({
          pageId: page.pageId,
          title: page.title,
          slug: page.slug,
          relevance: page.score >= 0.8 ? 'high' : 'medium',
        });
      }
    }

    // Sort by relevance
    return sources.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.relevance] - order[b.relevance];
    });
  }

  // ===========================================================================
  // Conversation Management
  // ===========================================================================

  /**
   * Create a new conversation
   */
  createConversation(workspaceId: number, projectId?: number): Conversation {
    const id = generateConversationId();
    const conversation: Conversation = {
      id,
      workspaceId,
      projectId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversationStore.set(id, conversation);
    return conversation;
  }

  /**
   * Get an existing conversation
   */
  getConversation(conversationId: string): Conversation | null {
    return conversationStore.get(conversationId) ?? null;
  }

  /**
   * Update conversation with new message exchange
   */
  private updateConversation(
    conversationId: string,
    question: string,
    answer: string,
    sources: RagSource[]
  ): void {
    const conversation = conversationStore.get(conversationId);
    if (!conversation) return;

    conversation.messages.push({
      role: 'user',
      content: question,
      timestamp: new Date(),
    });

    conversation.messages.push({
      role: 'assistant',
      content: answer,
      sources,
      timestamp: new Date(),
    });

    conversation.updatedAt = new Date();
    conversationStore.set(conversationId, conversation);
  }

  /**
   * Clear a conversation
   */
  clearConversation(conversationId: string): boolean {
    return conversationStore.delete(conversationId);
  }

  // ===========================================================================
  // Streaming RAG Pipeline
  // ===========================================================================

  /**
   * Ask a question about the wiki content (streaming version)
   *
   * Same as askWiki but yields tokens as they arrive.
   * Final yield contains the sources.
   */
  async *askWikiStream(
    question: string,
    workspaceId: number,
    options: AskWikiOptions = {}
  ): AsyncGenerator<{ type: 'token' | 'sources' | 'done'; data: string | RagSource[] }> {
    const {
      maxContextPages = DEFAULT_MAX_CONTEXT_PAGES,
      minRelevanceScore = DEFAULT_MIN_RELEVANCE_SCORE,
      maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS,
      conversationId,
      projectId,
      temperature = 0.7,
    } = options;

    const context: WikiContext = { workspaceId, projectId };

    // Check if reasoning provider is available
    const capabilities = await this.wikiAiService.getCapabilities(context);
    if (!capabilities.reasoning) {
      throw new Error('No reasoning provider configured for this workspace');
    }

    // Step 1: Retrieve relevant context
    const retrievedContext = await this.retrieveContext(question, workspaceId, {
      projectId,
      maxPages: maxContextPages,
      minScore: minRelevanceScore,
      maxTokens: maxContextTokens,
    });

    if (retrievedContext.length === 0) {
      yield {
        type: 'token',
        data: "Ik kon geen relevante informatie vinden in de wiki om je vraag te beantwoorden. Probeer je vraag anders te formuleren of controleer of er wiki pagina's over dit onderwerp bestaan.",
      };
      yield { type: 'sources', data: [] };
      yield { type: 'done', data: '' };
      return;
    }

    // Step 2: Format context for LLM
    const formattedContext = this.formatContext(retrievedContext);

    // Step 3: Build messages with conversation history
    const messages = this.buildMessages(question, formattedContext, conversationId);

    // Step 4: Stream the response
    let fullResponse = '';
    for await (const token of this.wikiAiService.stream(context, messages, {
      temperature,
      maxTokens: 2000,
    })) {
      fullResponse += token;
      yield { type: 'token', data: token };
    }

    // Step 5: Extract sources from response and context
    const sources = this.extractSources(fullResponse, retrievedContext);
    yield { type: 'sources', data: sources };

    // Step 6: Update conversation history
    if (conversationId) {
      this.updateConversation(conversationId, question, fullResponse, sources);
    }

    yield { type: 'done', data: '' };
  }

  /**
   * List conversations for a workspace
   */
  listConversations(workspaceId: number, projectId?: number): Conversation[] {
    const conversations: Conversation[] = [];
    for (const conv of conversationStore.values()) {
      if (conv.workspaceId === workspaceId) {
        if (projectId === undefined || conv.projectId === projectId) {
          conversations.push(conv);
        }
      }
    }
    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let ragServiceInstance: WikiRagService | null = null;

/**
 * Get or create the singleton WikiRagService
 */
export function getWikiRagService(prisma: PrismaClient): WikiRagService {
  if (!ragServiceInstance) {
    ragServiceInstance = new WikiRagService(prisma);
  }
  return ragServiceInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetWikiRagService(): void {
  ragServiceInstance = null;
}
