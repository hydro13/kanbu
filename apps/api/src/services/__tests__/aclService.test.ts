/*
 * AclService Tests
 * Version: 1.0.0
 *
 * Tests for the filesystem-style ACL permission system.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AclService, ACL_PERMISSIONS, ACL_PRESETS } from '../aclService';

const prisma = new PrismaClient();

describe('AclService', () => {
  let aclService: AclService;
  let testUserId: number;
  let testGroupId: number;
  let testWorkspaceId: number;
  let testProjectId: number;

  beforeEach(async () => {
    aclService = new AclService();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-acl-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        name: 'Test User',
        passwordHash: 'test',
      },
    });
    testUserId = testUser.id;

    // Create test workspace
    const testWorkspace = await prisma.workspace.create({
      data: {
        name: `Test Workspace ${Date.now()}`,
        slug: `test-ws-${Date.now()}`,
      },
    });
    testWorkspaceId = testWorkspace.id;

    // Create test project
    const shortId = Date.now().toString().slice(-6); // Last 6 digits
    const testProject = await prisma.project.create({
      data: {
        name: `Test Project ${shortId}`,
        identifier: `TST${shortId}`,
        workspaceId: testWorkspaceId,
      },
    });
    testProjectId = testProject.id;

    // Create test group
    const groupTimestamp = Date.now();
    const testGroup = await prisma.group.create({
      data: {
        name: `test-group-${groupTimestamp}`,
        displayName: `Test Group ${groupTimestamp}`,
        workspaceId: testWorkspaceId,
        type: 'WORKSPACE',
      },
    });
    testGroupId = testGroup.id;
  });

  afterEach(async () => {
    // Clean up test data
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
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.workspace.deleteMany({ where: { id: testWorkspaceId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('Basic Permission Checks', () => {
    it('should deny access when no ACL entries exist', async () => {
      const hasRead = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PERMISSIONS.READ
      );
      expect(hasRead).toBe(false);
    });

    it('should grant access when user has READ permission', async () => {
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      const hasRead = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PERMISSIONS.READ
      );
      expect(hasRead).toBe(true);
    });

    it('should deny WRITE when user only has READ permission', async () => {
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      const hasWrite = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PERMISSIONS.WRITE
      );
      expect(hasWrite).toBe(false);
    });

    it('should grant all permissions with FULL_CONTROL preset', async () => {
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PRESETS.FULL_CONTROL,
      });

      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.READ
        )
      ).toBe(true);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.WRITE
        )
      ).toBe(true);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.EXECUTE
        )
      ).toBe(true);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.DELETE
        )
      ).toBe(true);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.PERMISSIONS
        )
      ).toBe(true);
    });
  });

  describe('Deny-First Logic', () => {
    it('should deny access when explicit deny exists (deny overrides allow)', async () => {
      // First grant READ
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      // Then deny READ
      await aclService.denyPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      const hasRead = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PERMISSIONS.READ
      );
      expect(hasRead).toBe(false);
    });

    it('should deny specific permissions while allowing others', async () => {
      // Grant CONTRIBUTOR (R+W+X)
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PRESETS.CONTRIBUTOR,
      });

      // Deny WRITE only
      await aclService.denyPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.WRITE,
      });

      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.READ
        )
      ).toBe(true);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.WRITE
        )
      ).toBe(false);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.EXECUTE
        )
      ).toBe(true);
    });
  });

  describe('Group-Based Permissions', () => {
    it('should grant access through group membership', async () => {
      // Add user to group
      await prisma.groupMember.create({
        data: {
          groupId: testGroupId,
          userId: testUserId,
        },
      });

      // Grant permission to group
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'group',
        principalId: testGroupId,
        permissions: ACL_PERMISSIONS.READ,
      });

      const hasRead = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PERMISSIONS.READ
      );
      expect(hasRead).toBe(true);
    });

    it('should combine user and group permissions', async () => {
      // Add user to group
      await prisma.groupMember.create({
        data: {
          groupId: testGroupId,
          userId: testUserId,
        },
      });

      // Grant READ to user directly
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      // Grant WRITE to group
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'group',
        principalId: testGroupId,
        permissions: ACL_PERMISSIONS.WRITE,
      });

      // User should have both READ (from direct) and WRITE (from group)
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.READ
        )
      ).toBe(true);
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.WRITE
        )
      ).toBe(true);
    });

    it('should apply group deny even when user has direct allow', async () => {
      // Add user to group
      await prisma.groupMember.create({
        data: {
          groupId: testGroupId,
          userId: testUserId,
        },
      });

      // Grant READ to user directly
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      // Deny READ to group
      await aclService.denyPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'group',
        principalId: testGroupId,
        permissions: ACL_PERMISSIONS.READ,
      });

      // Deny should override allow (NTFS-style)
      const hasRead = await aclService.hasPermission(
        testUserId,
        'workspace',
        testWorkspaceId,
        ACL_PERMISSIONS.READ
      );
      expect(hasRead).toBe(false);
    });
  });

  describe('Inheritance', () => {
    it('should inherit permissions from workspace to project', async () => {
      // Grant READ on workspace
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
        inheritToChildren: true,
      });

      // Project should inherit READ from workspace
      const hasRead = await aclService.hasPermission(
        testUserId,
        'project',
        testProjectId,
        ACL_PERMISSIONS.READ
      );
      expect(hasRead).toBe(true);
    });

    it('should allow explicit project permissions to extend inherited ones', async () => {
      // Grant READ on workspace
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.READ,
      });

      // Grant WRITE on project specifically
      await aclService.grantPermission({
        resourceType: 'project',
        resourceId: testProjectId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PERMISSIONS.WRITE,
      });

      // Should have READ (inherited) + WRITE (explicit)
      expect(
        await aclService.hasPermission(testUserId, 'project', testProjectId, ACL_PERMISSIONS.READ)
      ).toBe(true);
      expect(
        await aclService.hasPermission(testUserId, 'project', testProjectId, ACL_PERMISSIONS.WRITE)
      ).toBe(true);
    });
  });

  describe('Permission Revocation', () => {
    it('should revoke all permissions when revokePermission is called', async () => {
      // Grant permissions
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
        permissions: ACL_PRESETS.FULL_CONTROL,
      });

      // Verify permissions exist
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.READ
        )
      ).toBe(true);

      // Revoke
      await aclService.revokePermission({
        resourceType: 'workspace',
        resourceId: testWorkspaceId,
        principalType: 'user',
        principalId: testUserId,
      });

      // Verify permissions are gone
      expect(
        await aclService.hasPermission(
          testUserId,
          'workspace',
          testWorkspaceId,
          ACL_PERMISSIONS.READ
        )
      ).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should convert permission bitmask to array', () => {
      expect(aclService.permissionToArray(ACL_PRESETS.FULL_CONTROL)).toEqual([
        'Read',
        'Write',
        'Execute',
        'Delete',
        'Permissions',
      ]);
      expect(aclService.permissionToArray(ACL_PRESETS.READ_ONLY)).toEqual(['Read']);
      expect(aclService.permissionToArray(ACL_PRESETS.CONTRIBUTOR)).toEqual([
        'Read',
        'Write',
        'Execute',
      ]);
    });

    it('should convert array to permission bitmask', () => {
      expect(aclService.arrayToPermission(['Read', 'Write'])).toBe(
        ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE
      );
      expect(aclService.arrayToPermission(['r', 'w', 'x'])).toBe(ACL_PRESETS.CONTRIBUTOR);
    });

    it('should identify preset names', () => {
      expect(aclService.getPresetName(ACL_PRESETS.FULL_CONTROL)).toBe('Full Control');
      expect(aclService.getPresetName(ACL_PRESETS.READ_ONLY)).toBe('Read Only');
      expect(aclService.getPresetName(ACL_PRESETS.CONTRIBUTOR)).toBe('Contributor');
      expect(aclService.getPresetName(3)).toBeNull(); // Custom combo, no preset name
    });
  });
});
