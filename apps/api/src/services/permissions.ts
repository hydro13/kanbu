/*
 * PermissionService - Centrale permissie service
 * Version: 2.0.0
 *
 * Centrale service voor ALLE permissie checks in de multi-tenant architectuur.
 * Dit is het fundament waarop alle andere authorization features bouwen.
 *
 * Architectuur:
 * - Platform niveau: AppRole (ADMIN, MANAGER, USER)
 * - Workspace niveau: WorkspaceRole (OWNER, ADMIN, MEMBER, VIEWER)
 * - Project niveau: ProjectRole (OWNER, MANAGER, MEMBER, VIEWER)
 *
 * NEW in v2.0.0: ACL-based permissions (NTFS/AD style)
 * - Uses filesystem-style ACL with bitmask permissions (RWXDP)
 * - Deny-first logic (like NTFS)
 * - Falls back to legacy role-based system during transition
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 257 - PermissionService
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 *
 * Modified: 2026-01-08
 * Change: Added ACL integration with fallback to legacy role system
 * =============================================================================
 */

import { TRPCError } from '@trpc/server'
import { AppRole, WorkspaceRole, ProjectRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { aclService, ACL_PERMISSIONS } from './aclService'

// =============================================================================
// Types
// =============================================================================

export interface WorkspaceAccess {
  workspaceId: number
  userId: number
  role: WorkspaceRole
}

export interface ProjectAccess {
  projectId: number
  userId: number
  role: ProjectRole
  workspaceId: number
  workspaceRole: WorkspaceRole
}

export interface UserWithRole {
  id: number
  role: AppRole
}

// Role hierarchies for permission checks
const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
  OWNER: 4,
}

// =============================================================================
// PermissionService Class
// =============================================================================

export class PermissionService {
  // ===========================================================================
  // Platform Level - Super Admin
  // ===========================================================================

  /**
   * Check if a user is a Super Admin (AppRole.ADMIN)
   * Super Admins can manage all workspaces, users, and system settings.
   */
  isSuperAdmin(appRole: AppRole): boolean {
    return appRole === 'ADMIN'
  }

  /**
   * Check if a user is a Super Admin by user ID.
   * Fetches the user from the database.
   */
  async isSuperAdminById(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    return user?.role === 'ADMIN'
  }

