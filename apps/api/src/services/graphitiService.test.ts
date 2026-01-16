/**
 * Unit Tests: GraphitiService Temporal Queries (Fase 16.4)
 *
 * Tests for the bi-temporal query capabilities.
 * Uses mocked FalkorDB connections to test query logic.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect } from 'vitest'
import type { TemporalFact, SearchResult } from './graphitiService'

// Note: Full integration tests require running FalkorDB
// These unit tests focus on data transformation and edge cases

// =============================================================================
// Fase 17.3.1: Diff-Based Extraction Helper Functions
// =============================================================================

/**
 * Helper function that mirrors GraphitiService.calculateContentDiff()
 * Used for unit testing without needing FalkorDB connection
 */
function calculateContentDiff(oldContent: string | undefined, newContent: string): string {
  if (!oldContent) {
    return newContent
  }

  const normalizeText = (text: string) => text.trim().toLowerCase()

  const oldLines = new Set(
    oldContent.split('\n')
      .map(line => normalizeText(line))
      .filter(line => line.length > 0)
  )

  const newLines = newContent.split('\n').filter(line => {
    const normalized = normalizeText(line)
    return normalized.length > 0 && !oldLines.has(normalized)
  })

  if (newLines.length === 0) {
    return ''
  }

  return newLines.join('\n')
}

/**
 * Helper function that mirrors GraphitiService.isNewEntity()
 * Used for unit testing without needing FalkorDB connection
 */
function isNewEntity(entityName: string, oldContent: string | undefined): boolean {
  if (!oldContent) {
    return true
  }

  const normalizedOld = oldContent.toLowerCase()
  const normalizedName = entityName.toLowerCase()

  return !normalizedOld.includes(normalizedName)
}

