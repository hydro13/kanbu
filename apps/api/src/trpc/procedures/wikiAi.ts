/**
 * Wiki AI Procedures
 * Version: 1.3.0
 *
 * tRPC procedures for Wiki AI features.
 * Provides access to embeddings, entity extraction, text operations,
 * semantic search, RAG chat, and background indexing for Wiki pages
 * using configured AI providers.
 *
 * Fase: 15.1 - Provider Koppeling
 * Fase: 15.2 - Semantic Search
 * Fase: 15.3 - Ask the Wiki (RAG Chat)
 * Fase: 15.5 - Background Indexing
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 *
 * Modified: 2026-01-12
 * Change: Added reindexEmbeddings procedure for background indexing
 * =============================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import {
  getWikiAiService,
  getWikiRagService,
  getWikiEmbeddingService,
  WikiAiError,
  type WikiContext,
} from '../../lib/ai/wiki'
import { getGraphitiService } from '../../services/graphitiService'

// =============================================================================
// Input Schemas
// =============================================================================

const wikiContextSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
})

const embedSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  text: z.string().min(1).max(100000),
})

const embedBatchSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  texts: z.array(z.string().min(1).max(100000)).min(1).max(100),
})

const extractEntitiesSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  text: z.string().min(1).max(100000),
  entityTypes: z
    .array(z.string())
    .optional()
    .default(['WikiPage', 'Task', 'User', 'Project', 'Concept']),
})

const summarizeSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  text: z.string().min(1).max(100000),
  maxLength: z.number().min(50).max(10000).optional(),
})

const chatSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1),
    })
  ),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(128000).optional(),
    })
    .optional(),
})

// Semantic Search schemas (Fase 15.2)
const semanticSearchSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  query: z.string().min(1).max(1000),
  groupId: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  scoreThreshold: z.number().min(0).max(1).optional().default(0.5),
})

const similarPagesSchema = z.object({
  workspaceId: z.number(),
  pageId: z.number(),
  limit: z.number().min(1).max(20).optional().default(5),
})

// Ask the Wiki schemas (Fase 15.3)
const askWikiSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  question: z.string().min(1).max(2000),
  options: z
    .object({
      maxContextPages: z.number().min(1).max(20).optional(),
      minRelevanceScore: z.number().min(0).max(1).optional(),
      maxContextTokens: z.number().min(500).max(16000).optional(),
      conversationId: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
})

const createConversationSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
})

const conversationIdSchema = z.object({
  conversationId: z.string(),
})

const listConversationsSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
})

// Reindex embeddings schema (Fase 15.5)
const reindexEmbeddingsSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  groupId: z.string().optional(),
  forceReindex: z.boolean().optional().default(false),
})

// Fact Check schema (Fase 17.5)
const factCheckSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  /** The selected text to fact-check */
  selectedText: z.string().min(1).max(5000),
  /** Current page ID (to exclude from results) */
  currentPageId: z.number().optional(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Verify user has access to the workspace using the permission service
 */
async function verifyWorkspaceAccess(
  userId: number,
  workspaceId: number
): Promise<void> {
  await permissionService.requireWorkspaceAccess(userId, workspaceId, 'VIEWER')
}

/**
 * Handle WikiAiError and convert to TRPCError
 */
function handleWikiAiError(error: unknown): never {
  if (error instanceof WikiAiError) {
    const codeMap: Record<WikiAiError['code'], 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR'> = {
      NO_EMBEDDING_PROVIDER: 'NOT_FOUND',
      NO_REASONING_PROVIDER: 'NOT_FOUND',
      PROVIDER_ERROR: 'INTERNAL_SERVER_ERROR',
      INVALID_INPUT: 'BAD_REQUEST',
    }

    throw new TRPCError({
      code: codeMap[error.code],
      message: error.message,
    })
  }

  if (error instanceof TRPCError) {
    throw error
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  })
}

// =============================================================================
// Wiki AI Router
// =============================================================================