  /**
   * Require Super Admin privileges for an action.
   * Throws FORBIDDEN if user is not a Super Admin.
   */
  requireSuperAdmin(appRole: AppRole): void {
    if (!this.isSuperAdmin(appRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This action requires system administrator privileges',
      })
    }
  }

  // ===========================================================================
  // Workspace Level
  // ===========================================================================

  /**
   * Check if a user can access a workspace.
   * Uses ACL system exclusively (no legacy fallback).
   *
   * Returns true if user has access via:
   * 1. Super Admin (AppRole.ADMIN or admin ACL)
   * 2. ACL READ permission on workspace (user or group-based)
   */
  async canAccessWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    // Check workspace is active first
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { isActive: true },
    })
    if (!workspace?.isActive) {
      return false
    }

    // Super Admins (AppRole.ADMIN) can access all workspaces
    if (await this.isSuperAdminById(userId)) {
      return true
    }

    // Check if user has admin ACL (Super Admin via ACL)
    const hasAdminAcl = await aclService.hasPermission(userId, 'admin', null, ACL_PERMISSIONS.PERMISSIONS)
    if (hasAdminAcl) {
      return true
    }

    // Check ACL system for workspace access
    return aclService.hasPermission(userId, 'workspace', workspaceId, ACL_PERMISSIONS.READ)
  }

  /**
   * Get a user's role in a workspace.
   * Uses ACL system exclusively (no legacy fallback).
   * Returns null if no access.
   *
   * Role priority:
   * - Super Admins (AppRole.ADMIN): OWNER
   * - Admin ACL holders: ADMIN
   * - ACL permissions: P=ADMIN, W=MEMBER, R=VIEWER
   */
  async getWorkspaceRole(
    userId: number,
    workspaceId: number
  ): Promise<WorkspaceRole | null> {
    // Super Admins have effective OWNER access
    if (await this.isSuperAdminById(userId)) {
      return 'OWNER'
    }

    // Check if user has admin ACL (Super Admin via ACL)
    const hasAdminAcl = await aclService.hasPermission(userId, 'admin', null, ACL_PERMISSIONS.PERMISSIONS)
    if (hasAdminAcl) {
      return 'ADMIN'
    }

    // Check workspace is active
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { isActive: true },
    })
    if (!workspace?.isActive) {
      return null
    }

    // Check ACL-based access (user and group-based)
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const groupIds = userGroups.map((g) => g.groupId)

    const aclEntry = await prisma.aclEntry.findFirst({
      where: {
        resourceType: 'workspace',
        resourceId: workspaceId,
        deny: false,
        OR: [
          { principalType: 'user', principalId: userId },
          ...(groupIds.length > 0 ? [{ principalType: 'group', principalId: { in: groupIds } }] : []),
        ],
      },
      select: { permissions: true },
    })

    if (!aclEntry || (aclEntry.permissions & ACL_PERMISSIONS.READ) === 0) {
      return null
    }

    // Convert ACL permissions to workspace role
    if (aclEntry.permissions & ACL_PERMISSIONS.PERMISSIONS) {
      return 'ADMIN'
    } else if (aclEntry.permissions & ACL_PERMISSIONS.WRITE) {
      return 'MEMBER'
    } else {
      return 'VIEWER'
    }
  }

  /**
   * Get workspace access details including role.
   * Returns null if no access.
   */
  async getWorkspaceAccess(
    userId: number,
    workspaceId: number
  ): Promise<WorkspaceAccess | null> {
    const role = await this.getWorkspaceRole(userId, workspaceId)
    if (!role) {
      return null
    }

    return {
      workspaceId,
      userId,
      role,
    }
  }

  /**
   * Require workspace access with a minimum role.
   * Throws FORBIDDEN if access denied.
   */
  async requireWorkspaceAccess(
    userId: number,
    workspaceId: number,
    minRole: WorkspaceRole = 'VIEWER'
  ): Promise<WorkspaceAccess> {
    const access = await this.getWorkspaceAccess(userId, workspaceId)

    if (!access) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this workspace',
      })
    }

    if (!this.hasMinWorkspaceRole(access.role, minRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires ${minRole} role or higher`,
      })
    }

    return access
  }

  /**
   * Check if a workspace role meets the minimum requirement.
   */
  hasMinWorkspaceRole(userRole: WorkspaceRole, minRole: WorkspaceRole): boolean {
    return WORKSPACE_ROLE_HIERARCHY[userRole] >= WORKSPACE_ROLE_HIERARCHY[minRole]
  }

  /**
   * Get all workspaces a user has access to.
   * Uses ACL system exclusively (no legacy fallback).
   *
   * Includes:
   * - All workspaces for Super Admins (OWNER role)
   * - All workspaces for Admin ACL holders (ADMIN role)
   * - ACL-based access (user and group-based)
   */
  async getUserWorkspaces(userId: number): Promise<
    Array<{
      id: number
      name: string
      slug: string
      role: WorkspaceRole
    }>
  > {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      return []
    }

    // Super Admins (AppRole.ADMIN) see all workspaces with OWNER role
    if (user.role === 'ADMIN') {
      const workspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
      return workspaces.map((ws) => ({ ...ws, role: 'OWNER' as WorkspaceRole }))
    }

    // Check if user has admin ACL (Super Admin via ACL)
    const hasAdminAcl = await aclService.hasPermission(userId, 'admin', null, ACL_PERMISSIONS.PERMISSIONS)
    if (hasAdminAcl) {
      const workspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
      return workspaces.map((ws) => ({ ...ws, role: 'ADMIN' as WorkspaceRole }))
    }

    // Get ACL-based workspace access (user and group-based)
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const groupIds = userGroups.map((g) => g.groupId)

    const aclEntries = await prisma.aclEntry.findMany({
      where: {
        resourceType: 'workspace',
        resourceId: { not: null }, // Specific workspaces only
        deny: false, // Only allow entries
        OR: [
          { principalType: 'user', principalId: userId },
          ...(groupIds.length > 0 ? [{ principalType: 'group', principalId: { in: groupIds } }] : []),
        ],
      },
      select: {
        resourceId: true,
        permissions: true,
      },
    })

    // Filter to entries with READ permission
    const aclWorkspaceIds = aclEntries
      .filter((e) => e.resourceId !== null && (e.permissions & ACL_PERMISSIONS.READ) !== 0)
      .map((e) => e.resourceId as number)

    if (aclWorkspaceIds.length === 0) {
      return []
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        id: { in: aclWorkspaceIds },
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    })

    return workspaces.map((ws) => {
      // Determine role from ACL permissions
      const entry = aclEntries.find((e) => e.resourceId === ws.id)
      const perms = entry?.permissions ?? 0
      let role: WorkspaceRole = 'VIEWER'
      if (perms & ACL_PERMISSIONS.PERMISSIONS) {
        role = 'ADMIN' // Has P permission = admin level
      } else if (perms & ACL_PERMISSIONS.WRITE) {
        role = 'MEMBER' // Has W permission = member level
      }

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        role,
      }
    })
  }

  // ===========================================================================
  // Project Level
  // ===========================================================================

  /**
   * Check if a user can access a project.
   * Uses ACL system exclusively (no legacy fallback).
   *
   * Access is granted if:
   * 1. Project is public
   * 2. ACL READ permission on project
   * 3. Workspace access (workspace ACL grants project access via inheritance)
   */
  async canAccessProject(userId: number, projectId: number): Promise<boolean> {
    // Get project with workspace info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        isActive: true,
        isPublic: true,
      },
    })

    if (!project || !project.isActive) {
      return false
    }

    // Public projects are accessible to all authenticated users
    if (project.isPublic) {
      return true
    }

    // Check ACL system (includes inheritance from workspace)
    const hasAclAccess = await aclService.hasPermission(userId, 'project', projectId, ACL_PERMISSIONS.READ)
    if (hasAclAccess) {
      return true
    }

    // Workspace access grants project access (ACL-based)
    return this.canAccessWorkspace(userId, project.workspaceId)
  }

  /**
   * Get a user's role in a project.
   * Uses ACL system exclusively (no legacy fallback).
   *
   * Returns the highest role between:
   * - Project ACL entry (direct or via group)
   * - Derived from workspace role (workspace OWNER/ADMIN = project MANAGER)
   */
  async getProjectRole(
    userId: number,
    projectId: number
  ): Promise<ProjectRole | null> {
    // Get project with workspace info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        isActive: true,
      },
    })

    if (!project || !project.isActive) {
      return null
    }

    // Check workspace role first (ACL-based)
    const workspaceRole = await this.getWorkspaceRole(userId, project.workspaceId)
    if (!workspaceRole) {
      return null
    }

    // Check ACL entry for the project (user and group-based)
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const groupIds = userGroups.map((g) => g.groupId)

    const aclEntry = await prisma.aclEntry.findFirst({
      where: {
        resourceType: 'project',
        resourceId: projectId,
        deny: false,
        OR: [
          { principalType: 'user', principalId: userId },
          ...(groupIds.length > 0 ? [{ principalType: 'group', principalId: { in: groupIds } }] : []),
        ],
      },
      select: { permissions: true },
    })

    // Collect all applicable roles
    const roles: ProjectRole[] = []

    // Add role from project ACL if exists
    if (aclEntry && (aclEntry.permissions & ACL_PERMISSIONS.READ) !== 0) {
      if (aclEntry.permissions & ACL_PERMISSIONS.PERMISSIONS) {
        roles.push('OWNER') // Has P = owner
      } else if (aclEntry.permissions & ACL_PERMISSIONS.DELETE) {
        roles.push('MANAGER') // Has D = manager
      } else if (aclEntry.permissions & ACL_PERMISSIONS.WRITE) {
        roles.push('MEMBER') // Has W = member
      } else {
        roles.push('VIEWER') // Has R = viewer
      }
    }

    // Derive project role from workspace role
    let derivedRole: ProjectRole
    if (workspaceRole === 'OWNER') {
      derivedRole = 'OWNER'
    } else if (workspaceRole === 'ADMIN') {
      derivedRole = 'MANAGER'
    } else if (workspaceRole === 'MEMBER') {
      derivedRole = 'MEMBER'
    } else {
      derivedRole = 'VIEWER'
    }
    roles.push(derivedRole)

    // Return the highest role
    return roles.reduce((highest, current) => {
      const currentLevel = PROJECT_ROLE_HIERARCHY[current]
      const highestLevel = PROJECT_ROLE_HIERARCHY[highest]
      return currentLevel >= highestLevel ? current : highest
    })
  }

  /**
   * Get project access details including both project and workspace roles.
   */
  async getProjectAccess(
    userId: number,
    projectId: number
  ): Promise<ProjectAccess | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        isActive: true,
      },
    })

    if (!project || !project.isActive) {
      return null
    }

    const workspaceRole = await this.getWorkspaceRole(userId, project.workspaceId)
    if (!workspaceRole) {
      return null
    }

    const projectRole = await this.getProjectRole(userId, projectId)
    if (!projectRole) {
      return null
    }

    return {
      projectId,
      userId,
      role: projectRole,
      workspaceId: project.workspaceId,
      workspaceRole,
    }
  }

  /**
   * Require project access with a minimum role.
   * Throws FORBIDDEN if access denied.
   */
  async requireProjectAccess(
    userId: number,
    projectId: number,
    minRole: ProjectRole = 'VIEWER'
  ): Promise<ProjectAccess> {
    const access = await this.getProjectAccess(userId, projectId)

    if (!access) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
      })
    }

    if (!this.hasMinProjectRole(access.role, minRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires ${minRole} role or higher`,
      })
    }

    return access
  }

  /**
   * Check if a project role meets the minimum requirement.
   */
  hasMinProjectRole(userRole: ProjectRole, minRole: ProjectRole): boolean {
    return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[minRole]
  }

  /**
   * Get all projects a user has access to within a workspace.
   * Uses ACL system exclusively (no legacy fallback).
   */
  async getUserProjects(
    userId: number,
    workspaceId: number
  ): Promise<
    Array<{
      id: number
      name: string
      identifier: string | null
      role: ProjectRole
    }>
  > {
    // First check workspace access (ACL-based)
    const workspaceRole = await this.getWorkspaceRole(userId, workspaceId)
    if (!workspaceRole) {
      return []
    }

    // Get all projects in workspace
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        identifier: true,
      },
      orderBy: { name: 'asc' },
    })

    if (projects.length === 0) {
      return []
    }

    // Get user's groups for ACL checks
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const groupIds = userGroups.map((g) => g.groupId)

    // Get ACL entries for all projects
    const projectIds = projects.map((p) => p.id)
    const aclEntries = await prisma.aclEntry.findMany({
      where: {
        resourceType: 'project',
        resourceId: { in: projectIds },
        deny: false,
        OR: [
          { principalType: 'user', principalId: userId },
          ...(groupIds.length > 0 ? [{ principalType: 'group', principalId: { in: groupIds } }] : []),
        ],
      },
      select: {
        resourceId: true,
        permissions: true,
      },
    })

    const aclMap = new Map(aclEntries.map((e) => [e.resourceId, e.permissions]))

    // Derive project role from workspace role
    let derivedRole: ProjectRole
    if (workspaceRole === 'OWNER') {
      derivedRole = 'OWNER'
    } else if (workspaceRole === 'ADMIN') {
      derivedRole = 'MANAGER'
    } else if (workspaceRole === 'MEMBER') {
      derivedRole = 'MEMBER'
    } else {
      derivedRole = 'VIEWER'
    }

    return projects.map((p) => {
      const perms = aclMap.get(p.id)
      let aclRole: ProjectRole | null = null

      if (perms !== undefined && (perms & ACL_PERMISSIONS.READ) !== 0) {
        if (perms & ACL_PERMISSIONS.PERMISSIONS) {
          aclRole = 'OWNER'
        } else if (perms & ACL_PERMISSIONS.DELETE) {
          aclRole = 'MANAGER'
        } else if (perms & ACL_PERMISSIONS.WRITE) {
          aclRole = 'MEMBER'
        } else {
          aclRole = 'VIEWER'
        }
      }

      // Return highest role between ACL and derived
      let effectiveRole = derivedRole
      if (aclRole) {
        const aclLevel = PROJECT_ROLE_HIERARCHY[aclRole]
        const derivedLevel = PROJECT_ROLE_HIERARCHY[derivedRole]
        effectiveRole = aclLevel >= derivedLevel ? aclRole : derivedRole
      }

      return {
        id: p.id,
        name: p.name,
        identifier: p.identifier,
        role: effectiveRole,
      }
    })
  }

  // ===========================================================================
  // Task Level
  // ===========================================================================

  /**
   * Check if a user can access a task.
   * Task access is derived from project access.
   */
  async canAccessTask(userId: number, taskId: number): Promise<boolean> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, isActive: true },
    })

    if (!task) {
      return false
    }

    return this.canAccessProject(userId, task.projectId)
  }

  /**
   * Check if a user can modify a task.
   * Requires MEMBER role or higher in the project.
   */
  async canModifyTask(userId: number, taskId: number): Promise<boolean> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    })

    if (!task) {
      return false
    }

    const role = await this.getProjectRole(userId, task.projectId)
    if (!role) {
      return false
    }

    return this.hasMinProjectRole(role, 'MEMBER')
  }

  /**
   * Require task access with optional modify permission.
   */
  async requireTaskAccess(
    userId: number,
    taskId: number,
    requireModify: boolean = false
  ): Promise<{ projectAccess: ProjectAccess; taskId: number }> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, isActive: true },
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      })
    }

    const minRole: ProjectRole = requireModify ? 'MEMBER' : 'VIEWER'
    const projectAccess = await this.requireProjectAccess(userId, task.projectId, minRole)

    return { projectAccess, taskId }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Check if a user can invite others to a workspace.
   * Requires ADMIN role or higher.
   */
  async canInviteToWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    const role = await this.getWorkspaceRole(userId, workspaceId)
    if (!role) {
      return false
    }
    return this.hasMinWorkspaceRole(role, 'ADMIN')
  }

  /**
   * Check if a user can manage workspace settings.
   * Requires ADMIN role or higher.
   */
  async canManageWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    const role = await this.getWorkspaceRole(userId, workspaceId)
    if (!role) {
      return false
    }
    return this.hasMinWorkspaceRole(role, 'ADMIN')
  }

  /**
   * Check if a user can delete a workspace.
   * Only OWNER can delete.
   */
  async canDeleteWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    const role = await this.getWorkspaceRole(userId, workspaceId)
    return role === 'OWNER'
  }

  /**
   * Check if a user can manage project settings.
   * Requires MANAGER role or higher.
   */
  async canManageProject(userId: number, projectId: number): Promise<boolean> {
    const role = await this.getProjectRole(userId, projectId)
    if (!role) {
      return false
    }
    return this.hasMinProjectRole(role, 'MANAGER')
  }

  /**
   * Check if a user can delete a project.
   * Only project OWNER or workspace OWNER/ADMIN can delete.
   */
  async canDeleteProject(userId: number, projectId: number): Promise<boolean> {
    const access = await this.getProjectAccess(userId, projectId)
    if (!access) {
      return false
    }

    // Workspace OWNER/ADMIN can delete any project
    if (this.hasMinWorkspaceRole(access.workspaceRole, 'ADMIN')) {
      return true
    }

    // Project OWNER can delete their project
    return access.role === 'OWNER'
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of PermissionService.
 * Use this for all permission checks across the application.
 */
export const permissionService = new PermissionService()