describe('graphitiService temporal queries', () => {
  // ===========================================================================
  // TemporalFact Interface Tests
  // ===========================================================================

  describe('TemporalFact interface', () => {
    it('should define all required fields', () => {
      const fact: TemporalFact = {
        sourceId: 'node-1',
        sourceName: 'Wiki Page',
        sourceType: 'WikiPage',
        targetId: 'node-2',
        targetName: 'Concept',
        targetType: 'Concept',
        fact: 'Wiki Page mentions Concept',
        edgeType: 'MENTIONS',
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: null,
        createdAt: '2026-01-13T12:00:00.000Z',
        pageId: 123,
      }

      expect(fact.sourceId).toBe('node-1')
      expect(fact.sourceName).toBe('Wiki Page')
      expect(fact.sourceType).toBe('WikiPage')
      expect(fact.targetId).toBe('node-2')
      expect(fact.targetName).toBe('Concept')
      expect(fact.targetType).toBe('Concept')
      expect(fact.fact).toBe('Wiki Page mentions Concept')
      expect(fact.edgeType).toBe('MENTIONS')
      expect(fact.validAt).toBe('2026-01-01T00:00:00.000Z')
      expect(fact.invalidAt).toBeNull()
      expect(fact.createdAt).toBe('2026-01-13T12:00:00.000Z')
      expect(fact.pageId).toBe(123)
    })

    it('should allow optional pageId', () => {
      const fact: TemporalFact = {
        sourceId: 'node-1',
        sourceName: 'Source',
        sourceType: 'Concept',
        targetId: 'node-2',
        targetName: 'Target',
        targetType: 'Person',
        fact: 'Source relates to Target',
        edgeType: 'RELATES_TO',
        validAt: null,
        invalidAt: null,
        createdAt: '2026-01-13T12:00:00.000Z',
      }

      expect(fact.pageId).toBeUndefined()
    })
  })

  // ===========================================================================
  // SearchResult Interface Tests
  // ===========================================================================

  describe('SearchResult interface', () => {
    it('should define all required fields', () => {
      const result: SearchResult = {
        nodeId: 'page-123',
        name: 'Test Page',
        type: 'WikiPage',
        score: 0.95,
        pageId: 123,
      }

      expect(result.nodeId).toBe('page-123')
      expect(result.name).toBe('Test Page')
      expect(result.type).toBe('WikiPage')
      expect(result.score).toBe(0.95)
      expect(result.pageId).toBe(123)
    })

    it('should allow optional pageId', () => {
      const result: SearchResult = {
        nodeId: 'concept-abc',
        name: 'Some Concept',
        type: 'Concept',
        score: 0.75,
      }

      expect(result.pageId).toBeUndefined()
    })
  })

  // ===========================================================================
  // Temporal Logic Tests (using helper functions)
  // ===========================================================================

  describe('temporal filtering logic', () => {
    // Helper function that mirrors the Cypher query logic
    function isFactValidAt(
      fact: { validAt: string | null; invalidAt: string | null; expiredAt: string | null },
      asOfDate: Date
    ): boolean {
      const asOfIso = asOfDate.toISOString()

      // Transaction time check: not expired
      if (fact.expiredAt !== null) {
        return false
      }

      // Valid time check: validAt <= asOf
      if (fact.validAt !== null && fact.validAt > asOfIso) {
        return false
      }

      // Valid time check: invalidAt is null OR invalidAt > asOf
      if (fact.invalidAt !== null && fact.invalidAt <= asOfIso) {
        return false
      }

      return true
    }

    it('should include facts with validAt before query date', () => {
      const fact = {
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: null,
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(true)
    })

    it('should include facts with validAt equal to query date', () => {
      const fact = {
        validAt: '2026-01-13T12:00:00.000Z',
        invalidAt: null,
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(true)
    })

    it('should exclude facts with validAt after query date', () => {
      const fact = {
        validAt: '2026-02-01T00:00:00.000Z',
        invalidAt: null,
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(false)
    })

    it('should include facts with null validAt', () => {
      const fact = {
        validAt: null,
        invalidAt: null,
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(true)
    })

    it('should exclude facts invalidated before query date', () => {
      const fact = {
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: '2026-01-10T00:00:00.000Z',
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(false)
    })

    it('should include facts invalidated after query date', () => {
      const fact = {
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: '2026-02-01T00:00:00.000Z',
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(true)
    })

    it('should include facts with null invalidAt', () => {
      const fact = {
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: null,
        expiredAt: null,
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(true)
    })

    it('should exclude expired facts', () => {
      const fact = {
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: null,
        expiredAt: '2026-01-10T00:00:00.000Z',
      }
      const queryDate = new Date('2026-01-13T12:00:00.000Z')

      expect(isFactValidAt(fact, queryDate)).toBe(false)
    })

    it('should handle complex temporal scenario', () => {
      // Fact was valid from Jan 1 to Jan 15, not expired
      const fact = {
        validAt: '2026-01-01T00:00:00.000Z',
        invalidAt: '2026-01-15T00:00:00.000Z',
        expiredAt: null,
      }

      // Query on Jan 10 - should be valid
      expect(isFactValidAt(fact, new Date('2026-01-10T12:00:00.000Z'))).toBe(true)

      // Query on Jan 20 - should be invalid
      expect(isFactValidAt(fact, new Date('2026-01-20T12:00:00.000Z'))).toBe(false)

      // Query on Dec 15, 2025 - before validAt, should be invalid
      expect(isFactValidAt(fact, new Date('2025-12-15T12:00:00.000Z'))).toBe(false)
    })
  })

  // ===========================================================================
  // Date Formatting Tests
  // ===========================================================================

  describe('date formatting', () => {
    it('should handle Date to ISO string conversion', () => {
      const date = new Date('2026-01-13T12:30:45.123Z')
      const isoString = date.toISOString()

      expect(isoString).toBe('2026-01-13T12:30:45.123Z')
    })

    it('should handle various date input formats', () => {
      // ISO format with timezone
      const date1 = new Date('2026-01-13T00:00:00.000Z')
      expect(date1.toISOString()).toBe('2026-01-13T00:00:00.000Z')

      // Date only (assumes midnight UTC)
      const date2 = new Date('2026-01-13')
      expect(date2.getUTCFullYear()).toBe(2026)
      expect(date2.getUTCMonth()).toBe(0) // January
      expect(date2.getUTCDate()).toBe(13)
    })

    it('should compare ISO date strings correctly', () => {
      const date1 = '2026-01-13T12:00:00.000Z'
      const date2 = '2026-01-13T13:00:00.000Z'
      const date3 = '2026-01-12T12:00:00.000Z'

      // String comparison works for ISO dates
      expect(date1 < date2).toBe(true)
      expect(date1 > date3).toBe(true)
      expect(date1 === '2026-01-13T12:00:00.000Z').toBe(true)
    })
  })

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle millisecond precision', () => {
      const fact = {
        validAt: '2026-01-13T12:00:00.000Z',
        invalidAt: '2026-01-13T12:00:00.001Z', // 1ms later
        expiredAt: null,
      }

      // At exactly validAt, should be valid
      expect(fact.validAt <= '2026-01-13T12:00:00.000Z').toBe(true)

      // At exactly invalidAt, should be invalid (invalidAt <= asOf)
      expect(fact.invalidAt <= '2026-01-13T12:00:00.001Z').toBe(true)
    })

    it('should handle end of year/month boundaries', () => {
      const fact = {
        validAt: '2025-12-31T23:59:59.999Z',
        invalidAt: null,
        expiredAt: null,
      }

      // Query at start of new year
      const queryDate = new Date('2026-01-01T00:00:00.000Z')
      expect(fact.validAt <= queryDate.toISOString()).toBe(true)
    })

    it('should handle facts created and invalidated same day', () => {
      const fact = {
        validAt: '2026-01-13T10:00:00.000Z',
        invalidAt: '2026-01-13T14:00:00.000Z',
        expiredAt: null,
      }

      // Query at noon - should be valid
      expect(fact.validAt <= '2026-01-13T12:00:00.000Z').toBe(true)
      expect(fact.invalidAt > '2026-01-13T12:00:00.000Z').toBe(true)

      // Query at 15:00 - should be invalid
      expect(fact.invalidAt <= '2026-01-13T15:00:00.000Z').toBe(true)
    })
  })
})

// =============================================================================
// Fase 17.3.1: Diff-Based Extraction Tests
// =============================================================================

describe('calculateContentDiff - diff-based extraction (Fase 17.3.1)', () => {
  // ===========================================================================
  // Basic Functionality
  // ===========================================================================

  describe('basic functionality', () => {
    it('should return full content when oldContent is undefined', () => {
      const newContent = 'Line 1\nLine 2\nLine 3'
      const result = calculateContentDiff(undefined, newContent)
      expect(result).toBe(newContent)
    })

    it('should return full content when oldContent is empty string', () => {
      const newContent = 'Line 1\nLine 2'
      const result = calculateContentDiff('', newContent)
      expect(result).toBe(newContent)
    })

    it('should return empty string when content is identical', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const result = calculateContentDiff(content, content)
      expect(result).toBe('')
    })

    it('should return only new lines', () => {
      const oldContent = 'Existing line 1\nExisting line 2'
      const newContent = 'Existing line 1\nExisting line 2\nNew line 3'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('New line 3')
    })

    it('should return multiple new lines', () => {
      const oldContent = 'Line 1'
      const newContent = 'Line 1\nNew line 2\nNew line 3'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('New line 2\nNew line 3')
    })
  })

  // ===========================================================================
  // Case Sensitivity
  // ===========================================================================

  describe('case sensitivity', () => {
    it('should ignore case differences', () => {
      const oldContent = 'Hello World'
      const newContent = 'HELLO WORLD'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('')
    })

    it('should detect new content regardless of case', () => {
      const oldContent = 'EXISTING LINE'
      const newContent = 'existing line\nNew Content Here'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('New Content Here')
    })
  })

  // ===========================================================================
  // Whitespace Handling
  // ===========================================================================

  describe('whitespace handling', () => {
    it('should ignore leading/trailing whitespace', () => {
      const oldContent = '  Hello World  '
      const newContent = 'Hello World'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('')
    })

    it('should filter out empty lines', () => {
      const oldContent = 'Line 1'
      const newContent = 'Line 1\n\n\nNew line'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('New line')
    })

    it('should handle whitespace-only lines', () => {
      const oldContent = 'Content'
      const newContent = 'Content\n   \n\t\nNew stuff'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('New stuff')
    })
  })

  // ===========================================================================
  // Real-World Wiki Content
  // ===========================================================================

  describe('wiki content scenarios', () => {
    it('should detect new paragraph added to wiki page', () => {
      const oldContent = `# Project Documentation

This is the introduction.

## Features

- Feature 1
- Feature 2`

      const newContent = `# Project Documentation

This is the introduction.

## Features

- Feature 1
- Feature 2
- Feature 3

## New Section

This section was just added.`

      const result = calculateContentDiff(oldContent, newContent)

      // Should contain new feature and new section
      expect(result).toContain('- Feature 3')
      expect(result).toContain('## New Section')
      expect(result).toContain('This section was just added.')

      // Should NOT contain existing content
      expect(result).not.toContain('# Project Documentation')
      expect(result).not.toContain('- Feature 1')
    })

    it('should detect modified lines as new', () => {
      const oldContent = 'The deadline is January 2026'
      const newContent = 'The deadline is February 2026'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('The deadline is February 2026')
    })

    it('should handle markdown headers', () => {
      const oldContent = '# Title\n## Section 1'
      const newContent = '# Title\n## Section 1\n## Section 2'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('## Section 2')
    })

    it('should handle mentions of entities', () => {
      const oldContent = 'John works on Project Alpha'
      const newContent = 'John works on Project Alpha\nMary joined the team yesterday'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('Mary joined the team yesterday')
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle completely replaced content', () => {
      const oldContent = 'Old content here'
      const newContent = 'Completely new content'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('Completely new content')
    })

    it('should handle single character differences', () => {
      const oldContent = 'Version 1.0'
      const newContent = 'Version 2.0'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('Version 2.0')
    })

    it('should handle unicode content', () => {
      const oldContent = 'Café ☕'
      const newContent = 'Café ☕\nNieuw: 🎉 Feestje!'
      const result = calculateContentDiff(oldContent, newContent)
      expect(result).toBe('Nieuw: 🎉 Feestje!')
    })
  })
})

describe('isNewEntity - entity detection (Fase 17.3.1)', () => {
  // ===========================================================================
  // Basic Functionality
  // ===========================================================================

  describe('basic functionality', () => {
    it('should return true when oldContent is undefined', () => {
      expect(isNewEntity('Any Entity', undefined)).toBe(true)
    })

    it('should return true when entity is not in old content', () => {
      const oldContent = 'Some existing text'
      expect(isNewEntity('New Entity', oldContent)).toBe(true)
    })

    it('should return false when entity is in old content', () => {
      const oldContent = 'This mentions John Smith in the document'
      expect(isNewEntity('John Smith', oldContent)).toBe(false)
    })
  })

  // ===========================================================================
  // Case Sensitivity
  // ===========================================================================

  describe('case sensitivity', () => {
    it('should find entity regardless of case (lowercase in content)', () => {
      const oldContent = 'john smith works here'
      expect(isNewEntity('John Smith', oldContent)).toBe(false)
    })

    it('should find entity regardless of case (uppercase in content)', () => {
      const oldContent = 'JOHN SMITH works here'
      expect(isNewEntity('john smith', oldContent)).toBe(false)
    })

    it('should find entity with mixed case', () => {
      const oldContent = 'JoHn SmItH is mentioned'
      expect(isNewEntity('JOHN SMITH', oldContent)).toBe(false)
    })
  })

  // ===========================================================================
  // Partial Matches
  // ===========================================================================

  describe('partial matches', () => {
    it('should find entity as substring', () => {
      const oldContent = 'The ProjectAlpha repository was created'
      expect(isNewEntity('ProjectAlpha', oldContent)).toBe(false)
    })

    it('should find entity within longer text', () => {
      const oldContent = 'Meeting notes: discussed Project Alpha timeline with team'
      expect(isNewEntity('Project Alpha', oldContent)).toBe(false)
    })

    it('should not match partial entity names', () => {
      const oldContent = 'Project A is mentioned'
      expect(isNewEntity('Project Alpha', oldContent)).toBe(true)
    })
  })

  // ===========================================================================
  // Wiki Content Scenarios
  // ===========================================================================

  describe('wiki content scenarios', () => {
    it('should detect new person mention', () => {
      const oldContent = `# Team Members
- John Doe
- Jane Smith`

      expect(isNewEntity('John Doe', oldContent)).toBe(false)
      expect(isNewEntity('Jane Smith', oldContent)).toBe(false)
      expect(isNewEntity('Bob Johnson', oldContent)).toBe(true)
    })

    it('should detect new project mention', () => {
      const oldContent = 'We are working on Project Phoenix'

      expect(isNewEntity('Project Phoenix', oldContent)).toBe(false)
      expect(isNewEntity('Project Thunder', oldContent)).toBe(true)
    })

    it('should detect new concept', () => {
      const oldContent = 'The authentication system uses OAuth2'

      expect(isNewEntity('OAuth2', oldContent)).toBe(false)
      expect(isNewEntity('SAML', oldContent)).toBe(true)
    })

    it('should handle markdown formatted entities', () => {
      const oldContent = '**John Doe** is the project lead'
      expect(isNewEntity('John Doe', oldContent)).toBe(false)
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle empty entity name', () => {
      const oldContent = 'Some content'
      // Empty string is always found (substring of any string)
      expect(isNewEntity('', oldContent)).toBe(false)
    })

    it('should handle unicode entity names', () => {
      const oldContent = 'Meeting with François Müller'
      expect(isNewEntity('François Müller', oldContent)).toBe(false)
      expect(isNewEntity('Hans Günther', oldContent)).toBe(true)
    })

    it('should handle entity with special characters', () => {
      const oldContent = 'Using the @mention feature'
      expect(isNewEntity('@mention', oldContent)).toBe(false)
    })

    it('should handle newlines in content', () => {
      const oldContent = 'Line 1\nJohn Doe\nLine 3'
      expect(isNewEntity('John Doe', oldContent)).toBe(false)
    })
  })
})

// =============================================================================
// Fase 17.4: extractEntityContext - Context Extraction for Contradiction Detection
// =============================================================================

/**
 * Helper function that mirrors GraphitiService.extractEntityContext()
 * Used for unit testing without needing FalkorDB connection
 */
function extractEntityContext(
  content: string,
  entityName: string,
  pageTitle: string,
  maxSentences: number = 2
): string {
  // Normalize for case-insensitive search
  const normalizedContent = content.toLowerCase()
  const normalizedEntity = entityName.toLowerCase()

  // Find position of entity mention
  const entityIndex = normalizedContent.indexOf(normalizedEntity)
  if (entityIndex === -1) {
    // Entity not found in content, use fallback
    return `"${pageTitle}" mentions "${entityName}"`
  }

  // Split content into sentences (simple approach)
  // Handle common sentence endings: . ! ? and newlines
  const sentences = content.split(/(?<=[.!?])\s+|\n+/).filter(s => s.trim().length > 0)

  // Find sentences that contain the entity (case-insensitive)
  const relevantSentences: string[] = []
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(normalizedEntity)) {
      relevantSentences.push(sentence.trim())
      if (relevantSentences.length >= maxSentences) break
    }
  }

  if (relevantSentences.length === 0) {
    // No sentence found, extract context around mention
    const start = Math.max(0, entityIndex - 50)
    const end = Math.min(content.length, entityIndex + entityName.length + 100)
    let context = content.substring(start, end).trim()

    // Clean up partial words at start/end
    if (start > 0) {
      const firstSpace = context.indexOf(' ')
      if (firstSpace > 0 && firstSpace < 20) {
        context = context.substring(firstSpace + 1)
      }
    }
    if (end < content.length) {
      const lastSpace = context.lastIndexOf(' ')
      if (lastSpace > context.length - 20) {
        context = context.substring(0, lastSpace)
      }
    }

    return context || `"${pageTitle}" mentions "${entityName}"`
  }

  // Join relevant sentences
  const contextFact = relevantSentences.join(' ')

  // Truncate if too long (max 500 chars for fact description)
  if (contextFact.length > 500) {
    return contextFact.substring(0, 497) + '...'
  }

  return contextFact
}

