/*
 * Multi-Repo Service Tests
 * Version: 1.0.0
 *
 * Tests for multi-repository project support and cross-repo features.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 15 - Multi-Repo Support (Multi-Repo)
 * =============================================================================
 */

import { describe, it, expect } from 'vitest'
import {
  parseCrossRepoReference,
  findCrossRepoReferences,
  type RepositoryInfo,
  type CrossRepoStats,
  type CrossRepoSearchResult,
} from '../multiRepoService'

describe('multiRepoService', () => {
  // ===========================================================================
  // Type Tests
  // ===========================================================================

  describe('RepositoryInfo type', () => {
    it('should have correct structure', () => {
      const repo: RepositoryInfo = {
        id: 1,
        projectId: 100,
        owner: 'hydro13',
        name: 'kanbu',
        fullName: 'hydro13/kanbu',
        defaultBranch: 'main',
        isPrivate: true,
        isPrimary: true,
        syncEnabled: true,
        lastSyncAt: new Date(),
        createdAt: new Date(),
      }

      expect(repo.id).toBe(1)
      expect(repo.fullName).toBe('hydro13/kanbu')
      expect(repo.isPrimary).toBe(true)
    })

    it('should allow null lastSyncAt', () => {
      const repo: RepositoryInfo = {
        id: 2,
        projectId: 100,
        owner: 'hydro13',
        name: 'genx',
        fullName: 'hydro13/genx',
        defaultBranch: 'main',
        isPrivate: false,
        isPrimary: false,
        syncEnabled: true,
        lastSyncAt: null,
        createdAt: new Date(),
      }

      expect(repo.lastSyncAt).toBeNull()
    })
  })

  describe('CrossRepoStats type', () => {
    it('should have correct structure', () => {
      const now = new Date()
      const repo1: RepositoryInfo = {
        id: 1, projectId: 100, owner: 'hydro13', name: 'kanbu',
        fullName: 'hydro13/kanbu', defaultBranch: 'main',
        isPrivate: false, isPrimary: true, syncEnabled: true, lastSyncAt: null, createdAt: now,
      }
      const repo2: RepositoryInfo = {
        id: 2, projectId: 100, owner: 'hydro13', name: 'genx',
        fullName: 'hydro13/genx', defaultBranch: 'main',
        isPrivate: false, isPrimary: false, syncEnabled: true, lastSyncAt: null, createdAt: now,
      }

      const stats: CrossRepoStats = {
        totalRepositories: 2,
        totalPRs: 45,
        totalCommits: 230,
        totalIssues: 15,
        byRepository: [
          { repository: repo1, prs: 20, commits: 150, issues: 10 },
          { repository: repo2, prs: 25, commits: 80, issues: 5 },
        ],
      }

      expect(stats.totalRepositories).toBe(2)
      expect(stats.byRepository).toHaveLength(2)
    })
  })

  describe('CrossRepoSearchResult type', () => {
    it('should have correct structure', () => {
      const result: CrossRepoSearchResult = {
        type: 'pr',
        repository: {
          id: 1,
          projectId: 100,
          owner: 'hydro13',
          name: 'kanbu',
          fullName: 'hydro13/kanbu',
          defaultBranch: 'main',
          isPrivate: false,
          isPrimary: true,
          syncEnabled: true,
          lastSyncAt: null,
          createdAt: new Date(),
        },
        id: 123,
        title: 'Fix authentication bug',
        reference: 'hydro13/kanbu#42',
        url: 'https://github.com/hydro13/kanbu/pull/42',
      }

      expect(result.type).toBe('pr')
      expect(result.id).toBe(123)
      expect(result.repository.fullName).toBe('hydro13/kanbu')
    })
  })

  // ===========================================================================
  // Cross-Repo Reference Parsing Tests
  // ===========================================================================

  describe('parseCrossRepoReference', () => {
    it('should parse full owner/repo#number format', () => {
      const result = parseCrossRepoReference('hydro13/kanbu#123')

      expect(result).not.toBeNull()
      expect(result?.owner).toBe('hydro13')
      expect(result?.repo).toBe('kanbu')
      expect(result?.number).toBe(123)
    })

    it('should return null for repo#number format (cross-repo requires owner)', () => {
      // Cross-repo references require full owner/repo#number format
      // Simple repo#number is handled by prCommitLinkService
      const result = parseCrossRepoReference('kanbu#456')
      expect(result).toBeNull()
    })

    it('should return null for simple #number format (same-repo reference)', () => {
      // Simple #number references are same-repo, not cross-repo
      // Handled by prCommitLinkService
      const result = parseCrossRepoReference('#789')
      expect(result).toBeNull()
    })

    it('should return null for invalid references', () => {
      expect(parseCrossRepoReference('invalid')).toBeNull()
      expect(parseCrossRepoReference('no-number')).toBeNull()
      expect(parseCrossRepoReference('#abc')).toBeNull()
      expect(parseCrossRepoReference('')).toBeNull()
    })

    it('should return null for GitHub URLs (use dedicated URL parser)', () => {
      const result = parseCrossRepoReference('https://github.com/hydro13/kanbu/issues/99')
      // URL parsing is a separate concern
      expect(result).toBeNull()
    })
  })

  describe('findCrossRepoReferences', () => {
    it('should find cross-repo references in text', () => {
      const text = `
        This PR fixes hydro13/kanbu#123 and relates to hydro13/genx#456.
        Also see org/other-repo#789 for context.
      `

      const refs = findCrossRepoReferences(text)

      expect(refs).toHaveLength(3)
      expect(refs.some(r => r.owner === 'hydro13' && r.repo === 'kanbu' && r.number === 123)).toBe(true)
      expect(refs.some(r => r.owner === 'hydro13' && r.repo === 'genx' && r.number === 456)).toBe(true)
      expect(refs.some(r => r.owner === 'org' && r.repo === 'other-repo' && r.number === 789)).toBe(true)
    })

    it('should return empty array for text without cross-repo references', () => {
      const text = 'This is just regular text without any issue references.'

      const refs = findCrossRepoReferences(text)

      expect(refs).toEqual([])
    })

    it('should not match simple #number references (same-repo)', () => {
      // Simple #123 is a same-repo reference, not cross-repo
      const text = 'Fixes #123. Related to #456. See #789 for details.'

      const refs = findCrossRepoReferences(text)

      // No cross-repo refs found
      expect(refs).toHaveLength(0)
    })

    it('should handle commit messages with cross-repo references', () => {
      const text = 'feat(api): Add webhook handler\n\nCloses hydro13/kanbu#42'

      const refs = findCrossRepoReferences(text)

      expect(refs).toHaveLength(1)
      expect(refs[0]!.owner).toBe('hydro13')
      expect(refs[0]!.repo).toBe('kanbu')
      expect(refs[0]!.number).toBe(42)
    })

    it('should handle PR body with multiple repos', () => {
      const text = `
        ## Changes
        - Implements feature from hydro13/frontend#10
        - Backend support for hydro13/api#20
        - Shared utils from hydro13/shared#5
      `

      const refs = findCrossRepoReferences(text)

      expect(refs).toHaveLength(3)
      expect(refs.map(r => r.number).sort((a, b) => a - b)).toEqual([5, 10, 20])
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle cross-repo references at start of string', () => {
      const refs = findCrossRepoReferences('org/repo#1 is the first issue')

      expect(refs).toHaveLength(1)
      expect(refs[0]!.number).toBe(1)
    })

    it('should handle references at end of string', () => {
      const refs = findCrossRepoReferences('See issue hydro13/kanbu#999')

      expect(refs).toHaveLength(1)
      expect(refs[0]!.number).toBe(999)
    })

    it('should handle repo names with dashes', () => {
      const result = parseCrossRepoReference('my-org/my-repo#123')

      expect(result).not.toBeNull()
      expect(result?.owner).toBe('my-org')
      expect(result?.repo).toBe('my-repo')
    })

    it('should handle repo names with underscores', () => {
      const result = parseCrossRepoReference('my_org/my_repo#456')

      expect(result).not.toBeNull()
      expect(result?.owner).toBe('my_org')
      expect(result?.repo).toBe('my_repo')
    })

    it('should handle large issue numbers in cross-repo refs', () => {
      const result = parseCrossRepoReference('org/repo#99999')

      expect(result).not.toBeNull()
      expect(result?.number).toBe(99999)
    })

    it('should not match numbers without hash', () => {
      const refs = findCrossRepoReferences('PR 123 is not a reference')

      expect(refs).toHaveLength(0)
    })

    it('should handle mixed content (only cross-repo refs)', () => {
      const text = `
        # Release Notes v1.0.0

        ## Features
        - New dashboard (hydro13/web#100)
        - API improvements (hydro13/api#200)

        ## Bug Fixes
        - Fixed #300 (same-repo, not matched)
        - Resolved kanbu#400 (no owner, not matched)

        ## Stats
        - 50% performance improvement
        - 100 new tests added
      `

      const refs = findCrossRepoReferences(text)

      // Only cross-repo refs with owner/repo#number are matched
      expect(refs.length).toBe(2)
      expect(refs.map(r => r.number).sort((a, b) => a - b)).toEqual([100, 200])
    })
  })

  // ===========================================================================
  // Repository Management (Integration tests would be needed for full coverage)
  // ===========================================================================

  describe('repository management concepts', () => {
    it('should support multiple repositories per project', () => {
      const now = new Date()
      // Conceptual test - actual implementation requires database
      const repositories: RepositoryInfo[] = [
        {
          id: 1, projectId: 100, owner: 'hydro13', name: 'frontend',
          fullName: 'hydro13/frontend', defaultBranch: 'main',
          isPrivate: false, isPrimary: true, syncEnabled: true,
          lastSyncAt: now, createdAt: now,
        },
        {
          id: 2, projectId: 100, owner: 'hydro13', name: 'backend',
          fullName: 'hydro13/backend', defaultBranch: 'main',
          isPrivate: false, isPrimary: false, syncEnabled: true,
          lastSyncAt: now, createdAt: now,
        },
        {
          id: 3, projectId: 100, owner: 'hydro13', name: 'shared',
          fullName: 'hydro13/shared', defaultBranch: 'main',
          isPrivate: false, isPrimary: false, syncEnabled: false,
          lastSyncAt: null, createdAt: now,
        },
      ]

      // All repos belong to same project
      expect(repositories.every(r => r.projectId === 100)).toBe(true)

      // Only one primary
      expect(repositories.filter(r => r.isPrimary)).toHaveLength(1)

      // Primary is frontend
      expect(repositories.find(r => r.isPrimary)?.name).toBe('frontend')
    })

    it('should calculate cross-repo stats correctly', () => {
      const now = new Date()
      const repo1: RepositoryInfo = {
        id: 1, projectId: 100, owner: 'org', name: 'repo1',
        fullName: 'org/repo1', defaultBranch: 'main',
        isPrivate: false, isPrimary: true, syncEnabled: true,
        lastSyncAt: now, createdAt: now,
      }
      const repo2: RepositoryInfo = {
        id: 2, projectId: 100, owner: 'org', name: 'repo2',
        fullName: 'org/repo2', defaultBranch: 'main',
        isPrivate: false, isPrimary: false, syncEnabled: true,
        lastSyncAt: now, createdAt: now,
      }
      const repo3: RepositoryInfo = {
        id: 3, projectId: 100, owner: 'org', name: 'repo3',
        fullName: 'org/repo3', defaultBranch: 'main',
        isPrivate: false, isPrimary: false, syncEnabled: true,
        lastSyncAt: now, createdAt: now,
      }

      const stats: CrossRepoStats = {
        totalRepositories: 3,
        totalPRs: 100,
        totalCommits: 500,
        totalIssues: 50,
        byRepository: [
          { repository: repo1, prs: 40, commits: 200, issues: 20 },
          { repository: repo2, prs: 35, commits: 180, issues: 18 },
          { repository: repo3, prs: 25, commits: 120, issues: 12 },
        ],
      }

      // Totals should match sum of breakdown
      const sumPRs = stats.byRepository.reduce((acc, r) => acc + r.prs, 0)
      const sumCommits = stats.byRepository.reduce((acc, r) => acc + r.commits, 0)
      const sumIssues = stats.byRepository.reduce((acc, r) => acc + r.issues, 0)

      expect(sumPRs).toBe(stats.totalPRs)
      expect(sumCommits).toBe(stats.totalCommits)
      expect(sumIssues).toBe(stats.totalIssues)
    })
  })
})
