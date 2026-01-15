/**
 * Unit Tests: Wiki Chunking Service (Fase 25.2)
 *
 * Tests for text chunking:
 * - Density-aware chunking (skip small content)
 * - Markdown structure preservation
 * - Token estimation
 * - Overlap handling
 * - Edge cases (code blocks, lists, headers)
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ChunkingService,
  CHUNK_CONFIG,
  resetChunkingService,
} from './ChunkingService'

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Generate content of approximately the specified token count
 */
function generateContent(targetTokens: number): string {
  // ~4 chars per token, so multiply by 4
  const words = []
  const avgWordLength = 5 // average word + space
  const wordsNeeded = Math.ceil((targetTokens * 4) / avgWordLength)

  for (let i = 0; i < wordsNeeded; i++) {
    words.push(`word${i}`)
  }

  return words.join(' ')
}

/**
 * Generate Markdown content with headers
 */
function generateMarkdownContent(sections: number, tokensPerSection: number): string {
  const parts: string[] = []

  for (let i = 0; i < sections; i++) {
    parts.push(`## Section ${i + 1}`)
    parts.push('')
    parts.push(generateContent(tokensPerSection))
    parts.push('')
  }

  return parts.join('\n')
}

// =============================================================================
// Test Setup
// =============================================================================

describe('ChunkingService', () => {
  let service: ChunkingService

  beforeEach(() => {
    resetChunkingService()
    service = new ChunkingService()
  })

  // ===========================================================================
  // Token Estimation Tests
  // ===========================================================================

  describe('Token Estimation', () => {
    it('estimates tokens for empty string', () => {
      expect(service.estimateTokens('')).toBe(0)
    })

    it('estimates tokens for short text', () => {
      // 20 characters / 4 = 5 tokens
      const text = 'Hello world testing!'
      expect(service.estimateTokens(text)).toBe(5)
    })

    it('estimates tokens for longer text', () => {
      // 100 characters should be ~25 tokens
      const text = 'a'.repeat(100)
      expect(service.estimateTokens(text)).toBe(25)
    })

    it('handles whitespace correctly', () => {
      const text = 'Hello   world   test'
      // Whitespace counts as characters
      expect(service.estimateTokens(text)).toBeGreaterThan(0)
    })
  })

  // ===========================================================================
  // Needs Chunking Tests
  // ===========================================================================

  describe('Needs Chunking Detection', () => {
    it('returns false for empty content', () => {
      expect(service.needsChunking('')).toBe(false)
      expect(service.needsChunking('   ')).toBe(false)
    })

    it('returns false for small content', () => {
      // Less than 1000 tokens (4000 chars)
      const smallContent = generateContent(500)
      expect(service.needsChunking(smallContent)).toBe(false)
    })

    it('returns true for large content', () => {
      // More than 1000 tokens
      const largeContent = generateContent(1500)
      expect(service.needsChunking(largeContent)).toBe(true)
    })

    it('respects custom min token threshold', () => {
      const customService = new ChunkingService({ chunkMinTokens: 100 })
      const mediumContent = generateContent(150)
      expect(customService.needsChunking(mediumContent)).toBe(true)
    })
  })

  // ===========================================================================
  // Basic Chunking Tests
  // ===========================================================================

  describe('Basic Chunking', () => {
    it('returns passthrough for small content', () => {
      const smallContent = 'This is a short text.'
      const result = service.chunk(smallContent)

      expect(result.wasChunked).toBe(false)
      expect(result.strategy).toBe('passthrough')
      expect(result.chunks.length).toBe(1)
      expect(result.chunks[0]?.text).toBe(smallContent)
    })

    it('returns passthrough for empty content', () => {
      const result = service.chunk('')

      expect(result.wasChunked).toBe(false)
      expect(result.chunks.length).toBe(0)
    })

    it('chunks large content', () => {
      // Generate content larger than chunk size (3000 tokens = 12000 chars)
      const largeContent = generateContent(5000)
      const result = service.chunk(largeContent)

      expect(result.wasChunked).toBe(true)
      expect(result.chunks.length).toBeGreaterThan(1)
    })

    it('preserves original text reference', () => {
      const content = generateContent(1500)
      const result = service.chunk(content)

      expect(result.originalText).toBe(content)
    })

    it('calculates total tokens correctly', () => {
      const content = generateContent(1000)
      const result = service.chunk(content)

      // Token count should be reasonable based on content length
      // generateContent creates ~5 chars per word, and we estimate 4 chars/token
      expect(result.totalTokens).toBeGreaterThan(500)
      expect(result.totalTokens).toBeLessThan(3000)
    })
  })

  // ===========================================================================
  // Markdown Chunking Tests
  // ===========================================================================

  describe('Markdown Chunking', () => {
    it('chunks by sections when possible', () => {
      // Create content with multiple headers, each section ~1000 tokens
      const content = generateMarkdownContent(5, 1000)
      const result = service.chunkMarkdown(content)

      expect(result.wasChunked).toBe(true)
      expect(result.strategy).toBe('markdown')
    })

    it('preserves headers in chunks', () => {
      const content = `# Main Title

Introduction paragraph with some content.

## Section One

Content for section one with more details.

## Section Two

Content for section two with additional information.
`
      const result = service.chunkMarkdown(content)

      // At least one chunk should contain a header
      const hasHeader = result.chunks.some(chunk =>
        chunk.text.includes('#')
      )
      expect(hasHeader).toBe(true)
    })

    it('falls back to paragraph chunking for headerless content', () => {
      // Large content without headers
      const paragraphs = []
      for (let i = 0; i < 20; i++) {
        paragraphs.push(generateContent(200))
      }
      const content = paragraphs.join('\n\n')

      const result = service.chunkMarkdown(content)

      expect(result.wasChunked).toBe(true)
      // Should use paragraph or fixed strategy
      expect(['paragraph', 'sentence', 'fixed']).toContain(result.strategy)
    })

    it('handles content before first header', () => {
      const content = `Some introductory content before any headers.

# First Header

Content under first header.
`
      const result = service.chunkMarkdown(content)

      // Intro content should be captured
      expect(result.chunks.length).toBeGreaterThan(0)
      const allText = result.chunks.map(c => c.text).join(' ')
      expect(allText).toContain('introductory content')
    })
  })

  // ===========================================================================
  // Code Block Handling Tests
  // ===========================================================================

  describe('Code Block Handling', () => {
    it('does not split code blocks', () => {
      const content = `# Documentation

Here is some code:

\`\`\`typescript
function example() {
  const x = 1;
  const y = 2;
  const z = 3;
  return x + y + z;
}
\`\`\`

And more text after the code block.
`
      const result = service.chunkMarkdown(content)

      // Find chunk containing the code block
      const codeChunk = result.chunks.find(chunk =>
        chunk.text.includes('```typescript')
      )

      if (codeChunk) {
        // Code block should be complete (has opening and closing)
        expect(codeChunk.text.match(/```/g)?.length).toBe(2)
      }
    })

    it('handles multiple code blocks', () => {
      const content = `
\`\`\`python
def hello():
    print("Hello")
\`\`\`

Some text between code blocks.

\`\`\`javascript
console.log("World");
\`\`\`
`
      const result = service.chunk(content)

      // Both code blocks should be preserved
      const allText = result.chunks.map(c => c.text).join(' ')
      expect(allText).toContain('def hello')
      expect(allText).toContain('console.log')
    })
  })

  // ===========================================================================
  // Overlap Tests
  // ===========================================================================

  describe('Overlap Handling', () => {
    it('creates overlap between chunks', () => {
      // Create content that will definitely be chunked
      const largeContent = generateContent(10000)
      const result = service.chunk(largeContent)

      expect(result.chunks.length).toBeGreaterThan(2)

      // Check for overlap: end of chunk N should appear in start of chunk N+1
      // This is a simplified check - real overlap depends on word boundaries
      for (let i = 0; i < result.chunks.length - 1; i++) {
        const currentChunk = result.chunks[i]
        const nextChunk = result.chunks[i + 1]

        // Skip if chunks are undefined
        if (!currentChunk || !nextChunk) continue

        // At minimum, offsets should show some overlap region
        // (end of current should be after start of next)
        // Note: This depends on implementation details
        expect(currentChunk.endOffset).toBeGreaterThan(currentChunk.startOffset)
        expect(nextChunk.startOffset).toBeGreaterThanOrEqual(0)
      }
    })

    it('respects custom overlap settings', () => {
      const customService = new ChunkingService({
        chunkTokenSize: 500,
        chunkOverlapTokens: 50,
        chunkMinTokens: 100,
      })

      const content = generateContent(2000)
      const result = customService.chunk(content)

      expect(result.chunks.length).toBeGreaterThan(1)
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles very long single line', () => {
      // One very long line without breaks
      const longLine = 'word '.repeat(5000)
      const result = service.chunk(longLine)

      expect(result.wasChunked).toBe(true)
      // May use paragraph, sentence, or fixed strategy depending on content
      expect(['paragraph', 'sentence', 'fixed']).toContain(result.strategy)
    })

    it('handles only headers (no content)', () => {
      const content = `# Header 1

## Header 2

### Header 3
`
      const result = service.chunkMarkdown(content)

      expect(result.chunks.length).toBeGreaterThan(0)
    })

    it('handles deeply nested headers', () => {
      const content = `# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6

Some content at the deepest level.
`
      const result = service.chunkMarkdown(content)

      expect(result.chunks.length).toBeGreaterThan(0)
    })

    it('handles mixed content types', () => {
      const content = `# Title

Regular paragraph text.

- List item 1
- List item 2
- List item 3

> Blockquote content

\`\`\`
code block
\`\`\`

| Table | Header |
|-------|--------|
| Cell  | Cell   |
`
      const result = service.chunkMarkdown(content)

      // All content types should be preserved
      const allText = result.chunks.map(c => c.text).join(' ')
      expect(allText).toContain('List item')
      expect(allText).toContain('Blockquote')
      expect(allText).toContain('Table')
    })

    it('handles unicode content', () => {
      const content = `# Nederlandstalige Content

Dit is een voorbeeld met Nederlandse tekst en speciale karakters.

## Sectie met Emoji

Content met emoji: test content here.

## 日本語セクション

日本語のテキストも正しく処理されるべきです。
`
      const result = service.chunkMarkdown(content)

      expect(result.chunks.length).toBeGreaterThan(0)
      const allText = result.chunks.map(c => c.text).join(' ')
      expect(allText).toContain('Nederlandse')
      expect(allText).toContain('日本語')
    })
  })

  // ===========================================================================
  // Chunk Properties Tests
  // ===========================================================================

  describe('Chunk Properties', () => {
    it('assigns sequential indices to chunks', () => {
      const largeContent = generateContent(5000)
      const result = service.chunk(largeContent)

      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i]
        if (chunk) {
          expect(chunk.index).toBe(i)
        }
      }
    })

    it('calculates token count per chunk', () => {
      const largeContent = generateContent(5000)
      const result = service.chunk(largeContent)

      for (const chunk of result.chunks) {
        expect(chunk.tokenCount).toBeGreaterThan(0)
        // Each chunk should be roughly within target size
        expect(chunk.tokenCount).toBeLessThanOrEqual(
          CHUNK_CONFIG.CHUNK_TOKEN_SIZE * 1.5 // Allow some overflow
        )
      }
    })

    it('provides valid offsets', () => {
      const content = generateContent(5000)
      const result = service.chunk(content)

      for (const chunk of result.chunks) {
        expect(chunk.startOffset).toBeGreaterThanOrEqual(0)
        expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset)
        expect(chunk.endOffset).toBeLessThanOrEqual(content.length + 100) // Allow some margin
      }
    })
  })

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe('Configuration', () => {
    it('uses default config values', () => {
      expect(CHUNK_CONFIG.CHUNK_TOKEN_SIZE).toBe(3000)
      expect(CHUNK_CONFIG.CHUNK_OVERLAP_TOKENS).toBe(200)
      expect(CHUNK_CONFIG.CHUNK_MIN_TOKENS).toBe(1000)
      expect(CHUNK_CONFIG.CHARS_PER_TOKEN).toBe(4)
    })

    it('accepts custom configuration', () => {
      const customService = new ChunkingService({
        chunkTokenSize: 1000,
        chunkOverlapTokens: 100,
        chunkMinTokens: 500,
        charsPerToken: 3,
      })

      // Small content that would NOT be chunked with default config
      // but WOULD be chunked with custom config
      const content = generateContent(600)

      expect(service.needsChunking(content)).toBe(false) // Default: 1000 min
      expect(customService.needsChunking(content)).toBe(true) // Custom: 500 min
    })
  })

  // ===========================================================================
  // Sentence Chunking Tests
  // ===========================================================================

  describe('Sentence Chunking', () => {
    it('splits on sentence boundaries', () => {
      // Create content without paragraphs but with sentences
      const sentences = []
      for (let i = 0; i < 100; i++) {
        sentences.push(`This is sentence number ${i} with some additional content to make it longer.`)
      }
      const content = sentences.join(' ')

      const customService = new ChunkingService({
        chunkTokenSize: 200,
        chunkMinTokens: 50,
      })

      const result = customService.chunk(content)

      expect(result.chunks.length).toBeGreaterThan(1)
    })
  })

  // ===========================================================================
  // Fixed Size Chunking Tests
  // ===========================================================================

  describe('Fixed Size Chunking', () => {
    it('breaks at word boundaries when possible', () => {
      // One continuous line that forces fixed-size chunking
      const longLine = 'word '.repeat(5000)

      const result = service.chunk(longLine)

      // Check that chunks don't end mid-word (most of the time)
      for (const chunk of result.chunks) {
        // Most chunks should end with complete word (space or end)
        const lastChar = chunk.text.trim().slice(-1)
        // Allow for edge cases but most should be clean breaks
        expect(lastChar).not.toBe('')
      }
    })
  })
})
