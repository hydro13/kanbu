/**
 * Wiki Chunking Service
 * Version: 1.0.0
 *
 * Density-aware text chunking for Wiki content.
 * Based on Graphiti's chunking strategy adapted for Markdown.
 *
 * Features:
 * - Markdown-aware splitting (respects headers, code blocks, lists)
 * - Configurable chunk size and overlap
 * - Token estimation for LLM context management
 * - Hierarchical fallback: headers -> paragraphs -> sentences -> fixed
 *
 * Fase 25.1 - Text Chunking
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default chunking configuration
 * Can be overridden via environment variables or constructor options
 */
export const CHUNK_CONFIG = {
  /** Target chunk size in tokens (default: 3000) */
  CHUNK_TOKEN_SIZE: parseInt(process.env.CHUNK_TOKEN_SIZE ?? '3000', 10),
  /** Overlap between chunks in tokens (default: 200) */
  CHUNK_OVERLAP_TOKENS: parseInt(process.env.CHUNK_OVERLAP_TOKENS ?? '200', 10),
  /** Minimum tokens before considering chunking (default: 1000) */
  CHUNK_MIN_TOKENS: parseInt(process.env.CHUNK_MIN_TOKENS ?? '1000', 10),
  /** Approximate characters per token for estimation (default: 4) */
  CHARS_PER_TOKEN: 4,
  /** Maximum parallel LLM calls for chunk processing */
  MAX_PARALLEL_CHUNKS: 5,
} as const;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the ChunkingService
 */
export interface ChunkingConfig {
  /** Target chunk size in tokens (default: 3000) */
  chunkTokenSize?: number;
  /** Overlap between chunks in tokens (default: 200) */
  chunkOverlapTokens?: number;
  /** Minimum tokens before splitting (default: 1000) */
  chunkMinTokens?: number;
  /** Characters per token estimate (default: 4) */
  charsPerToken?: number;
}

/**
 * A single chunk of content
 */
export interface ContentChunk {
  /** Chunk index (0-based) */
  index: number;
  /** Chunk text content */
  text: string;
  /** Estimated token count */
  tokenCount: number;
  /** Start position in original text */
  startOffset: number;
  /** End position in original text */
  endOffset: number;
  /** Markdown context (header hierarchy, etc.) */
  context?: ChunkContext;
}

/**
 * Context information for a chunk
 */
export interface ChunkContext {
  /** Current section header (if any) */
  sectionHeader?: string;
  /** Parent headers hierarchy */
  headerPath?: string[];
  /** Is inside code block */
  inCodeBlock?: boolean;
}

/**
 * Result of chunking operation
 */
export interface ChunkingResult {
  /** Original text */
  originalText: string;
  /** Total estimated tokens in original */
  totalTokens: number;
  /** Generated chunks */
  chunks: ContentChunk[];
  /** Was content actually chunked or passed through */
  wasChunked: boolean;
  /** Chunking strategy used */
  strategy: 'passthrough' | 'markdown' | 'paragraph' | 'sentence' | 'fixed';
}

/**
 * Parsed Markdown section
 */
interface MarkdownSection {
  /** Header text (e.g., "## Introduction") */
  header: string;
  /** Header level (1-6) */
  level: number;
  /** Section content (excluding header) */
  content: string;
  /** Full section (header + content) */
  fullText: string;
  /** Start offset in original text */
  startOffset: number;
}

// =============================================================================
// ChunkingService Class
// =============================================================================

/**
 * Service for intelligent text chunking
 *
 * Implements density-aware chunking based on Graphiti's strategy,
 * adapted for Markdown wiki content.
 */
export class ChunkingService {
  private readonly config: Required<ChunkingConfig>;

  constructor(config?: ChunkingConfig) {
    this.config = {
      chunkTokenSize: config?.chunkTokenSize ?? CHUNK_CONFIG.CHUNK_TOKEN_SIZE,
      chunkOverlapTokens: config?.chunkOverlapTokens ?? CHUNK_CONFIG.CHUNK_OVERLAP_TOKENS,
      chunkMinTokens: config?.chunkMinTokens ?? CHUNK_CONFIG.CHUNK_MIN_TOKENS,
      charsPerToken: config?.charsPerToken ?? CHUNK_CONFIG.CHARS_PER_TOKEN,
    };
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Check if content needs chunking based on token count
   */
  needsChunking(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }
    return this.estimateTokens(text) >= this.config.chunkMinTokens;
  }

