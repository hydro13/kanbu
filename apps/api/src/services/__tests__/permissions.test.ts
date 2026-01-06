/*
 * PermissionService Tests
 * Version: 1.0.0
 *
 * Unit tests for the central PermissionService.
 * Tests role hierarchy, permission checks, and access control logic.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 257 - PermissionService
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PermissionService } from '../permissions'

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
    },
    workspaceUser: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'

describe('PermissionService', () => {
  let service: PermissionService
  const mockedPrisma = vi.mocked(prisma, true)

  beforeEach(() => {
    service = new PermissionService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ===========================================================================
  // Platform Level - Super Admin
  // ===========================================================================

  describe('isSuperAdmin', () => {
    it('returns true for ADMIN role', () => {
      expect(service.isSuperAdmin('ADMIN')).toBe(true)
    })

    it('returns false for MANAGER role', () => {
      expect(service.isSuperAdmin('MANAGER')).toBe(false)
    })

    it('returns false for USER role', () => {
      expect(service.isSuperAdmin('USER')).toBe(false)
    })
  })

  describe('isSuperAdminById', () => {
    it('returns true when user has ADMIN role', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' } as any)

      const result = await service.isSuperAdminById(1)

      expect(result).toBe(true)
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { role: true },
      })
    })

    it('returns false when user has USER role', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)

      const result = await service.isSuperAdminById(1)

      expect(result).toBe(false)
    })

    it('returns false when user does not exist', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null)

      const result = await service.isSuperAdminById(999)

      expect(result).toBe(false)
    })
  })

  describe('requireSuperAdmin', () => {
    it('does not throw for ADMIN role', () => {
      expect(() => service.requireSuperAdmin('ADMIN')).not.toThrow()
    })

    it('throws FORBIDDEN for non-ADMIN roles', () => {
      expect(() => service.requireSuperAdmin('USER')).toThrow('system administrator')
      expect(() => service.requireSuperAdmin('MANAGER')).toThrow('system administrator')
    })
  })

  // ===========================================================================
  // Workspace Level - Role Hierarchy
  // ===========================================================================

  describe('hasMinWorkspaceRole', () => {
    it('returns true when role equals required role', () => {
      expect(service.hasMinWorkspaceRole('VIEWER', 'VIEWER')).toBe(true)
      expect(service.hasMinWorkspaceRole('MEMBER', 'MEMBER')).toBe(true)
      expect(service.hasMinWorkspaceRole('ADMIN', 'ADMIN')).toBe(true)
      expect(service.hasMinWorkspaceRole('OWNER', 'OWNER')).toBe(true)
    })

    it('returns true when role is higher than required', () => {
      expect(service.hasMinWorkspaceRole('OWNER', 'VIEWER')).toBe(true)
      expect(service.hasMinWorkspaceRole('ADMIN', 'MEMBER')).toBe(true)
      expect(service.hasMinWorkspaceRole('MEMBER', 'VIEWER')).toBe(true)
    })

    it('returns false when role is lower than required', () => {
      expect(service.hasMinWorkspaceRole('VIEWER', 'MEMBER')).toBe(false)
      expect(service.hasMinWorkspaceRole('MEMBER', 'ADMIN')).toBe(false)
      expect(service.hasMinWorkspaceRole('ADMIN', 'OWNER')).toBe(false)
    })
  })

  // ===========================================================================
  // Workspace Level - Access Checks
  // ===========================================================================

  describe('canAccessWorkspace', () => {
    it('returns true for Super Admin even without membership', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' } as any)

      const result = await service.canAccessWorkspace(1, 1)

      expect(result).toBe(true)
    })

    it('returns true for workspace member', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: true },
      } as any)

      const result = await service.canAccessWorkspace(2, 1)

      expect(result).toBe(true)
    })

    it('returns false when workspace is deactivated', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: false },
      } as any)

      const result = await service.canAccessWorkspace(2, 1)

      expect(result).toBe(false)
    })

    it('returns false when user is not a member', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue(null)

      const result = await service.canAccessWorkspace(2, 1)

      expect(result).toBe(false)
    })
  })

  describe('getWorkspaceRole', () => {
    it('returns OWNER for Super Admin', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' } as any)

      const result = await service.getWorkspaceRole(1, 1)

      expect(result).toBe('OWNER')
    })

    it('returns actual role for workspace member', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'ADMIN',
        workspace: { isActive: true },
      } as any)

      const result = await service.getWorkspaceRole(2, 1)

      expect(result).toBe('ADMIN')
    })

    it('returns null for non-member', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue(null)

      const result = await service.getWorkspaceRole(2, 1)

      expect(result).toBeNull()
    })
  })

  describe('requireWorkspaceAccess', () => {
    it('returns access when user has sufficient role', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'ADMIN',
        workspace: { isActive: true },
      } as any)

      const result = await service.requireWorkspaceAccess(2, 1, 'MEMBER')

      expect(result).toEqual({
        workspaceId: 1,
        userId: 2,
        role: 'ADMIN',
      })
    })

    it('throws FORBIDDEN when no access', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue(null)

      await expect(service.requireWorkspaceAccess(2, 1, 'VIEWER')).rejects.toThrow(
        'do not have access'
      )
    })

    it('throws FORBIDDEN when role is insufficient', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'VIEWER',
        workspace: { isActive: true },
      } as any)

      await expect(service.requireWorkspaceAccess(2, 1, 'ADMIN')).rejects.toThrow(
        'requires ADMIN role'
      )
    })
  })

  // ===========================================================================
  // Project Level - Role Hierarchy
  // ===========================================================================

  describe('hasMinProjectRole', () => {
    it('returns true when role equals required role', () => {
      expect(service.hasMinProjectRole('VIEWER', 'VIEWER')).toBe(true)
      expect(service.hasMinProjectRole('MEMBER', 'MEMBER')).toBe(true)
      expect(service.hasMinProjectRole('MANAGER', 'MANAGER')).toBe(true)
      expect(service.hasMinProjectRole('OWNER', 'OWNER')).toBe(true)
    })

    it('returns true when role is higher than required', () => {
      expect(service.hasMinProjectRole('OWNER', 'VIEWER')).toBe(true)
      expect(service.hasMinProjectRole('MANAGER', 'MEMBER')).toBe(true)
    })

    it('returns false when role is lower than required', () => {
      expect(service.hasMinProjectRole('VIEWER', 'MEMBER')).toBe(false)
      expect(service.hasMinProjectRole('MEMBER', 'MANAGER')).toBe(false)
    })
  })

  // ===========================================================================
  // Project Level - Access Checks
  // ===========================================================================

  describe('canAccessProject', () => {
    it('returns true for public projects', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
        isPublic: true,
      } as any)

      const result = await service.canAccessProject(999, 1)

      expect(result).toBe(true)
    })

    it('returns true for workspace member', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
        isPublic: false,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: true },
      } as any)

      const result = await service.canAccessProject(2, 1)

      expect(result).toBe(true)
    })

    it('returns false for inactive project', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: false,
        isPublic: false,
      } as any)

      const result = await service.canAccessProject(2, 1)

      expect(result).toBe(false)
    })
  })

  describe('getProjectRole', () => {
    it('derives OWNER role from workspace OWNER', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'OWNER',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue(null)

      const result = await service.getProjectRole(2, 1)

      expect(result).toBe('OWNER')
    })

    it('derives MANAGER role from workspace ADMIN', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'ADMIN',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue(null)

      const result = await service.getProjectRole(2, 1)

      expect(result).toBe('MANAGER')
    })

    it('returns direct project role when higher than derived', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER', // Would derive to MEMBER
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue({
        role: 'MANAGER', // Higher than derived
      } as any)

      const result = await service.getProjectRole(2, 1)

      expect(result).toBe('MANAGER')
    })

    it('returns derived role when higher than direct', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'OWNER', // Would derive to OWNER
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue({
        role: 'MEMBER', // Lower than derived
      } as any)

      const result = await service.getProjectRole(2, 1)

      expect(result).toBe('OWNER')
    })
  })

  // ===========================================================================
  // Task Level
  // ===========================================================================

  describe('canAccessTask', () => {
    it('returns true when user can access project', async () => {
      mockedPrisma.task.findUnique.mockResolvedValue({
        projectId: 1,
        isActive: true,
      } as any)
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
        isPublic: true,
      } as any)

      const result = await service.canAccessTask(2, 1)

      expect(result).toBe(true)
    })

    it('returns false when task does not exist', async () => {
      mockedPrisma.task.findUnique.mockResolvedValue(null)

      const result = await service.canAccessTask(2, 999)

      expect(result).toBe(false)
    })
  })

  describe('canModifyTask', () => {
    it('returns true when user has MEMBER role or higher', async () => {
      mockedPrisma.task.findUnique.mockResolvedValue({
        projectId: 1,
      } as any)
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue(null)

      const result = await service.canModifyTask(2, 1)

      expect(result).toBe(true)
    })

    it('returns false when user has VIEWER role', async () => {
      mockedPrisma.task.findUnique.mockResolvedValue({
        projectId: 1,
      } as any)
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'VIEWER',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue(null)

      const result = await service.canModifyTask(2, 1)

      expect(result).toBe(false)
    })
  })

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  describe('canInviteToWorkspace', () => {
    it('returns true for ADMIN role', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'ADMIN',
        workspace: { isActive: true },
      } as any)

      const result = await service.canInviteToWorkspace(2, 1)

      expect(result).toBe(true)
    })

    it('returns false for MEMBER role', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: true },
      } as any)

      const result = await service.canInviteToWorkspace(2, 1)

      expect(result).toBe(false)
    })
  })

  describe('canDeleteWorkspace', () => {
    it('returns true only for OWNER', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'OWNER',
        workspace: { isActive: true },
      } as any)

      const result = await service.canDeleteWorkspace(2, 1)

      expect(result).toBe(true)
    })

    it('returns false for ADMIN', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'ADMIN',
        workspace: { isActive: true },
      } as any)

      const result = await service.canDeleteWorkspace(2, 1)

      expect(result).toBe(false)
    })
  })

  describe('canDeleteProject', () => {
    it('returns true for workspace OWNER', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'OWNER',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue(null)

      const result = await service.canDeleteProject(2, 1)

      expect(result).toBe(true)
    })

    it('returns true for project OWNER when not workspace ADMIN', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      } as any)

      const result = await service.canDeleteProject(2, 1)

      expect(result).toBe(true)
    })

    it('returns false for project MANAGER', async () => {
      mockedPrisma.project.findUnique.mockResolvedValue({
        workspaceId: 1,
        isActive: true,
      } as any)
      mockedPrisma.user.findUnique.mockResolvedValue({ role: 'USER' } as any)
      mockedPrisma.workspaceUser.findUnique.mockResolvedValue({
        role: 'MEMBER',
        workspace: { isActive: true },
      } as any)
      mockedPrisma.projectMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      } as any)

      const result = await service.canDeleteProject(2, 1)

      expect(result).toBe(false)
    })
  })
})