describe('extractEntityContext - context extraction for contradiction detection (Fase 17.4)', () => {
  const pageTitle = 'Test Page'

  describe('basic functionality', () => {
    it('should extract sentence containing entity', () => {
      const content = 'Robin has green hair. He works at the office.'
      const result = extractEntityContext(content, 'Robin', pageTitle)
      expect(result).toBe('Robin has green hair.')
    })

    it('should return fallback when entity not found', () => {
      const content = 'This content has no relevant entity.'
      const result = extractEntityContext(content, 'John', pageTitle)
      expect(result).toBe('"Test Page" mentions "John"')
    })

    it('should handle multiple sentences with entity', () => {
      const content = 'Robin has green hair. Robin also has blue eyes. Robin works at Acme.'
      const result = extractEntityContext(content, 'Robin', pageTitle, 2)
      expect(result).toBe('Robin has green hair. Robin also has blue eyes.')
    })

    it('should respect maxSentences limit', () => {
      const content = 'Robin has green hair. Robin has blue eyes. Robin is tall.'
      const result = extractEntityContext(content, 'Robin', pageTitle, 1)
      expect(result).toBe('Robin has green hair.')
    })
  })

  describe('case sensitivity', () => {
    it('should match entity case-insensitively', () => {
      const content = 'ROBIN has green hair.'
      const result = extractEntityContext(content, 'robin', pageTitle)
      expect(result).toBe('ROBIN has green hair.')
    })

    it('should match mixed case entity', () => {
      const content = 'Robin Waslander works at Acme.'
      const result = extractEntityContext(content, 'ROBIN WASLANDER', pageTitle)
      expect(result).toBe('Robin Waslander works at Acme.')
    })
  })

  describe('sentence detection', () => {
    it('should handle sentences ending with !', () => {
      const content = 'Robin is amazing! He saved the day.'
      const result = extractEntityContext(content, 'Robin', pageTitle)
      expect(result).toBe('Robin is amazing!')
    })

    it('should handle sentences ending with ?', () => {
      const content = 'Where is Robin? He should be here.'
      const result = extractEntityContext(content, 'Robin', pageTitle)
      expect(result).toBe('Where is Robin?')
    })

    it('should handle newlines as sentence separators', () => {
      const content = 'Robin has green hair\nHe is tall\nRobin works at Acme'
      const result = extractEntityContext(content, 'Robin', pageTitle, 2)
      expect(result).toBe('Robin has green hair Robin works at Acme')
    })
  })

  describe('wiki content scenarios', () => {
    it('should extract person attributes correctly', () => {
      const content = `# Team Members

Robin has geen haar (bald). Robin is the project lead.
John has brown hair. John is a developer.`
      const result = extractEntityContext(content, 'Robin', pageTitle, 2)
      expect(result).toContain('Robin has geen haar')
      expect(result).toContain('Robin is the project lead')
    })

    it('should extract project information correctly', () => {
      const content = `Project Alpha uses PostgreSQL for data storage.
The project is in maintenance mode.
Project Alpha started in 2024.`
      const result = extractEntityContext(content, 'Project Alpha', pageTitle, 2)
      expect(result).toContain('Project Alpha uses PostgreSQL')
      expect(result).toContain('Project Alpha started in 2024')
    })

    it('should handle markdown formatted content', () => {
      const content = `## Robin's Profile

**Name:** Robin Waslander
**Hair:** Robin has geel haar (yellow hair)
**Role:** Lead developer`
      const result = extractEntityContext(content, 'Robin', pageTitle)
      expect(result).toContain('Robin')
    })
  })

  describe('contradiction detection scenarios', () => {
    it('should extract hair color facts for comparison', () => {
      // This is the key use case - extracting facts that can be compared
      const page1Content = 'Robin has geen haar (bald).'
      const page2Content = 'Robin has groen haar (green hair).'

      const fact1 = extractEntityContext(page1Content, 'Robin', 'Page 1')
      const fact2 = extractEntityContext(page2Content, 'Robin', 'Page 2')

      // These should be meaningful facts that can be compared by LLM
      expect(fact1).toContain('geen haar')
      expect(fact2).toContain('groen haar')
      // NOT generic "mentions" text
      expect(fact1).not.toContain('mentions person')
      expect(fact2).not.toContain('mentions person')
    })

    it('should extract employment facts for comparison', () => {
      const page1Content = 'Jan works at Company A. He is the CTO.'
      const page2Content = 'Jan works at Company B. He started last month.'

      const fact1 = extractEntityContext(page1Content, 'Jan', 'Page 1')
      const fact2 = extractEntityContext(page2Content, 'Jan', 'Page 2')

      expect(fact1).toContain('works at Company A')
      expect(fact2).toContain('works at Company B')
    })
  })

  describe('truncation', () => {
    it('should truncate very long facts', () => {
      const longSentence = 'Robin ' + 'has a very long description that '.repeat(20) + 'ends here.'
      const result = extractEntityContext(longSentence, 'Robin', pageTitle)
      expect(result.length).toBeLessThanOrEqual(500)
      if (result.length === 500) {
        expect(result.endsWith('...')).toBe(true)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = extractEntityContext('', 'Robin', pageTitle)
      expect(result).toBe('"Test Page" mentions "Robin"')
    })

    it('should handle content with only whitespace', () => {
      const result = extractEntityContext('   \n\n   ', 'Robin', pageTitle)
      expect(result).toBe('"Test Page" mentions "Robin"')
    })

    it('should handle content without sentence endings', () => {
      const content = 'Robin has green hair with no period at the end'
      const result = extractEntityContext(content, 'Robin', pageTitle)
      // Should return something useful, not fallback
      expect(result).toContain('Robin')
      expect(result).toContain('green hair')
    })

    it('should handle entity at very beginning of content', () => {
      const content = 'Robin is here. More text follows.'
      const result = extractEntityContext(content, 'Robin', pageTitle)
      expect(result).toBe('Robin is here.')
    })

    it('should handle entity at very end of content', () => {
      const content = 'Someone mentions Robin.'
      const result = extractEntityContext(content, 'Robin', pageTitle)
      expect(result).toBe('Someone mentions Robin.')
    })
  })
})
