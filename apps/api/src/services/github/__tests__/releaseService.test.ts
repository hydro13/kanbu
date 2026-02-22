/*
 * Release Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub release tracking operations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 11 - Geavanceerde Sync
 * =============================================================================
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../lib/prisma';
import {
  upsertRelease,
  getReleases,
  getReleaseByTag,
  getLatestRelease,
  getProjectReleases,
  getReleaseStats,
  deleteRelease,
  syncReleaseFromWebhook,
  generateReleaseNotes,
} from '../releaseService';

// Mock Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    gitHubRelease: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    gitHubRepository: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    gitHubPullRequest: {
      findMany: vi.fn(),
    },
  },
}));

describe('releaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // upsertRelease
  // ===========================================================================

  describe('upsertRelease', () => {
    it('should create or update a release', async () => {
      vi.mocked(prisma.gitHubRelease.upsert).mockResolvedValue({ id: 1 } as any);

      const result = await upsertRelease({
        repositoryId: 1,
        releaseId: BigInt(12345),
        tagName: 'v1.0.0',
        name: 'Version 1.0.0',
        body: '## Changes\n- Initial release',
        draft: false,
        prerelease: false,
        authorLogin: 'developer',
        htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        publishedAt: new Date('2026-01-09'),
      });

      expect(result).toEqual({ id: 1 });
      expect(prisma.gitHubRelease.upsert).toHaveBeenCalledWith({
        where: {
          repositoryId_releaseId: {
            repositoryId: 1,
            releaseId: BigInt(12345),
          },
        },
        create: expect.objectContaining({
          repositoryId: 1,
          tagName: 'v1.0.0',
          name: 'Version 1.0.0',
        }),
        update: expect.objectContaining({
          tagName: 'v1.0.0',
          name: 'Version 1.0.0',
        }),
        select: { id: true },
      });
    });
  });

  // ===========================================================================
  // getReleases
  // ===========================================================================

  describe('getReleases', () => {
    it('should return releases ordered by published date', async () => {
      vi.mocked(prisma.gitHubRelease.findMany).mockResolvedValue([
        {
          id: 2,
          repositoryId: 1,
          releaseId: BigInt(12346),
          tagName: 'v1.1.0',
          name: 'Version 1.1.0',
          body: 'Bug fixes',
          draft: false,
          prerelease: false,
          authorLogin: 'developer',
          htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.1.0',
          tarballUrl: null,
          zipballUrl: null,
          publishedAt: new Date('2026-01-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await getReleases(1);

      expect(result).toHaveLength(1);
      expect(result[0]!.tagName).toBe('v1.1.0');
    });

    it('should filter out drafts by default', async () => {
      vi.mocked(prisma.gitHubRelease.findMany).mockResolvedValue([]);

      await getReleases(1);

      expect(prisma.gitHubRelease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            repositoryId: 1,
            draft: false,
          }),
        })
      );
    });

    it('should include drafts when requested', async () => {
      vi.mocked(prisma.gitHubRelease.findMany).mockResolvedValue([]);

      await getReleases(1, { includeDrafts: true });

      expect(prisma.gitHubRelease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            draft: false,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // getReleaseByTag
  // ===========================================================================

  describe('getReleaseByTag', () => {
    it('should find release by tag name', async () => {
      vi.mocked(prisma.gitHubRelease.findFirst).mockResolvedValue({
        id: 1,
        repositoryId: 1,
        releaseId: BigInt(12345),
        tagName: 'v1.0.0',
        name: 'Version 1.0.0',
        body: 'Initial release',
        draft: false,
        prerelease: false,
        authorLogin: 'developer',
        htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        tarballUrl: null,
        zipballUrl: null,
        publishedAt: new Date('2026-01-09'),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await getReleaseByTag(1, 'v1.0.0');

      expect(result).not.toBeNull();
      expect(result!.tagName).toBe('v1.0.0');
    });

    it('should return null when release not found', async () => {
      vi.mocked(prisma.gitHubRelease.findFirst).mockResolvedValue(null);

      const result = await getReleaseByTag(1, 'v999.0.0');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getLatestRelease
  // ===========================================================================

  describe('getLatestRelease', () => {
    it('should return the latest non-draft release', async () => {
      vi.mocked(prisma.gitHubRelease.findFirst).mockResolvedValue({
        id: 2,
        repositoryId: 1,
        releaseId: BigInt(12346),
        tagName: 'v1.1.0',
        name: 'Version 1.1.0',
        body: 'Bug fixes',
        draft: false,
        prerelease: false,
        authorLogin: 'developer',
        htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.1.0',
        tarballUrl: null,
        zipballUrl: null,
        publishedAt: new Date('2026-01-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await getLatestRelease(1);

      expect(result).not.toBeNull();
      expect(result!.tagName).toBe('v1.1.0');
    });
  });

  // ===========================================================================
  // getProjectReleases
  // ===========================================================================

  describe('getProjectReleases', () => {
    it('should return empty array when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await getProjectReleases(1);

      expect(result).toEqual([]);
    });

    it('should return releases for linked repository', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({ id: 1 } as any);
      vi.mocked(prisma.gitHubRelease.findMany).mockResolvedValue([
        {
          id: 1,
          repositoryId: 1,
          releaseId: BigInt(12345),
          tagName: 'v1.0.0',
          name: 'Version 1.0.0',
          body: 'Initial release',
          draft: false,
          prerelease: false,
          authorLogin: 'developer',
          htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
          tarballUrl: null,
          zipballUrl: null,
          publishedAt: new Date('2026-01-09'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await getProjectReleases(1);

      expect(result).toHaveLength(1);
    });
  });

  // ===========================================================================
  // getReleaseStats
  // ===========================================================================

  describe('getReleaseStats', () => {
    it('should return zero stats when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await getReleaseStats(1);

      expect(result).toEqual({
        total: 0,
        published: 0,
        drafts: 0,
        prereleases: 0,
        latestRelease: null,
      });
    });

    it('should return aggregated stats', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({ id: 1 } as any);
      vi.mocked(prisma.gitHubRelease.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // drafts
        .mockResolvedValueOnce(3); // prereleases
      vi.mocked(prisma.gitHubRelease.findFirst).mockResolvedValue({
        id: 1,
        tagName: 'v1.5.0',
      } as any);

      const result = await getReleaseStats(1);

      expect(result.total).toBe(10);
      expect(result.published).toBe(8); // 10 - 2 drafts
      expect(result.drafts).toBe(2);
      expect(result.prereleases).toBe(3);
      expect(result.latestRelease).not.toBeNull();
    });
  });

  // ===========================================================================
  // syncReleaseFromWebhook
  // ===========================================================================

  describe('syncReleaseFromWebhook', () => {
    it('should upsert release on published action', async () => {
      vi.mocked(prisma.gitHubRelease.upsert).mockResolvedValue({ id: 1 } as any);

      const result = await syncReleaseFromWebhook(1, 'published', {
        id: 12345,
        tag_name: 'v1.0.0',
        name: 'Version 1.0.0',
        body: 'Initial release',
        draft: false,
        prerelease: false,
        author: { login: 'developer' },
        html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        published_at: '2026-01-09T00:00:00Z',
      });

      expect(result).toEqual({ id: 1 });
      expect(prisma.gitHubRelease.upsert).toHaveBeenCalled();
    });

    it('should delete release on deleted action', async () => {
      vi.mocked(prisma.gitHubRelease.delete).mockResolvedValue({ id: 1 } as any);

      const result = await syncReleaseFromWebhook(1, 'deleted', {
        id: 12345,
        tag_name: 'v1.0.0',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
      });

      expect(result).toBeNull();
      expect(prisma.gitHubRelease.delete).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // generateReleaseNotes
  // ===========================================================================

  describe('generateReleaseNotes', () => {
    it('should return empty notes when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await generateReleaseNotes(1);

      expect(result).toContain('No repository linked');
    });

    it('should generate notes from merged PRs', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        fullName: 'owner/repo',
      } as any);
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([
        {
          id: 1,
          prNumber: 42,
          title: 'feat: Add new feature',
          mergedAt: new Date(),
          taskId: 1,
          task: { id: 1, title: 'Add new feature', reference: 'PROJ-123' },
        },
        {
          id: 2,
          prNumber: 43,
          title: 'fix: Bug fix',
          mergedAt: new Date(),
          taskId: 2,
          task: { id: 2, title: 'Fix critical bug', reference: 'PROJ-124' },
        },
      ] as any);

      const result = await generateReleaseNotes(1);

      expect(result).toContain('# Release Notes');
      expect(result).toContain('## Features');
      expect(result).toContain('## Bug Fixes');
    });

    it('should show no changes message when no PRs found', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        fullName: 'owner/repo',
      } as any);
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([]);

      const result = await generateReleaseNotes(1);

      expect(result).toContain('No changes found');
    });
  });

  // ===========================================================================
  // deleteRelease
  // ===========================================================================

  describe('deleteRelease', () => {
    it('should delete a release', async () => {
      vi.mocked(prisma.gitHubRelease.delete).mockResolvedValue({ id: 1 } as any);

      await deleteRelease(1, BigInt(12345));

      expect(prisma.gitHubRelease.delete).toHaveBeenCalledWith({
        where: {
          repositoryId_releaseId: {
            repositoryId: 1,
            releaseId: BigInt(12345),
          },
        },
      });
    });
  });
});
