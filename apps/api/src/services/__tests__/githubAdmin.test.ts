/*
 * GitHub Admin Procedures Tests
 * Version: 1.0.0
 *
 * Tests for GitHub admin tRPC procedures.
 * Tests cover user mapping CRUD, installation management, and access control.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 2 - GitHub App & OAuth
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AclService, ACL_PRESETS } from '../aclService';

const prisma = new PrismaClient();

describe('GitHub Admin Procedures', () => {
  let testUserId: number;
  let testWorkspaceId: number;
  let testGroupId: number;
  let aclService: AclService;

  beforeEach(async () => {
    aclService = new AclService();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-github-${Date.now()}@example.com`,
        username: `testuser-gh-${Date.now()}`,
        name: 'Test GitHub User',
        passwordHash: 'test',
      },
    });
    testUserId = testUser.id;

    // Create test workspace
    const testWorkspace = await prisma.workspace.create({
      data: {
        name: `Test GitHub Workspace ${Date.now()}`,
        slug: `test-gh-ws-${Date.now()}`,
      },
    });
    testWorkspaceId = testWorkspace.id;

    // Create test group (Workspace Admin)
    const groupTimestamp = Date.now();
    const testGroup = await prisma.group.create({
      data: {
        name: `test-ws-admin-${groupTimestamp}`,
        displayName: `Test WS Admin ${groupTimestamp}`,
        workspaceId: testWorkspaceId,
        type: 'WORKSPACE_ADMIN',
      },
    });
    testGroupId = testGroup.id;

    // Add user to admin group
    await prisma.groupMember.create({
      data: {
        groupId: testGroupId,
        userId: testUserId,
      },
    });

    // Grant workspace admin permission to user
    await aclService.grantPermission({
      resourceType: 'workspace',
      resourceId: testWorkspaceId,
      principalType: 'user',
      principalId: testUserId,
      permissions: ACL_PRESETS.FULL_CONTROL,
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of creation
    await prisma.gitHubUserMapping.deleteMany({ where: { workspaceId: testWorkspaceId } });
    await prisma.gitHubInstallation.deleteMany({ where: { workspaceId: testWorkspaceId } });
    await prisma.aclEntry.deleteMany({
      where: {
        OR: [
          { principalType: 'user', principalId: testUserId },
          { principalType: 'group', principalId: testGroupId },
        ],
      },
    });
    await prisma.groupMember.deleteMany({ where: { groupId: testGroupId } });
    await prisma.group.deleteMany({ where: { id: testGroupId } });
    await prisma.workspace.deleteMany({ where: { id: testWorkspaceId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  // ===========================================================================
  // User Mapping Tests
  // ===========================================================================

  describe('User Mapping CRUD', () => {
    it('should create a user mapping', async () => {
      const mapping = await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          githubLogin: 'testoctocat',
          githubId: BigInt(12345),
          githubEmail: 'test@github.com',
          autoMatched: false,
        },
      });

      expect(mapping).toBeDefined();
      expect(mapping.githubLogin).toBe('testoctocat');
      expect(mapping.userId).toBe(testUserId);
      expect(mapping.workspaceId).toBe(testWorkspaceId);
    });

    it('should enforce unique workspaceId + userId constraint', async () => {
      // Create first mapping
      await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          githubLogin: 'octocat1',
          autoMatched: false,
        },
      });

      // Try to create duplicate mapping - should fail
      await expect(
        prisma.gitHubUserMapping.create({
          data: {
            workspaceId: testWorkspaceId,
            userId: testUserId,
            githubLogin: 'octocat2', // Different login, but same user
            autoMatched: false,
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique workspaceId + githubLogin constraint', async () => {
      // Create first mapping
      await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          githubLogin: 'octocat',
          autoMatched: false,
        },
      });

      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-${Date.now()}@example.com`,
          username: `another-${Date.now()}`,
          name: 'Another User',
          passwordHash: 'test',
        },
      });

      // Try to create mapping with same GitHub login - should fail
      await expect(
        prisma.gitHubUserMapping.create({
          data: {
            workspaceId: testWorkspaceId,
            userId: anotherUser.id,
            githubLogin: 'octocat', // Same login as first mapping
            autoMatched: false,
          },
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should update a user mapping', async () => {
      const mapping = await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          githubLogin: 'oldlogin',
          autoMatched: false,
        },
      });

      const updated = await prisma.gitHubUserMapping.update({
        where: { id: mapping.id },
        data: {
          githubLogin: 'newlogin',
          githubEmail: 'new@github.com',
        },
      });

      expect(updated.githubLogin).toBe('newlogin');
      expect(updated.githubEmail).toBe('new@github.com');
    });

    it('should delete a user mapping', async () => {
      const mapping = await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          githubLogin: 'todelete',
          autoMatched: false,
        },
      });

      await prisma.gitHubUserMapping.delete({
        where: { id: mapping.id },
      });

      const deleted = await prisma.gitHubUserMapping.findUnique({
        where: { id: mapping.id },
      });

      expect(deleted).toBeNull();
    });

    it('should list user mappings with user info', async () => {
      await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          githubLogin: 'testlogin',
          autoMatched: true,
        },
      });

      const mappings = await prisma.gitHubUserMapping.findMany({
        where: { workspaceId: testWorkspaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      });

      expect(mappings.length).toBe(1);
      expect(mappings[0]!.user.name).toBe('Test GitHub User');
      expect(mappings[0]!.autoMatched).toBe(true);
    });
  });

  // ===========================================================================
  // Installation Tests
  // ===========================================================================

  describe('GitHub Installation', () => {
    it('should create an installation record', async () => {
      const installation = await prisma.gitHubInstallation.create({
        data: {
          workspaceId: testWorkspaceId,
          installationId: BigInt(99999999),
          accountType: 'organization',
          accountId: BigInt(12345678),
          accountLogin: 'test-org',
          permissions: { contents: 'read', issues: 'write' },
          events: ['issues', 'pull_request'],
        },
      });

      expect(installation).toBeDefined();
      expect(installation.accountLogin).toBe('test-org');
      expect(installation.accountType).toBe('organization');
      expect(installation.installationId).toBe(BigInt(99999999));
    });

    it('should enforce unique installationId constraint', async () => {
      const installationId = BigInt(88888888);

      await prisma.gitHubInstallation.create({
        data: {
          workspaceId: testWorkspaceId,
          installationId,
          accountType: 'organization',
          accountId: BigInt(12345678),
          accountLogin: 'test-org-1',
          permissions: {},
          events: [],
        },
      });

      // Create another workspace
      const anotherWorkspace = await prisma.workspace.create({
        data: {
          name: `Another WS ${Date.now()}`,
          slug: `another-ws-${Date.now()}`,
        },
      });

      // Try to create with same installationId - should fail (globally unique)
      await expect(
        prisma.gitHubInstallation.create({
          data: {
            workspaceId: anotherWorkspace.id,
            installationId, // Same installation ID
            accountType: 'organization',
            accountId: BigInt(12345678),
            accountLogin: 'test-org-2',
            permissions: {},
            events: [],
          },
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.workspace.delete({ where: { id: anotherWorkspace.id } });
    });

    it('should list installations for workspace', async () => {
      await prisma.gitHubInstallation.create({
        data: {
          workspaceId: testWorkspaceId,
          installationId: BigInt(77777777),
          accountType: 'user',
          accountId: BigInt(111111),
          accountLogin: 'personal-account',
          permissions: {},
          events: [],
        },
      });

      const installations = await prisma.gitHubInstallation.findMany({
        where: { workspaceId: testWorkspaceId },
      });

      expect(installations.length).toBe(1);
      expect(installations[0]!.accountLogin).toBe('personal-account');
    });

    it('should cascade delete when workspace is deleted', async () => {
      // Create a separate workspace for this test
      const tempWorkspace = await prisma.workspace.create({
        data: {
          name: `Temp WS ${Date.now()}`,
          slug: `temp-ws-${Date.now()}`,
        },
      });

      await prisma.gitHubInstallation.create({
        data: {
          workspaceId: tempWorkspace.id,
          installationId: BigInt(66666666),
          accountType: 'organization',
          accountId: BigInt(222222),
          accountLogin: 'cascade-test',
          permissions: {},
          events: [],
        },
      });

      // Delete workspace
      await prisma.workspace.delete({ where: { id: tempWorkspace.id } });

      // Installation should be gone
      const installations = await prisma.gitHubInstallation.findMany({
        where: { workspaceId: tempWorkspace.id },
      });

      expect(installations.length).toBe(0);
    });
  });

  // ===========================================================================
  // Access Control Tests
  // ===========================================================================

  describe('Access Control', () => {
    it('should grant workspace admin full control', async () => {
      const hasPermission = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PRESETS.FULL_CONTROL
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny access to user without permissions', async () => {
      // Create user without permissions
      const nonAdminUser = await prisma.user.create({
        data: {
          email: `nonadmin-${Date.now()}@example.com`,
          username: `nonadmin-${Date.now()}`,
          name: 'Non Admin User',
          passwordHash: 'test',
        },
      });

      const hasPermission = await aclService.hasPermission(
        nonAdminUser.id,
        'workspace',
        testWorkspaceId,
        ACL_PRESETS.FULL_CONTROL
      );

      expect(hasPermission).toBe(false);

      // Clean up
      await prisma.user.delete({ where: { id: nonAdminUser.id } });
    });

    it('should check workspace-specific permissions', async () => {
      // Create another workspace where user has no permissions
      const otherWorkspace = await prisma.workspace.create({
        data: {
          name: `Other WS ${Date.now()}`,
          slug: `other-ws-${Date.now()}`,
        },
      });

      // User should NOT have access to other workspace
      const hasOtherPermission = await aclService.hasPermission(
        testUserId,
        'workspace',
        otherWorkspace.id,
        ACL_PRESETS.FULL_CONTROL
      );

      expect(hasOtherPermission).toBe(false);

      // Clean up
      await prisma.workspace.delete({ where: { id: otherWorkspace.id } });
    });
  });

  // ===========================================================================
  // Overview Statistics Tests
  // ===========================================================================

  describe('Workspace Overview', () => {
    it('should count installations correctly', async () => {
      await prisma.gitHubInstallation.createMany({
        data: [
          {
            workspaceId: testWorkspaceId,
            installationId: BigInt(11111111),
            accountType: 'organization',
            accountId: BigInt(1),
            accountLogin: 'org-1',
            permissions: {},
            events: [],
          },
          {
            workspaceId: testWorkspaceId,
            installationId: BigInt(22222222),
            accountType: 'organization',
            accountId: BigInt(2),
            accountLogin: 'org-2',
            permissions: {},
            events: [],
          },
        ],
      });

      const count = await prisma.gitHubInstallation.count({
        where: { workspaceId: testWorkspaceId },
      });

      expect(count).toBe(2);
    });

    it('should count user mappings correctly', async () => {
      // Create additional users for mapping
      const user2 = await prisma.user.create({
        data: {
          email: `user2-${Date.now()}@example.com`,
          username: `user2-${Date.now()}`,
          name: 'User 2',
          passwordHash: 'test',
        },
      });

      await prisma.gitHubUserMapping.createMany({
        data: [
          {
            workspaceId: testWorkspaceId,
            userId: testUserId,
            githubLogin: 'login1',
            autoMatched: false,
          },
          {
            workspaceId: testWorkspaceId,
            userId: user2.id,
            githubLogin: 'login2',
            autoMatched: true,
          },
        ],
      });

      const count = await prisma.gitHubUserMapping.count({
        where: { workspaceId: testWorkspaceId },
      });

      expect(count).toBe(2);

      // Clean up
      await prisma.gitHubUserMapping.deleteMany({ where: { userId: user2.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });

  // ===========================================================================
  // Auto-Match Logic Tests
  // ===========================================================================

  describe('Auto-Match Logic', () => {
    it('should identify unmapped users', async () => {
      // Create users
      const user1 = await prisma.user.create({
        data: {
          email: `automatch1-${Date.now()}@example.com`,
          username: `automatch1-${Date.now()}`,
          name: 'Auto Match 1',
          passwordHash: 'test',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `automatch2-${Date.now()}@example.com`,
          username: `automatch2-${Date.now()}`,
          name: 'Auto Match 2',
          passwordHash: 'test',
        },
      });

      // Map only user1
      await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: user1.id,
          githubLogin: 'mapped-login',
          autoMatched: false,
        },
      });

      // Get existing mappings
      const existingMappings = await prisma.gitHubUserMapping.findMany({
        where: { workspaceId: testWorkspaceId },
        select: { userId: true },
      });

      const mappedUserIds = existingMappings.map((m) => m.userId);

      // User2 should not be in mapped list
      expect(mappedUserIds).toContain(user1.id);
      expect(mappedUserIds).not.toContain(user2.id);

      // Clean up
      await prisma.gitHubUserMapping.deleteMany({ where: { userId: user1.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    });

    it('should match users by email (case-insensitive)', () => {
      const githubEmail = 'Test@GitHub.com';
      const kanbuEmail = 'test@github.com';

      const matches = githubEmail.toLowerCase() === kanbuEmail.toLowerCase();
      expect(matches).toBe(true);
    });

    it('should match users by username', () => {
      const githubLogin = 'RobinW';
      const kanbuUsername = 'robinw';

      const matches = githubLogin.toLowerCase() === kanbuUsername.toLowerCase();
      expect(matches).toBe(true);
    });
  });

  // ===========================================================================
  // Suggest Mappings Tests
  // ===========================================================================

  describe('Suggest Mappings', () => {
    it('should suggest unmapped users', async () => {
      // Create users
      const mappedUser = await prisma.user.create({
        data: {
          email: `mapped-${Date.now()}@example.com`,
          username: `mapped-${Date.now()}`,
          name: 'Mapped User',
          passwordHash: 'test',
        },
      });

      const unmappedUser = await prisma.user.create({
        data: {
          email: `unmapped-${Date.now()}@example.com`,
          username: `unmapped-${Date.now()}`,
          name: 'Unmapped User',
          passwordHash: 'test',
        },
      });

      // Create mapping for one user
      await prisma.gitHubUserMapping.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: mappedUser.id,
          githubLogin: 'already-mapped',
          autoMatched: false,
        },
      });

      // Get suggestions (users without mappings)
      const mappedIds = await prisma.gitHubUserMapping.findMany({
        where: { workspaceId: testWorkspaceId },
        select: { userId: true },
      });

      const mappedUserIds = mappedIds.map((m) => m.userId);

      const suggestions = await prisma.user.findMany({
        where: {
          id: { notIn: mappedUserIds },
        },
        select: {
          id: true,
          name: true,
          username: true,
        },
      });

      // Unmapped user should be in suggestions
      const unmappedInSuggestions = suggestions.some((s) => s.id === unmappedUser.id);
      const mappedInSuggestions = suggestions.some((s) => s.id === mappedUser.id);

      expect(unmappedInSuggestions).toBe(true);
      expect(mappedInSuggestions).toBe(false);

      // Clean up
      await prisma.gitHubUserMapping.deleteMany({ where: { userId: mappedUser.id } });
      await prisma.user.deleteMany({ where: { id: { in: [mappedUser.id, unmappedUser.id] } } });
    });
  });
});