  /**
   * Estimate token count for text
   * Uses simple character-based estimation (accurate within ~20%)
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.config.charsPerToken);
  }

  /**
   * Chunk text content if needed (density-aware)
   * Returns passthrough if content is small enough
   */
  chunk(text: string): ChunkingResult {
    if (!text || text.trim().length === 0) {
      return this.createPassthroughResult(text);
    }

    const totalTokens = this.estimateTokens(text);

    // Small content - no chunking needed
    if (totalTokens < this.config.chunkMinTokens) {
      return this.createPassthroughResult(text);
    }

    // Try Markdown-aware chunking first
    return this.chunkMarkdown(text);
  }

  /**
   * Chunk Markdown content with structure awareness
   * Respects headers, code blocks, and lists
   */
  chunkMarkdown(text: string): ChunkingResult {
    const totalTokens = this.estimateTokens(text);

    // Small content - passthrough
    if (totalTokens < this.config.chunkMinTokens) {
      return this.createPassthroughResult(text);
    }

    // Try section-based chunking (by headers)
    const sections = this.parseMarkdownSections(text);
    if (sections.length > 1) {
      const sectionResult = this.chunkBySections(sections, text);
      if (sectionResult.chunks.length > 0) {
        return sectionResult;
      }
    }

    // Fall back to paragraph chunking
    const paragraphResult = this.chunkByParagraphs(text);
    if (paragraphResult.chunks.length > 1) {
      return paragraphResult;
    }

    // Fall back to sentence chunking
    const sentenceResult = this.chunkBySentences(text);
    if (sentenceResult.chunks.length > 1) {
      return sentenceResult;
    }

    // Last resort: fixed-size chunking
    return this.chunkByFixedSize(text);
  }

  // ===========================================================================
  // Chunking Strategies
  // ===========================================================================

  /**
   * Chunk by Markdown sections (headers)
   */
  private chunkBySections(sections: MarkdownSection[], originalText: string): ChunkingResult {
    const chunks: ContentChunk[] = [];
    let currentText = '';
    let currentTokens = 0;
    let currentStartOffset = 0;
    const maxTokens = this.config.chunkTokenSize;
    const overlapTokens = this.config.chunkOverlapTokens;

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section.fullText);

      // If section alone is too big, we need deeper chunking
      if (sectionTokens > maxTokens && currentText === '') {
        // Try to chunk this large section by paragraphs
        const subResult = this.chunkByParagraphs(section.fullText);
        for (const subChunk of subResult.chunks) {
          chunks.push({
            ...subChunk,
            index: chunks.length,
            startOffset: section.startOffset + subChunk.startOffset,
            endOffset: section.startOffset + subChunk.endOffset,
            context: {
              sectionHeader: section.header,
              headerPath: [section.header],
            },
          });
        }
        continue;
      }