export const wikiAiRouter = router({
  /**
   * Get AI capabilities available for a workspace/project context
   */
  getCapabilities: protectedProcedure
    .input(wikiContextSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        return await service.getCapabilities(context)
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Test connection to AI providers for a workspace/project context
   */
  testConnection: protectedProcedure
    .input(wikiContextSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        return await service.testConnection(context)
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Get embedding for a single text
   */
  embed: protectedProcedure.input(embedSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user!.id

    // Verify access
    await verifyWorkspaceAccess(userId, input.workspaceId)

    const service = getWikiAiService(ctx.prisma)
    const context: WikiContext = {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    }

    try {
      const result = await service.embed(context, input.text)
      return {
        success: true,
        dimensions: result.dimensions,
        model: result.model,
        provider: result.provider,
        // Return first 10 values as sample to avoid huge response
        embeddingSample: result.embedding.slice(0, 10),
        embeddingLength: result.embedding.length,
      }
    } catch (error) {
      handleWikiAiError(error)
    }
  }),

  /**
   * Get embeddings for multiple texts (batched)
   */
  embedBatch: protectedProcedure
    .input(embedBatchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        const results = await service.embedBatch(context, input.texts)
        return {
          success: true,
          count: results.length,
          dimensions: results[0]?.dimensions ?? 0,
          model: results[0]?.model ?? 'unknown',
          provider: results[0]?.provider ?? 'unknown',
        }
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Extract entities from text using AI
   */
  extractEntities: protectedProcedure
    .input(extractEntitiesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        const result = await service.extractEntities(
          context,
          input.text,
          input.entityTypes
        )
        return {
          success: true,
          entities: result.entities,
          provider: result.provider,
          model: result.model,
          count: result.entities.length,
        }
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Summarize text using AI
   */
  summarize: protectedProcedure
    .input(summarizeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        const result = await service.summarize(
          context,
          input.text,
          input.maxLength
        )
        return {
          success: true,
          summary: result.summary,
          originalLength: result.originalLength,
          summaryLength: result.summaryLength,
          provider: result.provider,
        }
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Chat with AI (non-streaming)
   * For simple Q&A or single-turn conversations
   */
  chat: protectedProcedure.input(chatSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user!.id

    // Verify access
    await verifyWorkspaceAccess(userId, input.workspaceId)

    const service = getWikiAiService(ctx.prisma)
    const context: WikiContext = {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    }

    try {
      const response = await service.chat(context, input.messages, input.options)
      return {
        success: true,
        response,
        provider: (await service.getCapabilities(context)).reasoningProvider,
        model: (await service.getCapabilities(context)).reasoningModel,
      }
    } catch (error) {
      handleWikiAiError(error)
    }
  }),

  /**
   * Get embedding info for a context without generating embeddings
   */
  getEmbeddingInfo: protectedProcedure
    .input(wikiContextSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        return await service.getEmbeddingInfo(context)
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  // ===========================================================================
  // Semantic Search (Fase 15.2)
  // ===========================================================================

  /**
   * Search wiki pages by semantic similarity
   * Uses embeddings to find pages related to the query meaning
   */
  semanticSearch: protectedProcedure
    .input(semanticSearchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const graphitiService = getGraphitiService(ctx.prisma)

      try {
        const results = await graphitiService.semanticSearch(
          input.query,
          input.workspaceId,
          {
            projectId: input.projectId,
            groupId: input.groupId,
            limit: input.limit,
            scoreThreshold: input.scoreThreshold,
          }
        )

        return {
          success: true,
          results,
          count: results.length,
          query: input.query,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Semantic search failed',
        })
      }
    }),

  /**
   * Find wiki pages similar to a given page
   */
  findSimilarPages: protectedProcedure
    .input(similarPagesSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const graphitiService = getGraphitiService(ctx.prisma)

      try {
        const results = await graphitiService.findSimilarPages(
          input.pageId,
          input.workspaceId,
          input.limit
        )

        return {
          success: true,
          results,
          count: results.length,
          sourcePageId: input.pageId,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Find similar pages failed',
        })
      }
    }),

  /**
   * Get embedding statistics for the wiki
   */
  getEmbeddingStats: protectedProcedure
    .input(wikiContextSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const graphitiService = getGraphitiService(ctx.prisma)

      try {
        return await graphitiService.getEmbeddingStats()
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Get embedding stats failed',
        })
      }
    }),

  // ===========================================================================
  // Ask the Wiki - RAG Chat (Fase 15.3)
  // ===========================================================================

  /**
   * Ask a question about the wiki content
   *
   * Uses RAG (Retrieval-Augmented Generation) pipeline:
   * 1. Semantic search for relevant wiki pages
   * 2. Build context from retrieved pages
   * 3. Generate answer using LLM
   * 4. Extract and return sources
   *
   * Supports conversation history for follow-up questions.
   */
  askWiki: protectedProcedure
    .input(askWikiSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const ragService = getWikiRagService(ctx.prisma)

      try {
        const result = await ragService.askWiki(
          input.question,
          input.workspaceId,
          {
            projectId: input.projectId,
            ...input.options,
          }
        )

        return {
          success: true,
          answer: result.answer,
          sources: result.sources,
          contextCount: result.context.length,
          model: result.model,
          provider: result.provider,
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('No reasoning provider')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No AI provider configured for this workspace. Please configure an AI provider in settings.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Ask Wiki failed',
        })
      }
    }),

  /**
   * Create a new conversation for follow-up questions
   */
  createConversation: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const ragService = getWikiRagService(ctx.prisma)
      const conversation = ragService.createConversation(
        input.workspaceId,
        input.projectId
      )

      return {
        success: true,
        conversationId: conversation.id,
        createdAt: conversation.createdAt,
      }
    }),

  /**
   * Get conversation history
   */
  getConversation: protectedProcedure
    .input(conversationIdSchema)
    .query(async ({ ctx, input }) => {
      const ragService = getWikiRagService(ctx.prisma)
      const conversation = ragService.getConversation(input.conversationId)

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      // Verify user has access to the workspace
      const userId = ctx.user!.id
      await verifyWorkspaceAccess(userId, conversation.workspaceId)

      return {
        success: true,
        conversation: {
          id: conversation.id,
          workspaceId: conversation.workspaceId,
          projectId: conversation.projectId,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      }
    }),

  /**
   * Clear/delete a conversation
   */
  clearConversation: protectedProcedure
    .input(conversationIdSchema)
    .mutation(async ({ ctx, input }) => {
      const ragService = getWikiRagService(ctx.prisma)
      const conversation = ragService.getConversation(input.conversationId)

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      // Verify user has access to the workspace
      const userId = ctx.user!.id
      await verifyWorkspaceAccess(userId, conversation.workspaceId)

      const deleted = ragService.clearConversation(input.conversationId)

      return {
        success: deleted,
        conversationId: input.conversationId,
      }
    }),

  /**
   * List all conversations for a workspace/project
   */
  listConversations: protectedProcedure
    .input(listConversationsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const ragService = getWikiRagService(ctx.prisma)
      const conversations = ragService.listConversations(
        input.workspaceId,
        input.projectId
      )

      return {
        success: true,
        conversations: conversations.map(c => ({
          id: c.id,
          workspaceId: c.workspaceId,
          projectId: c.projectId,
          messageCount: c.messages.length,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          lastMessage: c.messages[c.messages.length - 1]?.content.substring(0, 100),
        })),
        count: conversations.length,
      }
    }),

  /**
   * Ask a question about the wiki content (streaming version)
   *
   * Returns an async iterator that yields:
   * - { type: 'token', data: string } for each token
   * - { type: 'sources', data: Source[] } with source citations
   * - { type: 'done', data: '' } when complete
   */
  askWikiStream: protectedProcedure
    .input(askWikiSchema)
    .mutation(async function* ({ ctx, input }) {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const ragService = getWikiRagService(ctx.prisma)

      try {
        for await (const chunk of ragService.askWikiStream(
          input.question,
          input.workspaceId,
          {
            projectId: input.projectId,
            ...input.options,
          }
        )) {
          yield chunk
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('No reasoning provider')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No AI provider configured for this workspace. Please configure an AI provider in settings.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Ask Wiki Stream failed',
        })
      }
    }),

  // ===========================================================================
  // Background Indexing (Fase 15.5)
  // ===========================================================================

  /**
   * Reindex wiki page embeddings
   *
   * Fetches all wiki pages and updates embeddings only for pages
   * where content has changed (using content hash comparison).
   * This is designed to be called during idle time for background indexing.
   *
   * Returns statistics on stored vs skipped pages.
   */
  reindexEmbeddings: protectedProcedure
    .input(reindexEmbeddingsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const embeddingService = getWikiEmbeddingService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      const stats = {
        totalPages: 0,
        stored: 0,
        skipped: 0,
        errors: 0,
      }

      try {
        // Fetch all wiki pages for the workspace/project
        const pages = input.projectId
          ? await ctx.prisma.wikiPage.findMany({
              where: {
                projectId: input.projectId,
                ...(input.groupId ? { graphitiGroupId: input.groupId } : {}),
              },
              select: {
                id: true,
                title: true,
                content: true,
                graphitiGroupId: true,
              },
            })
          : await ctx.prisma.workspaceWikiPage.findMany({
              where: {
                workspaceId: input.workspaceId,
                ...(input.groupId ? { graphitiGroupId: input.groupId } : {}),
              },
              select: {
                id: true,
                title: true,
                content: true,
                graphitiGroupId: true,
              },
            })

        stats.totalPages = pages.length

        // Process each page
        for (const page of pages) {
          try {
            // Use workspace-based groupId if no graphiti groupId set
            const groupId = page.graphitiGroupId ?? `workspace-${input.workspaceId}`

            if (input.forceReindex) {
              // Force reindex - always store
              const success = await embeddingService.storePageEmbedding(
                context,
                page.id,
                page.title,
                page.content,
                groupId
              )
              if (success) {
                stats.stored++
              } else {
                stats.errors++
              }
            } else {
              // Conditional reindex - only if content changed
              const result = await embeddingService.storePageEmbeddingIfChanged(
                context,
                page.id,
                page.title,
                page.content,
                groupId
              )

              switch (result) {
                case 'stored':
                  stats.stored++
                  break
                case 'skipped':
                  stats.skipped++
                  break
                case 'error':
                  stats.errors++
                  break
              }
            }
          } catch (pageError) {
            console.error(
              `[wikiAi.reindexEmbeddings] Error processing page ${page.id}:`,
              pageError instanceof Error ? pageError.message : pageError
            )
            stats.errors++
          }
        }

        console.log(
          `[wikiAi.reindexEmbeddings] Completed for workspace ${input.workspaceId}` +
          (input.projectId ? ` project ${input.projectId}` : '') +
          `: ${stats.stored} stored, ${stats.skipped} skipped, ${stats.errors} errors`
        )

        return {
          success: true,
          stats,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Reindex embeddings failed',
        })
      }
    }),

  // ===========================================================================
  // Fact Check (Fase 17.5)
  // ===========================================================================

  /**
   * User-triggered fact check
   *
   * Takes selected text and searches for related facts across the wiki.
   * Returns existing facts from other pages that mention the same entities.
   *
   * Flow:
   * 1. Extract entities from selected text using LLM
   * 2. For each entity, search knowledge graph for existing facts
   * 3. Return all found facts with source page info
   */
  factCheck: protectedProcedure
    .input(factCheckSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const wikiAiService = getWikiAiService(ctx.prisma)
      const graphitiService = getGraphitiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        // Step 1: Extract entities from selected text
        const extractionResult = await wikiAiService.extractEntities(
          context,
          input.selectedText,
          ['WikiPage', 'Task', 'User', 'Project', 'Concept', 'Person']
        )

        if (extractionResult.entities.length === 0) {
          return {
            success: true,
            selectedText: input.selectedText,
            entities: [],
            relatedFacts: [],
            message: 'No entities found in selected text',
          }
        }

        // Step 2: For each entity, search for existing facts from other pages
        interface RelatedFact {
          entityName: string
          entityType: string
          fact: string
          pageId: number
          pageTitle: string
          pageSlug?: string
          validAt: string | null
          invalidAt: string | null
        }

        const relatedFacts: RelatedFact[] = []
        const processedEntities = new Set<string>()

        for (const entity of extractionResult.entities) {
          // Skip duplicates
          const entityKey = `${entity.type}:${entity.name.toLowerCase()}`
          if (processedEntities.has(entityKey)) continue
          processedEntities.add(entityKey)

          // Map entity type to graph label
          const graphType = entity.type === 'User' ? 'Person' : entity.type

          try {
            // Use the public getFactsForEntity method
            const facts = await graphitiService.getFactsForEntity(
              entity.name,
              graphType,
              input.currentPageId
            )

            for (const factData of facts) {
              relatedFacts.push({
                entityName: entity.name,
                entityType: entity.type,
                fact: factData.fact,
                pageId: factData.pageId,
                pageTitle: factData.pageTitle,
                pageSlug: factData.pageSlug,
                validAt: factData.validAt,
                invalidAt: factData.invalidAt,
              })
            }
          } catch (queryError) {
            console.warn(
              `[wikiAi.factCheck] Query failed for entity "${entity.name}":`,
              queryError instanceof Error ? queryError.message : queryError
            )
          }
        }

        return {
          success: true,
          selectedText: input.selectedText,
          entities: extractionResult.entities.map(e => ({
            name: e.name,
            type: e.type,
            confidence: e.confidence,
          })),
          relatedFacts,
          message: relatedFacts.length > 0
            ? `Found ${relatedFacts.length} related fact(s) from other pages`
            : 'No related facts found in other wiki pages',
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Fact check failed',
        })
      }
    }),
})
