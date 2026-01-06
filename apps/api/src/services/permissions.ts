/*
 * PermissionService - Centrale permissie service
 * Version: 1.0.0
 *
 * Centrale service voor ALLE permissie checks in de multi-tenant architectuur.
 * Dit is het fundament waarop alle andere authorization features bouwen.
 *
 * Architectuur:
 * - Platform niveau: AppRole (ADMIN, MANAGER, USER)
 * - Workspace niveau: WorkspaceRole (OWNER, ADMIN, MEMBER, VIEWER)
 * - Project niveau: ProjectRole (OWNER, MANAGER, MEMBER, VIEWER)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 257 - PermissionService
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 * =============================================================================
 */

import { TRPCError } from '@trpc/server'
import { AppRole, WorkspaceRole, ProjectRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { groupPermissionService } from './groupPermissions'

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
   * Returns true if user is:
   * - A Super Admin (AppRole.ADMIN)
   * - A Domain Admin (member of "Domain Admins" group)
   * - A direct workspace member (WorkspaceUser table)
   * - A group-based workspace member (WORKSPACE or WORKSPACE_ADMIN group)
   */
  async canAccessWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    // Super Admins can access all workspaces
    if (await this.isSuperAdminById(userId)) {
      return true
    }

    // Domain Admins can access all workspaces
    if (await groupPermissionService.isDomainAdmin(userId)) {
      return true
    }

    // Check workspace is active
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { isActive: true },
    })
    if (!workspace?.isActive) {
      return false
    }

    // Check direct membership (WorkspaceUser table)
    const directMembership = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    })
    if (directMembership) {
      return true
    }

    // Check group-based membership (WORKSPACE or WORKSPACE_ADMIN groups)
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          workspaceId,
          type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
          isActive: true,
        },
      },
    })

    return groupMembership !== null
  }

  /**
   * Get a user's role in a workspace.
   * Returns null if no access.
   * Role priority: OWNER (Super Admin/Domain Admin) > direct role > group role
   * - Super Admins: OWNER
   * - Domain Admins: ADMIN (they have admin access to all workspaces)
   * - Direct membership: role from WorkspaceUser table (OWNER converted to ADMIN)
   * - Group membership: ADMIN (WORKSPACE_ADMIN) or MEMBER (WORKSPACE)
   */
  async getWorkspaceRole(
    userId: number,
    workspaceId: number
  ): Promise<WorkspaceRole | null> {
    // Super Admins have effective OWNER access
    if (await this.isSuperAdminById(userId)) {
      return 'OWNER'
    }

    // Domain Admins have ADMIN access to all workspaces
    if (await groupPermissionService.isDomainAdmin(userId)) {
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

    // Check direct membership
    const directMembership = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    })

    let directRole: WorkspaceRole | null = null
    if (directMembership) {
      // Convert OWNER to ADMIN (OWNER no longer exists for workspaces)
      directRole = directMembership.role === 'OWNER' ? 'ADMIN' : directMembership.role
    }

    // Check group-based membership
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          workspaceId,
          type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
          isActive: true,
        },
      },
      include: {
        group: { select: { type: true } },
      },
    })

    let groupRole: WorkspaceRole | null = null
    if (groupMembership) {
      groupRole = groupMembership.group.type === 'WORKSPACE_ADMIN' ? 'ADMIN' : 'MEMBER'
    }

    // Return highest role
    if (!directRole && !groupRole) {
      return null
    }
    if (!directRole) {
      return groupRole
    }
    if (!groupRole) {
      return directRole
    }

    // Compare and return highest
    return WORKSPACE_ROLE_HIERARCHY[directRole] >= WORKSPACE_ROLE_HIERARCHY[groupRole]
      ? directRole
      : groupRole
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
   * Includes:
   * - All workspaces for Super Admins
   * - All workspaces for Domain Admins
   * - Direct memberships (WorkspaceUser table)
   * - Group-based memberships (WORKSPACE and WORKSPACE_ADMIN groups)
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

    // Super Admins see all workspaces with OWNER role
    if (user.role === 'ADMIN') {
      const workspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
      return workspaces.map((ws) => ({ ...ws, role: 'OWNER' as WorkspaceRole }))
    }

    // Domain Admins see all workspaces with ADMIN role
    const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId)
    if (isDomainAdmin) {
      const workspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
      return workspaces.map((ws) => ({ ...ws, role: 'ADMIN' as WorkspaceRole }))
    }

    // Build a map of workspace -> role (to combine direct and group memberships)
    const workspaceMap = new Map<number, {
      id: number
      name: string
      slug: string
      role: WorkspaceRole
    }>()

    // Get direct memberships
    const directMemberships = await prisma.workspaceUser.findMany({
      where: {
        userId,
        workspace: { isActive: true },
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    for (const m of directMemberships) {
      // Convert OWNER to ADMIN (OWNER no longer exists for workspaces)
      const role = m.role === 'OWNER' ? 'ADMIN' : m.role
      workspaceMap.set(m.workspace.id, {
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role,
      })
    }

    // Get group-based memberships
    const groupMemberships = await prisma.groupMember.findMany({
      where: {
        userId,
        group: {
          type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
          isActive: true,
          workspace: { isActive: true },
        },
      },
      include: {
        group: {
          select: {
            type: true,
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    })

    for (const gm of groupMemberships) {
      if (!gm.group.workspace) continue

      const ws = gm.group.workspace
      const groupRole: WorkspaceRole = gm.group.type === 'WORKSPACE_ADMIN' ? 'ADMIN' : 'MEMBER'
      const existing = workspaceMap.get(ws.id)

      if (!existing) {
        workspaceMap.set(ws.id, {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          role: groupRole,
        })
      } else if (WORKSPACE_ROLE_HIERARCHY[groupRole] > WORKSPACE_ROLE_HIERARCHY[existing.role]) {
        // Upgrade role if group role is higher
        existing.role = groupRole
      }
    }

    // Convert to array and sort by name
    return Array.from(workspaceMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // ===========================================================================
  // Project Level
  // ===========================================================================

  /**
   * Check if a user can access a project.
   * Access is granted if:
   * - User is a Super Admin
   * - User is a workspace member (workspace membership grants project access)
   * - User is a project member
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

    // Public projects are accessible to all
    if (project.isPublic) {
      return true
    }

    // Check workspace access (this includes Super Admin check)
    return this.canAccessWorkspace(userId, project.workspaceId)
  }

  /**
   * Get a user's role in a project.
   * Returns the highest role between:
   * - Direct project membership
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

    // Check workspace role first
    const workspaceRole = await this.getWorkspaceRole(userId, project.workspaceId)
    if (!workspaceRole) {
      return null
    }

    // Check direct project membership
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
      select: { role: true },
    })

    // Derive project role from workspace role
    let derivedRole: ProjectRole | null = null
    if (workspaceRole === 'OWNER') {
      derivedRole = 'OWNER'
    } else if (workspaceRole === 'ADMIN') {
      derivedRole = 'MANAGER'
    } else if (workspaceRole === 'MEMBER') {
      derivedRole = 'MEMBER'
    } else if (workspaceRole === 'VIEWER') {
      derivedRole = 'VIEWER'
    }

    // Return the highest role
    if (!projectMember) {
      return derivedRole
    }

    if (!derivedRole) {
      return projectMember.role
    }

    // Compare and return highest
    const memberLevel = PROJECT_ROLE_HIERARCHY[projectMember.role]
    const derivedLevel = PROJECT_ROLE_HIERARCHY[derivedRole]
    return memberLevel >= derivedLevel ? projectMember.role : derivedRole
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
    // First check workspace access
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

    // Get user's project memberships
    const memberships = await prisma.projectMember.findMany({
      where: {
        userId,
        projectId: { in: projects.map((p) => p.id) },
      },
      select: {
        projectId: true,
        role: true,
      },
    })

    const membershipMap = new Map(memberships.map((m) => [m.projectId, m.role]))

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
      const memberRole = membershipMap.get(p.id)
      let effectiveRole = derivedRole

      if (memberRole) {
        const memberLevel = PROJECT_ROLE_HIERARCHY[memberRole]
        const derivedLevel = PROJECT_ROLE_HIERARCHY[derivedRole]
        effectiveRole = memberLevel >= derivedLevel ? memberRole : derivedRole
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