      // Would adding this section exceed chunk size?
      if (currentTokens + sectionTokens > maxTokens && currentText !== '') {
        // Save current chunk
        chunks.push(
          this.createChunk(
            currentText,
            chunks.length,
            currentStartOffset,
            currentStartOffset + currentText.length
          )
        );

        // Start new chunk with overlap from previous
        const overlap = this.getOverlapText(currentText, overlapTokens);
        currentText = overlap + section.fullText;
        currentTokens = this.estimateTokens(currentText);
        currentStartOffset = section.startOffset - overlap.length;
      } else {
        // Add section to current chunk
        if (currentText === '') {
          currentStartOffset = section.startOffset;
        }
        currentText += (currentText ? '\n\n' : '') + section.fullText;
        currentTokens += sectionTokens;
      }
    }

    // Don't forget the last chunk
    if (currentText.trim()) {
      chunks.push(
        this.createChunk(
          currentText,
          chunks.length,
          currentStartOffset,
          currentStartOffset + currentText.length
        )
      );
    }

    return {
      originalText,
      totalTokens: this.estimateTokens(originalText),
      chunks,
      wasChunked: chunks.length > 1,
      strategy: 'markdown',
    };
  }

  /**
   * Chunk by paragraphs (double newlines)
   */
  private chunkByParagraphs(text: string): ChunkingResult {
    // First, protect code blocks by replacing them with placeholders
    const { text: protectedText, codeBlocks } = this.protectCodeBlocks(text);

    // Split on double newlines
    const paragraphs = protectedText.split(/\n\s*\n/);
    const chunks: ContentChunk[] = [];
    let currentText = '';
    let currentTokens = 0;
    let currentStartOffset = 0;
    let textOffset = 0;
    const maxTokens = this.config.chunkTokenSize;
    const overlapTokens = this.config.chunkOverlapTokens;

    for (let i = 0; i < paragraphs.length; i++) {
      const rawParagraph = paragraphs[i];
      if (rawParagraph === undefined) continue;

      // Restore code blocks in this paragraph
      const paragraph = this.restoreCodeBlocks(rawParagraph, codeBlocks);

      const paragraphTokens = this.estimateTokens(paragraph);

      // If single paragraph is too big, chunk by sentences
      if (paragraphTokens > maxTokens && currentText === '') {
        const subResult = this.chunkBySentences(paragraph);
        for (const subChunk of subResult.chunks) {
          chunks.push({
            ...subChunk,
            index: chunks.length,
            startOffset: textOffset + subChunk.startOffset,
            endOffset: textOffset + subChunk.endOffset,
          });
        }
        textOffset += paragraph.length + 2; // +2 for \n\n
        continue;
      }

      // Would adding this paragraph exceed chunk size?
      if (currentTokens + paragraphTokens > maxTokens && currentText !== '') {
        // Save current chunk
        chunks.push(
          this.createChunk(
            currentText,
            chunks.length,
            currentStartOffset,
            currentStartOffset + currentText.length
          )
        );

        // Start new chunk with overlap
        const overlap = this.getOverlapText(currentText, overlapTokens);
        currentText = overlap + paragraph;
        currentTokens = this.estimateTokens(currentText);
        currentStartOffset = textOffset - overlap.length;
      } else {
        // Add paragraph to current chunk
        if (currentText === '') {
          currentStartOffset = textOffset;
        }
        currentText += (currentText ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }

      textOffset += paragraph.length + 2; // +2 for \n\n separator
    }

    // Don't forget the last chunk
    if (currentText.trim()) {
      chunks.push(
        this.createChunk(
          currentText,
          chunks.length,
          currentStartOffset,
          currentStartOffset + currentText.length
        )
      );
    }

    return {
      originalText: text,
      totalTokens: this.estimateTokens(text),
      chunks,
      wasChunked: chunks.length > 1,
      strategy: 'paragraph',
    };
  }

  /**
   * Chunk by sentences
   */
  private chunkBySentences(text: string): ChunkingResult {
    // Split on sentence boundaries (. ! ? followed by space or end)
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: ContentChunk[] = [];
    let currentText = '';
    let currentTokens = 0;
    let currentStartOffset = 0;
    let textOffset = 0;
    const maxTokens = this.config.chunkTokenSize;
    const overlapTokens = this.config.chunkOverlapTokens;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      // If single sentence is too big, use fixed-size chunking
      if (sentenceTokens > maxTokens && currentText === '') {
        const subResult = this.chunkByFixedSize(sentence);
        for (const subChunk of subResult.chunks) {
          chunks.push({
            ...subChunk,
            index: chunks.length,
            startOffset: textOffset + subChunk.startOffset,
            endOffset: textOffset + subChunk.endOffset,
          });
        }
        textOffset += sentence.length + 1;
        continue;
      }

      // Would adding this sentence exceed chunk size?
      if (currentTokens + sentenceTokens > maxTokens && currentText !== '') {
        // Save current chunk
        chunks.push(
          this.createChunk(
            currentText,
            chunks.length,
            currentStartOffset,
            currentStartOffset + currentText.length
          )
        );

        // Start new chunk with overlap
        const overlap = this.getOverlapText(currentText, overlapTokens);
        currentText = overlap + sentence;
        currentTokens = this.estimateTokens(currentText);
        currentStartOffset = textOffset - overlap.length;
      } else {
        // Add sentence to current chunk
        if (currentText === '') {
          currentStartOffset = textOffset;
        }
        currentText += (currentText ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }

      textOffset += sentence.length + 1; // +1 for space
    }

    // Don't forget the last chunk
    if (currentText.trim()) {
      chunks.push(
        this.createChunk(
          currentText,
          chunks.length,
          currentStartOffset,
          currentStartOffset + currentText.length
        )
      );
    }

    return {
      originalText: text,
      totalTokens: this.estimateTokens(text),
      chunks,
      wasChunked: chunks.length > 1,
      strategy: 'sentence',
    };
  }

  /**
   * Fixed-size chunking with word boundaries (last resort)
   */
  private chunkByFixedSize(text: string): ChunkingResult {
    const chunks: ContentChunk[] = [];
    const maxChars = this.config.chunkTokenSize * this.config.charsPerToken;
    const overlapChars = this.config.chunkOverlapTokens * this.config.charsPerToken;
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length);

      // Try to break at word boundary
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + maxChars / 2) {
          end = lastSpace;
        }
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText) {
        chunks.push(this.createChunk(chunkText, chunks.length, start, end));
      }

      // Move forward, accounting for overlap
      const minProgress = Math.max(1, maxChars - overlapChars);
      start = Math.max(start + minProgress, end - overlapChars);
    }

    return {
      originalText: text,
      totalTokens: this.estimateTokens(text),
      chunks,
      wasChunked: chunks.length > 1,
      strategy: 'fixed',
    };
  }

  // ===========================================================================
  // Markdown Parsing
  // ===========================================================================

  /**
   * Parse Markdown into sections based on headers
   */
  private parseMarkdownSections(text: string): MarkdownSection[] {
    const sections: MarkdownSection[] = [];

    // Regex to match Markdown headers (# to ######)
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches: Array<{ index: number; level: number; header: string }> = [];

    let match;
    while ((match = headerRegex.exec(text)) !== null) {
      const headerMarker = match[1];
      const headerText = match[0];
      if (headerMarker && headerText) {
        matches.push({
          index: match.index,
          level: headerMarker.length,
          header: headerText,
        });
      }
    }

    // If no headers, return single section with all content
    if (matches.length === 0) {
      return [
        {
          header: '',
          level: 0,
          content: text,
          fullText: text,
          startOffset: 0,
        },
      ];
    }

    // Build sections from header positions
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      if (!current) continue;

      const next = matches[i + 1];
      const endIndex = next ? next.index : text.length;
      const content = text.slice(current.index, endIndex);

      sections.push({
        header: current.header,
        level: current.level,
        content: content.slice(current.header.length).trim(),
        fullText: content.trim(),
        startOffset: current.index,
      });
    }

    // Handle content before first header
    const firstMatch = matches[0];
    if (firstMatch && firstMatch.index > 0) {
      const preContent = text.slice(0, firstMatch.index).trim();
      if (preContent) {
        sections.unshift({
          header: '',
          level: 0,
          content: preContent,
          fullText: preContent,
          startOffset: 0,
        });
      }
    }

    return sections;
  }

  // ===========================================================================
  // Code Block Handling
  // ===========================================================================

  /**
   * Replace code blocks with placeholders to prevent splitting
   */
  private protectCodeBlocks(text: string): { text: string; codeBlocks: Map<string, string> } {
    const codeBlocks = new Map<string, string>();
    let counter = 0;

    // Match fenced code blocks (``` or ~~~)
    const protectedText = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (match) => {
      const placeholder = `__CODE_BLOCK_${counter++}__`;
      codeBlocks.set(placeholder, match);
      return placeholder;
    });

    return { text: protectedText, codeBlocks };
  }

  /**
   * Restore code blocks from placeholders
   */
  private restoreCodeBlocks(text: string, codeBlocks: Map<string, string>): string {
    let result = text;
    for (const [placeholder, code] of codeBlocks) {
      result = result.replace(placeholder, code);
    }
    return result;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Create a ContentChunk object
   */
  private createChunk(
    text: string,
    index: number,
    startOffset: number,
    endOffset: number,
    context?: ChunkContext
  ): ContentChunk {
    return {
      index,
      text: text.trim(),
      tokenCount: this.estimateTokens(text),
      startOffset,
      endOffset,
      context,
    };
  }

  /**
   * Get overlap text from end of previous chunk
   */
  private getOverlapText(text: string, overlapTokens: number): string {
    const overlapChars = overlapTokens * this.config.charsPerToken;

    if (text.length <= overlapChars) {
      return text;
    }

    const overlapStart = text.length - overlapChars;
    // Find next word boundary after overlap start
    const spaceIndex = text.indexOf(' ', overlapStart);

    if (spaceIndex !== -1 && spaceIndex < text.length - 1) {
      return text.slice(spaceIndex + 1);
    }

    return text.slice(overlapStart);
  }

  /**
   * Create passthrough result (no chunking needed)
   */
  private createPassthroughResult(text: string): ChunkingResult {
    const totalTokens = this.estimateTokens(text);

    return {
      originalText: text,
      totalTokens,
      chunks: text.trim()
        ? [
            {
              index: 0,
              text: text.trim(),
              tokenCount: totalTokens,
              startOffset: 0,
              endOffset: text.length,
            },
          ]
        : [],
      wasChunked: false,
      strategy: 'passthrough',
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let chunkingServiceInstance: ChunkingService | null = null;

/**
 * Get singleton ChunkingService instance
 */
export function getChunkingService(config?: ChunkingConfig): ChunkingService {
  if (!chunkingServiceInstance) {
    chunkingServiceInstance = new ChunkingService(config);
  }
  return chunkingServiceInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetChunkingService(): void {
  chunkingServiceInstance = null;
}
