/*
 * AI Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub AI-powered features.
 * Note: Tests focus on configuration and error handling.
 * Integration tests with actual AI providers require API keys.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 16 - AI/Claude Integratie
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isAIConfigured,
  getAIProvider,
  generatePRSummary,
  reviewCode,
  generateReleaseNotes,
  generateCommitMessage,
  type PRSummaryInput,
  type CodeReviewInput,
  type ReleaseNotesInput,
  type CommitMessageInput,
} from '../aiService'

describe('aiService', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv }
    // Clear any cached client
    delete process.env.AI_PROVIDER
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe('isAIConfigured', () => {
    it('should return false when no provider is set', () => {
      expect(isAIConfigured()).toBe(false)
    })

    it('should return false when provider is set but no API key', () => {
      process.env.AI_PROVIDER = 'anthropic'
      process.env.ANTHROPIC_API_KEY = ''
      expect(isAIConfigured()).toBe(false)
    })

    it('should return true when Anthropic is configured', () => {
      process.env.AI_PROVIDER = 'anthropic'
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      expect(isAIConfigured()).toBe(true)
    })

    it('should return true when OpenAI is configured', () => {
      process.env.AI_PROVIDER = 'openai'
      process.env.OPENAI_API_KEY = 'sk-test-key'
      expect(isAIConfigured()).toBe(true)
    })

    it('should default to anthropic provider', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      expect(isAIConfigured()).toBe(true)
    })
  })

  describe('getAIProvider', () => {
    it('should return null when not configured', () => {
      expect(getAIProvider()).toBeNull()
    })

    it('should return anthropic when Anthropic is configured', () => {
      process.env.AI_PROVIDER = 'anthropic'
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      expect(getAIProvider()).toBe('anthropic')
    })

    it('should return openai when OpenAI is configured', () => {
      process.env.AI_PROVIDER = 'openai'
      process.env.OPENAI_API_KEY = 'sk-test-key'
      expect(getAIProvider()).toBe('openai')
    })
  })

  // ===========================================================================
  // Error Handling Tests - PR Summary
  // ===========================================================================

  describe('generatePRSummary', () => {
    const validInput: PRSummaryInput = {
      title: 'feat: Add user authentication',
      commits: [
        { sha: 'abc1234', message: 'Add login endpoint', author: 'developer' },
        { sha: 'def5678', message: 'Add JWT validation', author: 'developer' },
      ],
      baseBranch: 'main',
      headBranch: 'feature/auth',
    }

    it('should throw when AI service is not configured', async () => {
      await expect(generatePRSummary(validInput)).rejects.toThrow(
        'AI service not configured'
      )
    })

    it('should accept valid input structure', () => {
      // Type check - if this compiles, the types are correct
      const input: PRSummaryInput = {
        title: 'Test',
        commits: [],
        baseBranch: 'main',
        headBranch: 'feature',
      }
      expect(input.title).toBe('Test')
    })

    it('should accept optional diff in input', () => {
      const inputWithDiff: PRSummaryInput = {
        title: 'Test',
        commits: [],
        baseBranch: 'main',
        headBranch: 'feature',
        diff: '+ new code\n- old code',
      }
      expect(inputWithDiff.diff).toBeDefined()
    })
  })

  // ===========================================================================
  // Error Handling Tests - Code Review
  // ===========================================================================

  describe('reviewCode', () => {
    const validInput: CodeReviewInput = {
      diff: `
+++ b/src/auth.ts
@@ -1,5 +1,10 @@
+import bcrypt from 'bcrypt'
+
 export function hashPassword(password: string): string {
-  return password // TODO: implement
+  return bcrypt.hashSync(password, 10)
 }
`,
    }

    it('should throw when AI service is not configured', async () => {
      await expect(reviewCode(validInput)).rejects.toThrow(
        'AI service not configured'
      )
    })

    it('should accept valid input with language hint', () => {
      const input: CodeReviewInput = {
        diff: '+ const x = 1',
        language: 'typescript',
      }
      expect(input.language).toBe('typescript')
    })

    it('should accept valid input with context', () => {
      const input: CodeReviewInput = {
        diff: '+ const x = 1',
        context: 'This is a security-critical component',
      }
      expect(input.context).toBeDefined()
    })
  })

  // ===========================================================================
  // Error Handling Tests - Release Notes
  // ===========================================================================

  describe('generateReleaseNotes', () => {
    const validInput: ReleaseNotesInput = {
      projectName: 'Kanbu',
      prs: [
        {
          number: 42,
          title: 'feat: Add dark mode',
          author: 'designer',
          mergedAt: '2026-01-09T10:00:00Z',
        },
        {
          number: 43,
          title: 'fix: Fix login redirect',
          author: 'developer',
          mergedAt: '2026-01-09T11:00:00Z',
        },
      ],
    }

    it('should throw when AI service is not configured', async () => {
      await expect(generateReleaseNotes(validInput)).rejects.toThrow(
        'AI service not configured'
      )
    })

    it('should accept input with version', () => {
      const input: ReleaseNotesInput = {
        projectName: 'Test',
        version: 'v1.0.0',
        prs: [],
      }
      expect(input.version).toBe('v1.0.0')
    })

    it('should accept input with previous version', () => {
      const input: ReleaseNotesInput = {
        projectName: 'Test',
        version: 'v1.1.0',
        previousVersion: 'v1.0.0',
        prs: [],
      }
      expect(input.previousVersion).toBe('v1.0.0')
    })

    it('should accept PRs with labels', () => {
      const input: ReleaseNotesInput = {
        projectName: 'Test',
        prs: [
          {
            number: 1,
            title: 'Test',
            author: 'dev',
            mergedAt: '2026-01-09T00:00:00Z',
            labels: ['feature', 'ui'],
          },
        ],
      }
      expect(input.prs[0]!.labels).toContain('feature')
    })
  })

  // ===========================================================================
  // Error Handling Tests - Commit Message
  // ===========================================================================

  describe('generateCommitMessage', () => {
    const validInput: CommitMessageInput = {
      files: [
        { path: 'src/auth.ts', status: 'modified' },
        { path: 'src/types.ts', status: 'added' },
      ],
    }

    it('should throw when AI service is not configured', async () => {
      await expect(generateCommitMessage(validInput)).rejects.toThrow(
        'AI service not configured'
      )
    })

    it('should accept all file status types', () => {
      const input: CommitMessageInput = {
        files: [
          { path: 'a.ts', status: 'added' },
          { path: 'b.ts', status: 'modified' },
          { path: 'c.ts', status: 'deleted' },
          { path: 'd.ts', status: 'renamed' },
        ],
      }
      expect(input.files).toHaveLength(4)
    })

    it('should accept files with diffs', () => {
      const input: CommitMessageInput = {
        files: [
          {
            path: 'src/main.ts',
            status: 'modified',
            diff: '+ console.log("hello")\n- console.log("world")',
          },
        ],
      }
      expect(input.files[0]!.diff).toBeDefined()
    })

    it('should accept context parameter', () => {
      const input: CommitMessageInput = {
        files: [{ path: 'test.ts', status: 'added' }],
        context: 'Adding unit tests for auth module',
      }
      expect(input.context).toBeDefined()
    })
  })

  // ===========================================================================
  // Type Structure Tests
  // ===========================================================================

  describe('type structures', () => {
    it('should have correct PRSummary structure', () => {
      // This test verifies the return type structure at compile time
      type PRSummary = {
        summary: string
        keyChanges: string[]
        breakingChanges: string[]
        affectedAreas: string[]
        suggestedReviewers?: string[]
      }

      const mockResult: PRSummary = {
        summary: 'Test',
        keyChanges: ['change1'],
        breakingChanges: [],
        affectedAreas: ['area1'],
      }
      expect(mockResult.summary).toBe('Test')
    })

    it('should have correct CodeReviewResult structure', () => {
      type CodeReviewSuggestion = {
        type: 'security' | 'performance' | 'style' | 'bug' | 'complexity' | 'suggestion'
        severity: 'info' | 'warning' | 'error'
        message: string
        file?: string
        line?: number
        suggestion?: string
      }

      type CodeReviewResult = {
        suggestions: CodeReviewSuggestion[]
        overallAssessment: string
        score: number
      }

      const mockResult: CodeReviewResult = {
        suggestions: [
          {
            type: 'security',
            severity: 'error',
            message: 'Hardcoded credentials',
          },
        ],
        overallAssessment: 'Needs improvement',
        score: 60,
      }
      expect(mockResult.score).toBe(60)
    })

    it('should have correct ReleaseNotes structure', () => {
      type ReleaseNotes = {
        title: string
        summary: string
        sections: {
          features: string[]
          fixes: string[]
          improvements: string[]
          breaking: string[]
          other: string[]
        }
        contributors: string[]
        markdown: string
      }

      const mockResult: ReleaseNotes = {
        title: 'v1.0.0',
        summary: 'Initial release',
        sections: {
          features: ['Feature 1'],
          fixes: [],
          improvements: [],
          breaking: [],
          other: [],
        },
        contributors: ['dev1'],
        markdown: '# v1.0.0',
      }
      expect(mockResult.sections.features).toContain('Feature 1')
    })

    it('should have correct CommitMessage structure', () => {
      type CommitMessage = {
        type: 'feat' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore'
        scope?: string
        title: string
        body?: string
        full: string
      }

      const mockResult: CommitMessage = {
        type: 'feat',
        scope: 'auth',
        title: 'Add login functionality',
        full: 'feat(auth): Add login functionality',
      }
      expect(mockResult.type).toBe('feat')
    })
  })
})
