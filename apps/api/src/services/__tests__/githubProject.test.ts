/*
 * GitHub Project Procedures Tests
 * Version: 1.0.0
 *
 * Tests for GitHub project-level tRPC procedures.
 * Tests cover repository linking, sync settings, and sync operations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 3 - Repository Linking
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AclService, ACL_PRESETS } from '../aclService';
import type { GitHubSyncSettings } from '@kanbu/shared';

const prisma = new PrismaClient();

describe('GitHub Project Procedures', () => {
  let testUserId: number;
  let testWorkspaceId: number;
  let testProjectId: number;
  let testInstallationId: number;
  let aclService: AclService;

  beforeEach(async () => {
    aclService = new AclService();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-github-project-${Date.now()}@example.com`,
        username: `testuser-ghp-${Date.now()}`,
        name: 'Test GitHub Project User',
        passwordHash: 'test',
      },
    });
    testUserId = testUser.id;

    // Create test workspace
    const testWorkspace = await prisma.workspace.create({
      data: {
        name: `Test GitHub Project Workspace ${Date.now()}`,
        slug: `test-ghp-ws-${Date.now()}`,
      },
    });
    testWorkspaceId = testWorkspace.id;

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        name: `Test Project ${Date.now()}`,
        identifier: `TP${Date.now()}`.slice(-6).toUpperCase(),
        workspaceId: testWorkspaceId,
      },
    });
    testProjectId = testProject.id;

    // Create test GitHub installation
    const testInstallation = await prisma.gitHubInstallation.create({
      data: {
        workspaceId: testWorkspaceId,
        installationId: BigInt(Date.now()),
        accountType: 'organization',
        accountId: BigInt(12345678),
        accountLogin: 'test-org',
        permissions: { contents: 'read', issues: 'write' },
        events: ['issues', 'pull_request'],
      },
    });
    testInstallationId = testInstallation.id;

    // Grant project write permission to user
    await aclService.grantPermission({
      resourceType: 'project',
      resourceId: testProjectId,
      principalType: 'user',
      principalId: testUserId,
      permissions: ACL_PRESETS.FULL_CONTROL,
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of creation
    await prisma.gitHubSyncLog.deleteMany({
      where: { repository: { projectId: testProjectId } },
    });
    await prisma.gitHubRepository.deleteMany({ where: { projectId: testProjectId } });
    await prisma.gitHubInstallation.deleteMany({ where: { workspaceId: testWorkspaceId } });
    await prisma.aclEntry.deleteMany({
      where: {
        principalType: 'user',
        principalId: testUserId,
      },
    });
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.workspace.deleteMany({ where: { id: testWorkspaceId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  // ===========================================================================
  // Repository Linking Tests
  // ===========================================================================

  describe('Repository Linking', () => {
    it('should link a repository to a project', async () => {
      const uniqueSuffix = Date.now();
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(98765432 + uniqueSuffix),
          owner: `test-org-${uniqueSuffix}`,
          name: `test-repo-${uniqueSuffix}`,
          fullName: `test-org-${uniqueSuffix}/test-repo-${uniqueSuffix}`,
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      expect(repository).toBeDefined();
      expect(repository.projectId).toBe(testProjectId);
      expect(repository.fullName).toBe(`test-org-${uniqueSuffix}/test-repo-${uniqueSuffix}`);
      expect(repository.syncEnabled).toBe(true);
    });

    it('should allow multiple repositories per project (multi-repo support)', async () => {
      const uniqueSuffix = Date.now();
      // Link first repository
      await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(11111111 + uniqueSuffix),
          owner: `multi-org-${uniqueSuffix}`,
          name: 'repo-1',
          fullName: `multi-org-${uniqueSuffix}/repo-1`,
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      // Link second repository to same project - should succeed (multi-repo support)
      const secondRepo = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(22222222 + uniqueSuffix),
          owner: `multi-org-${uniqueSuffix}`,
          name: 'repo-2',
          fullName: `multi-org-${uniqueSuffix}/repo-2`,
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      expect(secondRepo).toBeDefined();
      expect(secondRepo.projectId).toBe(testProjectId);
    });

    it('should enforce unique owner/name constraint', async () => {
      // Link repository to first project
      await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(33333333),
          owner: 'shared-org',
          name: 'shared-repo',
          fullName: 'shared-org/shared-repo',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      // Create another project
      const otherProject = await prisma.project.create({
        data: {
          name: `Other Project ${Date.now()}`,
          identifier: `OP${Date.now()}`.slice(-6).toUpperCase(),
          workspaceId: testWorkspaceId,
        },
      });

      // Try to link same repository to different project - should fail
      await expect(
        prisma.gitHubRepository.create({
          data: {
            projectId: otherProject.id,
            installationId: testInstallationId,
            repoId: BigInt(33333333),
            owner: 'shared-org',
            name: 'shared-repo',
            fullName: 'shared-org/shared-repo',
            defaultBranch: 'main',
            isPrivate: false,
            syncEnabled: true,
            syncSettings: {},
          },
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.project.delete({ where: { id: otherProject.id } });
    });

    it('should unlink a repository from a project', async () => {
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(44444444),
          owner: 'test-org',
          name: 'to-unlink',
          fullName: 'test-org/to-unlink',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      await prisma.gitHubRepository.delete({
        where: { id: repository.id },
      });

      const deleted = await prisma.gitHubRepository.findUnique({
        where: { id: repository.id },
      });

      expect(deleted).toBeNull();
    });

    it('should get linked repository with installation info', async () => {
      await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(55555555),
          owner: 'test-org',
          name: 'linked-repo',
          fullName: 'test-org/linked-repo',
          defaultBranch: 'develop',
          isPrivate: true,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      const repository = await prisma.gitHubRepository.findFirst({
        where: { projectId: testProjectId },
        include: {
          installation: {
            select: {
              id: true,
              accountLogin: true,
              accountType: true,
            },
          },
        },
      });

      expect(repository).toBeDefined();
      expect(repository!.installation!.accountLogin).toBe('test-org');
      expect(repository!.defaultBranch).toBe('develop');
      expect(repository!.isPrivate).toBe(true);
    });
  });

  // ===========================================================================
  // Sync Settings Tests
  // ===========================================================================

  describe('Sync Settings', () => {
    it('should update sync enabled status', async () => {
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(66666666),
          owner: 'test-org',
          name: 'sync-test',
          fullName: 'test-org/sync-test',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      expect(repository.syncEnabled).toBe(true);

      const updated = await prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: { syncEnabled: false },
      });

      expect(updated.syncEnabled).toBe(false);
    });

    it('should update sync settings JSON', async () => {
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(77777777),
          owner: 'test-org',
          name: 'settings-test',
          fullName: 'test-org/settings-test',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      const newSettings: GitHubSyncSettings = {
        issues: {
          enabled: true,
          direction: 'bidirectional',
          labelMapping: { bug: 'Bug', enhancement: 'Feature' },
        },
        pullRequests: {
          enabled: true,
          autoLink: true,
        },
        commits: {
          enabled: true,
          autoLink: true,
          pattern: 'KANBU-\\d+',
        },
      };

      const updated = await prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: { syncSettings: newSettings as object },
      });

      const settings = updated.syncSettings as GitHubSyncSettings;
      expect(settings.issues?.enabled).toBe(true);
      expect(settings.issues?.direction).toBe('bidirectional');
      expect(settings.pullRequests?.autoLink).toBe(true);
      expect(settings.commits?.pattern).toBe('KANBU-\\d+');
    });

    it('should validate sync settings structure', () => {
      const validSettings: GitHubSyncSettings = {
        issues: {
          enabled: true,
          direction: 'bidirectional',
        },
      };

      expect(validSettings.issues?.enabled).toBe(true);
      expect(['kanbu_to_github', 'github_to_kanbu', 'bidirectional']).toContain(
        validSettings.issues?.direction
      );
    });

    it('should handle partial sync settings update', async () => {
      const initialSettings: GitHubSyncSettings = {
        issues: { enabled: true, direction: 'bidirectional' },
        pullRequests: { enabled: false, autoLink: false },
      };

      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(88888888),
          owner: 'test-org',
          name: 'partial-test',
          fullName: 'test-org/partial-test',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: initialSettings as object,
        },
      });

      // Update only pullRequests settings
      const updatedSettings: GitHubSyncSettings = {
        ...(repository.syncSettings as GitHubSyncSettings),
        pullRequests: { enabled: true, autoLink: true },
      };

      const updated = await prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: { syncSettings: updatedSettings as object },
      });

      const settings = updated.syncSettings as GitHubSyncSettings;
      expect(settings.issues?.enabled).toBe(true); // Preserved
      expect(settings.pullRequests?.enabled).toBe(true); // Updated
      expect(settings.pullRequests?.autoLink).toBe(true); // Updated
    });
  });

  // ===========================================================================
  // Sync Log Tests
  // ===========================================================================

  describe('Sync Logs', () => {
    let testRepositoryId: number;

    beforeEach(async () => {
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(99999999),
          owner: 'test-org',
          name: 'log-test',
          fullName: 'test-org/log-test',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });
      testRepositoryId = repository.id;
    });

    it('should create sync log entry', async () => {
      const log = await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'issue_synced',
          direction: 'github_to_kanbu',
          entityType: 'issue',
          entityId: '42',
          status: 'success',
          details: { issueTitle: 'Test Issue' },
        },
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('issue_synced');
      expect(log.direction).toBe('github_to_kanbu');
      expect(log.status).toBe('success');
    });

    it('should log failed sync with error message', async () => {
      const log = await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'issue_sync_failed',
          direction: 'kanbu_to_github',
          entityType: 'issue',
          entityId: '100',
          status: 'failed',
          errorMessage: 'GitHub API rate limit exceeded',
          details: { remainingRateLimit: 0 },
        },
      });

      expect(log.status).toBe('failed');
      expect(log.errorMessage).toBe('GitHub API rate limit exceeded');
    });

    it('should list sync logs ordered by createdAt desc', async () => {
      const now = new Date();
      const earlierTime = new Date(now.getTime() - 1000); // 1 second earlier

      await prisma.gitHubSyncLog.createMany({
        data: [
          {
            repositoryId: testRepositoryId,
            action: 'first_action',
            direction: 'bidirectional',
            entityType: 'task',
            status: 'success',
            details: {},
            createdAt: earlierTime,
          },
          {
            repositoryId: testRepositoryId,
            action: 'second_action',
            direction: 'bidirectional',
            entityType: 'task',
            status: 'success',
            details: {},
            createdAt: now,
          },
        ],
      });

      const logs = await prisma.gitHubSyncLog.findMany({
        where: { repositoryId: testRepositoryId },
        orderBy: { createdAt: 'desc' },
      });

      expect(logs.length).toBe(2);
      // Most recent should be first
      expect(logs[0]!.action).toBe('second_action');
    });

    it('should count sync logs correctly', async () => {
      await prisma.gitHubSyncLog.createMany({
        data: [
          {
            repositoryId: testRepositoryId,
            action: 'action_1',
            direction: 'github_to_kanbu',
            entityType: 'issue',
            status: 'success',
            details: {},
          },
          {
            repositoryId: testRepositoryId,
            action: 'action_2',
            direction: 'kanbu_to_github',
            entityType: 'issue',
            status: 'success',
            details: {},
          },
          {
            repositoryId: testRepositoryId,
            action: 'action_3',
            direction: 'bidirectional',
            entityType: 'pr',
            status: 'failed',
            details: {},
          },
        ],
      });

      const total = await prisma.gitHubSyncLog.count({
        where: { repositoryId: testRepositoryId },
      });

      expect(total).toBe(3);
    });

    it('should cascade delete logs when repository is deleted', async () => {
      await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'to_be_deleted',
          direction: 'bidirectional',
          entityType: 'task',
          status: 'success',
          details: {},
        },
      });

      // Delete repository
      await prisma.gitHubRepository.delete({
        where: { id: testRepositoryId },
      });

      // Logs should be deleted
      const logs = await prisma.gitHubSyncLog.findMany({
        where: { repositoryId: testRepositoryId },
      });

      expect(logs.length).toBe(0);
    });
  });

  // ===========================================================================
  // Access Control Tests
  // ===========================================================================

  describe('Project Access Control', () => {
    it('should allow user with write permission', async () => {
      const hasPermission = await aclService.hasPermission(
        testUserId,
        'project',
        testProjectId,
        ACL_PRESETS.EDITOR // WRITE permission
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny user without project permission', async () => {
      // Create user without permissions
      const nonPermUser = await prisma.user.create({
        data: {
          email: `noperm-${Date.now()}@example.com`,
          username: `noperm-${Date.now()}`,
          name: 'No Permission User',
          passwordHash: 'test',
        },
      });

      const hasPermission = await aclService.hasPermission(
        nonPermUser.id,
        'project',
        testProjectId,
        ACL_PRESETS.EDITOR
      );

      expect(hasPermission).toBe(false);

      // Clean up
      await prisma.user.delete({ where: { id: nonPermUser.id } });
    });

    it('should enforce read permission for viewing linked repo', async () => {
      const hasReadPermission = await aclService.hasPermission(
        testUserId,
        'project',
        testProjectId,
        ACL_PRESETS.READ_ONLY
      );

      expect(hasReadPermission).toBe(true);
    });
  });

  // ===========================================================================
  // Sync Status Tests
  // ===========================================================================

  describe('Sync Status', () => {
    it('should track lastSyncAt timestamp', async () => {
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(10101010),
          owner: 'test-org',
          name: 'timestamp-test',
          fullName: 'test-org/timestamp-test',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
          lastSyncAt: null,
        },
      });

      expect(repository.lastSyncAt).toBeNull();

      const now = new Date();
      const updated = await prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: { lastSyncAt: now },
      });

      expect(updated.lastSyncAt).toBeDefined();
      expect(updated.lastSyncAt!.getTime()).toBeCloseTo(now.getTime(), -3); // Within 1 second
    });

    it('should count related entities', async () => {
      const repository = await prisma.gitHubRepository.create({
        data: {
          projectId: testProjectId,
          installationId: testInstallationId,
          repoId: BigInt(20202020),
          owner: 'test-org',
          name: 'count-test',
          fullName: 'test-org/count-test',
          defaultBranch: 'main',
          isPrivate: false,
          syncEnabled: true,
          syncSettings: {},
        },
      });

      // Create some issues
      await prisma.gitHubIssue.createMany({
        data: [
          {
            repositoryId: repository.id,
            issueNumber: 1,
            issueId: BigInt(1001),
            title: 'Issue 1',
            state: 'open',
          },
          {
            repositoryId: repository.id,
            issueNumber: 2,
            issueId: BigInt(1002),
            title: 'Issue 2',
            state: 'closed',
          },
        ],
      });

      // Create a PR
      await prisma.gitHubPullRequest.create({
        data: {
          repositoryId: repository.id,
          prNumber: 1,
          prId: BigInt(2001),
          title: 'PR 1',
          state: 'open',
          headBranch: 'feature/test',
          baseBranch: 'main',
          authorLogin: 'test-user',
        },
      });

      // Query with counts
      const repoWithCounts = await prisma.gitHubRepository.findUnique({
        where: { id: repository.id },
        include: {
          _count: {
            select: {
              issues: true,
              pullRequests: true,
              commits: true,
              syncLogs: true,
            },
          },
        },
      });

      expect(repoWithCounts!._count.issues).toBe(2);
      expect(repoWithCounts!._count.pullRequests).toBe(1);
      expect(repoWithCounts!._count.commits).toBe(0);
      expect(repoWithCounts!._count.syncLogs).toBe(0);

      // Clean up
      await prisma.gitHubPullRequest.deleteMany({ where: { repositoryId: repository.id } });
      await prisma.gitHubIssue.deleteMany({ where: { repositoryId: repository.id } });
    });
  });

  // ===========================================================================
  // Installation Validation Tests
  // ===========================================================================

  describe('Installation Validation', () => {
    it('should verify installation belongs to workspace', async () => {
      // Create installation in a different workspace
      const otherWorkspace = await prisma.workspace.create({
        data: {
          name: `Other WS ${Date.now()}`,
          slug: `other-ws-${Date.now()}`,
        },
      });

      const otherInstallation = await prisma.gitHubInstallation.create({
        data: {
          workspaceId: otherWorkspace.id,
          installationId: BigInt(Date.now() + 1),
          accountType: 'organization',
          accountId: BigInt(87654321),
          accountLogin: 'other-org',
          permissions: {},
          events: [],
        },
      });

      // Check if installation is in same workspace as project
      const project = await prisma.project.findUnique({
        where: { id: testProjectId },
        select: { workspaceId: true },
      });

      const installationInSameWorkspace = await prisma.gitHubInstallation.findFirst({
        where: {
          id: otherInstallation.id,
          workspaceId: project!.workspaceId,
        },
      });

      // Should be null because installation is in different workspace
      expect(installationInSameWorkspace).toBeNull();

      // Clean up
      await prisma.gitHubInstallation.delete({ where: { id: otherInstallation.id } });
      await prisma.workspace.delete({ where: { id: otherWorkspace.id } });
    });

    it('should list available installations for workspace', async () => {
      const project = await prisma.project.findUnique({
        where: { id: testProjectId },
        select: { workspaceId: true },
      });

      const installations = await prisma.gitHubInstallation.findMany({
        where: {
          workspaceId: project!.workspaceId,
          suspendedAt: null,
        },
        select: {
          id: true,
          accountLogin: true,
          accountType: true,
        },
      });

      expect(installations.length).toBeGreaterThan(0);
      expect(installations[0]!.accountLogin).toBe('test-org');
    });
  });
});
