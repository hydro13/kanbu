/*
 * GroupPermissionService - AD-Style Group Permission Service
 * Version: 1.0.0
 *
 * Permission service using AD-style groups for LDAP-compatible authorization.
 * This service checks group memberships for permissions instead of direct role assignments.
 *
 * Group naming conventions:
 * - "Domain Admins" - System administrators (SYSTEM type)
 * - "workspace-{slug}" - Workspace members (WORKSPACE type)
 * - "workspace-{slug}-admins" - Workspace administrators (WORKSPACE_ADMIN type)
 * - "project-{identifier}" - Project members (PROJECT type)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-05
 * =============================================================================
 */

import { TRPCError } from '@trpc/server'
import { GroupType, ProjectRole, WorkspaceRole, AccessType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import * as roleAssignmentService from './roleAssignmentService'

// =============================================================================
// Types
// =============================================================================

export interface GroupMembership {
  groupId: number
  groupName: string
  groupType: GroupType
  displayName: string
  workspaceId: number | null
  projectId: number | null
}

export interface GroupWorkspaceAccess {
  workspaceId: number
  userId: number
  isAdmin: boolean
  isMember: boolean
  effectiveRole: WorkspaceRole
}

export interface GroupProjectAccess {
  projectId: number
  userId: number
  workspaceId: number
  isAdmin: boolean
  isMember: boolean
  effectiveRole: ProjectRole
}

export interface PermissionCheck {
  permissionName: string
  accessType: AccessType
  groupId: number
  groupName: string
  inherited: boolean
}

export interface EffectivePermission {
  permissionName: string
  allowed: boolean
  reason: 'ALLOW' | 'DENY' | 'NOT_GRANTED'
  grantedBy?: string
}

// =============================================================================
// GroupPermissionService Class
// =============================================================================

export class GroupPermissionService {
  // ===========================================================================
  // Group Membership Queries
  // ===========================================================================

  /**
   * Get all group memberships for a user.
   */
  async getUserGroups(userId: number): Promise<GroupMembership[]> {
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId,
        group: { isActive: true },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            workspaceId: true,
            projectId: true,
          },
        },
      },
    })

    return memberships.map((m) => ({
      groupId: m.group.id,
      groupName: m.group.name,
      groupType: m.group.type,
      displayName: m.group.displayName,
      workspaceId: m.group.workspaceId,
      projectId: m.group.projectId,
    }))
  }

  /**
   * Check if a user is a member of a specific group.
   */
  async isMemberOfGroup(userId: number, groupName: string): Promise<boolean> {
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          name: groupName,
          isActive: true,
        },
      },
    })

    return membership !== null
  }

  /**
   * Check if a user is a member of any group of a specific type.
   */
  async isMemberOfGroupType(userId: number, groupType: GroupType): Promise<boolean> {
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          type: groupType,
          isActive: true,
        },
      },
    })

    return membership !== null
  }

  // ===========================================================================
  // System Level - Domain Admins
  // ===========================================================================

  /**
   * Check if a user is a Domain Admin (member of "Domain Admins" group).
   * Domain Admins have full access to all workspaces and projects.
   */
  async isDomainAdmin(userId: number): Promise<boolean> {
    return this.isMemberOfGroup(userId, 'Domain Admins')
  }

  /**
   * Batch check which users are Domain Admins.
   * Optimized for listing many users without N+1 queries.
   * Returns a Set of user IDs that are Domain Admins.
   */
  async getDomainAdminUserIds(userIds: number[]): Promise<Set<number>> {
    if (userIds.length === 0) {
      return new Set()
    }

    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: { in: userIds },
        group: {
          name: 'Domain Admins',
          isActive: true,
        },
      },
      select: { userId: true },
    })

    return new Set(memberships.map((m) => m.userId))
  }

  /**
   * Require Domain Admin privileges.
   * Throws FORBIDDEN if user is not a Domain Admin.
   */
  async requireDomainAdmin(userId: number): Promise<void> {
    const isAdmin = await this.isDomainAdmin(userId)
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This action requires Domain Admin privileges',
      })
    }
  }

  // ===========================================================================
  // Workspace Level
  // ===========================================================================

  /**
   * Get workspace group name from workspace slug.
   */
  getWorkspaceGroupName(workspaceSlug: string): string {
    return `workspace-${workspaceSlug}`
  }

  /**
   * Get workspace admin group name from workspace slug.
   */
  getWorkspaceAdminGroupName(workspaceSlug: string): string {
    return `workspace-${workspaceSlug}-admins`
  }

  /**
   * Check if a user can access a workspace through groups.
   * Returns true if user is:
   * - A Domain Admin
   * - A member of "workspace-{slug}" group
   * - A member of "workspace-{slug}-admins" group
   * - A member of a security group with a role assignment for this workspace
   */
  async canAccessWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    // Domain Admins can access all workspaces
    if (await this.isDomainAdmin(userId)) {
      return true
    }

    // Check workspace membership groups
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          workspaceId,
          type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
          isActive: true,
        },
      },
    })

    if (membership) {
      return true
    }

    // Check role assignments via security groups
    const roleViaGroups = await roleAssignmentService.getUserWorkspaceRoleViaGroups(userId, workspaceId)
    return roleViaGroups.role !== null
  }

  /**
   * Check if a user is a workspace admin through groups.
   * Returns true if user is:
   * - A Domain Admin
   * - A member of workspace-admins group
   * - A member of a security group with ADMIN or OWNER role assignment
   */
  async isWorkspaceAdmin(userId: number, workspaceId: number): Promise<boolean> {
    // Domain Admins are admins of all workspaces
    if (await this.isDomainAdmin(userId)) {
      return true
    }

    // Check workspace admin group membership
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          workspaceId,
          type: 'WORKSPACE_ADMIN',
          isActive: true,
        },
      },
    })

    if (membership) {
      return true
    }

    // Check role assignments via security groups
    const roleViaGroups = await roleAssignmentService.getUserWorkspaceRoleViaGroups(userId, workspaceId)
    return roleAssignmentService.roleIsAtLeast(roleViaGroups.role, 'ADMIN')
  }

  /**
   * Get workspace access details through groups.
   * Includes both auto-groups and security group role assignments.
   */
  async getWorkspaceAccess(
    userId: number,
    workspaceId: number
  ): Promise<GroupWorkspaceAccess | null> {
    // Check Domain Admin first
    const isDomainAdmin = await this.isDomainAdmin(userId)
    if (isDomainAdmin) {
      return {
        workspaceId,
        userId,
        isAdmin: true,
        isMember: true,
        effectiveRole: 'OWNER',
      }
    }

    // Get workspace groups the user is a member of (auto-groups)
    const memberships = await prisma.groupMember.findMany({
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

    const isAdminViaAutoGroup = memberships.some((m) => m.group.type === 'WORKSPACE_ADMIN')
    const isMemberViaAutoGroup = memberships.some((m) => m.group.type === 'WORKSPACE')

    // Check role assignments via security groups
    const roleViaGroups = await roleAssignmentService.getUserWorkspaceRoleViaGroups(userId, workspaceId)
    const isAdminViaRoleAssignment = roleAssignmentService.roleIsAtLeast(roleViaGroups.role, 'ADMIN')
    const isMemberViaRoleAssignment = roleViaGroups.role !== null

    // No access at all
    if (!isMemberViaAutoGroup && !isAdminViaAutoGroup && !isMemberViaRoleAssignment) {
      return null
    }

    const isAdmin = isAdminViaAutoGroup || isAdminViaRoleAssignment
    const isMember = isMemberViaAutoGroup || isMemberViaRoleAssignment

    // Determine effective role (highest wins)
    let effectiveRole: WorkspaceRole = 'MEMBER'
    if (isAdmin) {
      effectiveRole = 'ADMIN'
    }
    // If role assignment gives OWNER, use that
    if (roleViaGroups.role === 'OWNER') {
      effectiveRole = 'OWNER'
    }

    return {
      workspaceId,
      userId,
      isAdmin,
      isMember: isMember || isAdmin, // Admins are implicitly members
      effectiveRole,
    }
  }

  /**
   * Require workspace access through groups.
   * Throws FORBIDDEN if user has no access.
   */
  async requireWorkspaceAccess(
    userId: number,
    workspaceId: number,
    requireAdmin: boolean = false
  ): Promise<GroupWorkspaceAccess> {
    const access = await this.getWorkspaceAccess(userId, workspaceId)

    if (!access) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this workspace',
      })
    }

    if (requireAdmin && !access.isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This action requires workspace administrator privileges',
      })
    }

    return access
  }

  /**
   * Get all workspaces a user can access through groups.
   * Includes both auto-groups and security group role assignments.
   */
  async getUserWorkspaces(userId: number): Promise<
    Array<{
      id: number
      name: string
      slug: string
      isAdmin: boolean
    }>
  > {
    // Check if Domain Admin (sees all workspaces)
    const isDomainAdmin = await this.isDomainAdmin(userId)
    if (isDomainAdmin) {
      const workspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
      return workspaces.map((ws) => ({ ...ws, isAdmin: true }))
    }

    // Aggregate by workspace
    const workspaceMap = new Map<
      number,
      { id: number; name: string; slug: string; isAdmin: boolean }
    >()

    // Get all workspace groups the user is a member of (auto-groups)
    const memberships = await prisma.groupMember.findMany({
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

    for (const m of memberships) {
      if (!m.group.workspace) continue

      const ws = m.group.workspace
      const existing = workspaceMap.get(ws.id)

      if (!existing) {
        workspaceMap.set(ws.id, {
          ...ws,
          isAdmin: m.group.type === 'WORKSPACE_ADMIN',
        })
      } else if (m.group.type === 'WORKSPACE_ADMIN') {
        existing.isAdmin = true
      }
    }

    // Also get workspaces via security group role assignments
    const workspacesViaRoleAssignments = await roleAssignmentService.getUserWorkspacesViaGroups(userId)
    for (const ws of workspacesViaRoleAssignments) {
      const existing = workspaceMap.get(ws.id)
      const isAdmin = roleAssignmentService.roleIsAtLeast(ws.roleViaGroup, 'ADMIN')

      if (!existing) {
        workspaceMap.set(ws.id, {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          isAdmin,
        })
      } else if (isAdmin && !existing.isAdmin) {
        existing.isAdmin = true
      }
    }

    return Array.from(workspaceMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }

  // ===========================================================================
  // Project Level
  // ===========================================================================

  /**
   * Get project group name from project identifier.
   */
  getProjectGroupName(projectIdentifier: string): string {
    return `project-${projectIdentifier.toLowerCase()}`
  }

  /**
   * Check if a user can access a project through groups.
   * Returns true if user is:
   * - A Domain Admin
   * - A workspace admin (access to all projects in workspace)
   * - A member of "project-{identifier}" group
   * - A member of a security group with role assignment for this project
   * - A member of a security group with inheriting role assignment for parent workspace
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

    // Domain Admins can access all projects
    if (await this.isDomainAdmin(userId)) {
      return true
    }

    // Workspace admins can access all projects in their workspace
    if (await this.isWorkspaceAdmin(userId, project.workspaceId)) {
      return true
    }

    // Check project group membership (auto-groups)
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          projectId,
          type: 'PROJECT',
          isActive: true,
        },
      },
    })

    if (membership) {
      return true
    }

    // Check role assignments via security groups (direct or inherited from workspace)
    const roleViaGroups = await roleAssignmentService.getUserProjectRoleViaGroups(userId, projectId)
    return roleViaGroups.role !== null
  }

  /**
   * Get project access details through groups.
   * Includes both auto-groups and security group role assignments.
   */
  async getProjectAccess(
    userId: number,
    projectId: number
  ): Promise<GroupProjectAccess | null> {
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

    // Check Domain Admin first
    const isDomainAdmin = await this.isDomainAdmin(userId)
    if (isDomainAdmin) {
      return {
        projectId,
        userId,
        workspaceId: project.workspaceId,
        isAdmin: true,
        isMember: true,
        effectiveRole: 'OWNER',
      }
    }

    // Check workspace admin access
    const isWsAdmin = await this.isWorkspaceAdmin(userId, project.workspaceId)
    if (isWsAdmin) {
      return {
        projectId,
        userId,
        workspaceId: project.workspaceId,
        isAdmin: true,
        isMember: true,
        effectiveRole: 'MANAGER',
      }
    }

    // Check project group membership (auto-groups)
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          projectId,
          type: 'PROJECT',
          isActive: true,
        },
      },
    })

    const isMemberViaAutoGroup = membership !== null

    // Check role assignments via security groups
    const roleViaGroups = await roleAssignmentService.getUserProjectRoleViaGroups(userId, projectId)
    const isMemberViaRoleAssignment = roleViaGroups.role !== null
    const isAdminViaRoleAssignment = roleAssignmentService.roleIsAtLeast(roleViaGroups.role, 'ADMIN')

    // No access at all
    if (!isMemberViaAutoGroup && !isMemberViaRoleAssignment) {
      return null
    }

    // Determine effective role
    let effectiveRole: ProjectRole = 'MEMBER'
    if (isAdminViaRoleAssignment) {
      effectiveRole = 'MANAGER'
    }
    if (roleViaGroups.role === 'OWNER') {
      effectiveRole = 'OWNER'
    }

    return {
      projectId,
      userId,
      workspaceId: project.workspaceId,
      isAdmin: isAdminViaRoleAssignment,
      isMember: true,
      effectiveRole,
    }
  }

  /**
   * Require project access through groups.
   * Throws FORBIDDEN if user has no access.
   */
  async requireProjectAccess(
    userId: number,
    projectId: number,
    requireAdmin: boolean = false
  ): Promise<GroupProjectAccess> {
    const access = await this.getProjectAccess(userId, projectId)

    if (!access) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
      })
    }

    if (requireAdmin && !access.isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This action requires project administrator privileges',
      })
    }

    return access
  }

  /**
   * Get all projects a user can access in a workspace through groups.
   */
  async getUserProjects(
    userId: number,
    workspaceId: number
  ): Promise<
    Array<{
      id: number
      name: string
      identifier: string | null
      isAdmin: boolean
    }>
  > {
    // Check if workspace admin (sees all projects)
    const isWsAdmin =
      (await this.isDomainAdmin(userId)) ||
      (await this.isWorkspaceAdmin(userId, workspaceId))

    if (isWsAdmin) {
      const projects = await prisma.project.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        select: { id: true, name: true, identifier: true },
        orderBy: { name: 'asc' },
      })
      return projects.map((p) => ({ ...p, isAdmin: true }))
    }

    // Get all project groups the user is a member of in this workspace
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId,
        group: {
          workspaceId,
          type: 'PROJECT',
          isActive: true,
          project: { isActive: true },
        },
      },
      include: {
        group: {
          select: {
            project: {
              select: { id: true, name: true, identifier: true },
            },
          },
        },
      },
    })

    return memberships
      .filter((m) => m.group.project !== null)
      .map((m) => ({
        id: m.group.project!.id,
        name: m.group.project!.name,
        identifier: m.group.project!.identifier,
        isAdmin: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // ===========================================================================
  // Group Management
  // ===========================================================================

  /**
   * Create workspace groups for a new workspace.
   * Creates both "workspace-{slug}" and "workspace-{slug}-admins" groups.
   */
  async createWorkspaceGroups(
    workspaceId: number,
    workspaceSlug: string,
    workspaceName: string
  ): Promise<{ memberGroupId: number; adminGroupId: number }> {
    const [memberGroup, adminGroup] = await prisma.$transaction([
      prisma.group.create({
        data: {
          name: this.getWorkspaceGroupName(workspaceSlug),
          displayName: `Workspace: ${workspaceName}`,
          description: `Members of workspace ${workspaceName}`,
          type: 'WORKSPACE',
          workspaceId,
          isSystem: false,
          isActive: true,
        },
      }),
      prisma.group.create({
        data: {
          name: this.getWorkspaceAdminGroupName(workspaceSlug),
          displayName: `Workspace Admins: ${workspaceName}`,
          description: `Administrators of workspace ${workspaceName}`,
          type: 'WORKSPACE_ADMIN',
          workspaceId,
          isSystem: false,
          isActive: true,
        },
      }),
    ])

    return {
      memberGroupId: memberGroup.id,
      adminGroupId: adminGroup.id,
    }
  }

  /**
   * Create project group for a new project.
   */
  async createProjectGroup(
    projectId: number,
    workspaceId: number,
    projectIdentifier: string,
    projectName: string
  ): Promise<number> {
    const group = await prisma.group.create({
      data: {
        name: this.getProjectGroupName(projectIdentifier),
        displayName: `Project: ${projectName}`,
        description: `Members of project ${projectName}`,
        type: 'PROJECT',
        workspaceId,
        projectId,
        isSystem: false,
        isActive: true,
      },
    })

    return group.id
  }

  /**
   * Add a user to a group.
   */
  async addUserToGroup(
    userId: number,
    groupId: number,
    addedById?: number
  ): Promise<void> {
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: { groupId, userId },
      },
      update: {},
      create: {
        groupId,
        userId,
        addedById,
        externalSync: false,
      },
    })
  }

  /**
   * Remove a user from a group.
   */
  async removeUserFromGroup(userId: number, groupId: number): Promise<void> {
    await prisma.groupMember.deleteMany({
      where: { groupId, userId },
    })
  }

  /**
   * Add a user to workspace groups.
   * If isAdmin is true, adds to both member and admin groups.
   */
  async addUserToWorkspace(
    userId: number,
    workspaceId: number,
    isAdmin: boolean,
    addedById?: number
  ): Promise<void> {
    // Get workspace groups
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
        isActive: true,
      },
      select: { id: true, type: true },
    })

    const memberGroup = groups.find((g) => g.type === 'WORKSPACE')
    const adminGroup = groups.find((g) => g.type === 'WORKSPACE_ADMIN')

    // Add to member group
    if (memberGroup) {
      await this.addUserToGroup(userId, memberGroup.id, addedById)
    }

    // Add to admin group if isAdmin
    if (isAdmin && adminGroup) {
      await this.addUserToGroup(userId, adminGroup.id, addedById)
    }
  }

  /**
   * Add a user to a project group.
   */
  async addUserToProject(
    userId: number,
    projectId: number,
    addedById?: number
  ): Promise<void> {
    const group = await prisma.group.findFirst({
      where: {
        projectId,
        type: 'PROJECT',
        isActive: true,
      },
      select: { id: true },
    })

    if (group) {
      await this.addUserToGroup(userId, group.id, addedById)
    }
  }

  /**
   * Remove a user from workspace groups (both member and admin).
   */
  async removeUserFromWorkspace(
    userId: number,
    workspaceId: number
  ): Promise<void> {
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
        isActive: true,
      },
      select: { id: true },
    })

    for (const group of groups) {
      await this.removeUserFromGroup(userId, group.id)
    }
  }

  /**
   * Remove a user from a project group.
   */
  async removeUserFromProject(
    userId: number,
    projectId: number
  ): Promise<void> {
    const group = await prisma.group.findFirst({
      where: {
        projectId,
        type: 'PROJECT',
        isActive: true,
      },
      select: { id: true },
    })

    if (group) {
      await this.removeUserFromGroup(userId, group.id)
    }
  }

  // ===========================================================================
  // Permission Checking (Allow/Deny System)
  // ===========================================================================

  /**
   * Get all permission grants for a user (from all their groups).
   * This includes both ALLOW and DENY grants.
   */
  async getUserPermissionGrants(
    userId: number,
    workspaceId?: number,
    projectId?: number
  ): Promise<PermissionCheck[]> {
    // Get all groups the user is a member of
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId,
        group: { isActive: true },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { groupId: true },
    })

    const groupIds = memberships.map((m) => m.groupId)

    if (groupIds.length === 0) {
      return []
    }

    // Get all permissions from these groups
    const permissions = await prisma.groupPermission.findMany({
      where: {
        groupId: { in: groupIds },
        // Filter by scope if specified
        OR: [
          // Global permissions (no scope restriction)
          { workspaceId: null, projectId: null },
          // Workspace-specific permissions
          ...(workspaceId ? [{ workspaceId, projectId: null }] : []),
          // Project-specific permissions
          ...(projectId ? [{ projectId }] : []),
        ],
      },
      include: {
        permission: { select: { name: true } },
        group: { select: { name: true } },
      },
    })

    return permissions.map((p) => ({
      permissionName: p.permission.name,
      accessType: p.accessType,
      groupId: p.groupId,
      groupName: p.group.name,
      inherited: p.inherited,
    }))
  }

  /**
   * Check if a user has a specific permission.
   * DENY always overrides ALLOW (Windows-style).
   */
  async hasPermission(
    userId: number,
    permissionName: string,
    workspaceId?: number,
    projectId?: number
  ): Promise<boolean> {
    const effective = await this.getEffectivePermission(
      userId,
      permissionName,
      workspaceId,
      projectId
    )
    return effective.allowed
  }

  /**
   * Get the effective permission for a user with full details.
   * Implements DENY-overrides-ALLOW logic.
   */
  async getEffectivePermission(
    userId: number,
    permissionName: string,
    workspaceId?: number,
    projectId?: number
  ): Promise<EffectivePermission> {
    const grants = await this.getUserPermissionGrants(userId, workspaceId, projectId)

    // Filter to this permission (including parent permissions for inheritance)
    const relevantGrants = grants.filter(
      (g) =>
        g.permissionName === permissionName ||
        permissionName.startsWith(g.permissionName + '.')
    )

    if (relevantGrants.length === 0) {
      return {
        permissionName,
        allowed: false,
        reason: 'NOT_GRANTED',
      }
    }

    // Check for DENY first (DENY always wins)
    const denyGrant = relevantGrants.find((g) => g.accessType === 'DENY')
    if (denyGrant) {
      return {
        permissionName,
        allowed: false,
        reason: 'DENY',
        grantedBy: denyGrant.groupName,
      }
    }

    // Check for ALLOW
    const allowGrant = relevantGrants.find((g) => g.accessType === 'ALLOW')
    if (allowGrant) {
      return {
        permissionName,
        allowed: true,
        reason: 'ALLOW',
        grantedBy: allowGrant.groupName,
      }
    }

    return {
      permissionName,
      allowed: false,
      reason: 'NOT_GRANTED',
    }
  }

  /**
   * Get all effective permissions for a user.
   */
  async getUserEffectivePermissions(
    userId: number,
    workspaceId?: number,
    projectId?: number
  ): Promise<EffectivePermission[]> {
    // Get all permission definitions
    const allPermissions = await prisma.permission.findMany({
      select: { name: true },
      orderBy: { sortOrder: 'asc' },
    })

    // Get grants for this user
    const grants = await this.getUserPermissionGrants(userId, workspaceId, projectId)

    return allPermissions.map((perm) => {
      // Filter grants relevant to this permission
      const relevantGrants = grants.filter(
        (g) =>
          g.permissionName === perm.name ||
          perm.name.startsWith(g.permissionName + '.')
      )

      if (relevantGrants.length === 0) {
        return {
          permissionName: perm.name,
          allowed: false,
          reason: 'NOT_GRANTED' as const,
        }
      }

      // DENY always wins
      const denyGrant = relevantGrants.find((g) => g.accessType === 'DENY')
      if (denyGrant) {
        return {
          permissionName: perm.name,
          allowed: false,
          reason: 'DENY' as const,
          grantedBy: denyGrant.groupName,
        }
      }

      const allowGrant = relevantGrants.find((g) => g.accessType === 'ALLOW')
      if (allowGrant) {
        return {
          permissionName: perm.name,
          allowed: true,
          reason: 'ALLOW' as const,
          grantedBy: allowGrant.groupName,
        }
      }

      return {
        permissionName: perm.name,
        allowed: false,
        reason: 'NOT_GRANTED' as const,
      }
    })
  }

  /**
   * Require a specific permission.
   * Throws FORBIDDEN if user doesn't have the permission.
   */
  async requirePermission(
    userId: number,
    permissionName: string,
    workspaceId?: number,
    projectId?: number
  ): Promise<void> {
    const effective = await this.getEffectivePermission(
      userId,
      permissionName,
      workspaceId,
      projectId
    )

    if (!effective.allowed) {
      const message =
        effective.reason === 'DENY'
          ? `Permission '${permissionName}' is explicitly denied`
          : `Permission '${permissionName}' is not granted`

      throw new TRPCError({
        code: 'FORBIDDEN',
        message,
      })
    }
  }

  /**
   * Check multiple permissions at once.
   * Returns true only if ALL permissions are granted.
   */
  async hasAllPermissions(
    userId: number,
    permissionNames: string[],
    workspaceId?: number,
    projectId?: number
  ): Promise<boolean> {
    for (const permName of permissionNames) {
      const has = await this.hasPermission(userId, permName, workspaceId, projectId)
      if (!has) return false
    }
    return true
  }

  /**
   * Check multiple permissions at once.
   * Returns true if ANY permission is granted.
   */
  async hasAnyPermission(
    userId: number,
    permissionNames: string[],
    workspaceId?: number,
    projectId?: number
  ): Promise<boolean> {
    for (const permName of permissionNames) {
      const has = await this.hasPermission(userId, permName, workspaceId, projectId)
      if (has) return true
    }
    return false
  }

  // ===========================================================================
  // Permission Management
  // ===========================================================================

  /**
   * Grant a permission to a group.
   */
  async grantPermission(
    groupId: number,
    permissionName: string,
    accessType: AccessType = 'ALLOW',
    workspaceId?: number,
    projectId?: number,
    createdById?: number
  ): Promise<void> {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    })

    if (!permission) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Permission '${permissionName}' not found`,
      })
    }

    // Check if already exists
    const existing = await prisma.groupPermission.findFirst({
      where: {
        groupId,
        permissionId: permission.id,
        workspaceId: workspaceId ?? null,
        projectId: projectId ?? null,
      },
    })

    if (existing) {
      // Update access type if different
      if (existing.accessType !== accessType) {
        await prisma.groupPermission.update({
          where: { id: existing.id },
          data: { accessType },
        })
      }
    } else {
      await prisma.groupPermission.create({
        data: {
          groupId,
          permissionId: permission.id,
          accessType,
          workspaceId,
          projectId,
          createdById,
          inherited: false,
        },
      })
    }
  }

  /**
   * Revoke a permission from a group.
   */
  async revokePermission(
    groupId: number,
    permissionName: string,
    workspaceId?: number,
    projectId?: number
  ): Promise<void> {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    })

    if (!permission) {
      return // Permission doesn't exist, nothing to revoke
    }

    await prisma.groupPermission.deleteMany({
      where: {
        groupId,
        permissionId: permission.id,
        workspaceId: workspaceId ?? null,
        projectId: projectId ?? null,
      },
    })
  }

  /**
   * Get all permissions granted to a group.
   */
  async getGroupPermissions(
    groupId: number
  ): Promise<Array<{ permission: string; accessType: AccessType }>> {
    const permissions = await prisma.groupPermission.findMany({
      where: { groupId },
      include: {
        permission: { select: { name: true } },
      },
    })

    return permissions.map((p) => ({
      permission: p.permission.name,
      accessType: p.accessType,
    }))
  }

  /**
   * Set permissions for a group (replace all).
   */
  async setGroupPermissions(
    groupId: number,
    permissions: Array<{ name: string; accessType: AccessType }>,
    workspaceId?: number,
    projectId?: number,
    createdById?: number
  ): Promise<void> {
    // Get permission IDs
    const permissionRecords = await prisma.permission.findMany({
      where: { name: { in: permissions.map((p) => p.name) } },
    })

    const permissionMap = new Map(permissionRecords.map((p) => [p.name, p.id]))

    // Delete existing permissions for this scope
    await prisma.groupPermission.deleteMany({
      where: {
        groupId,
        workspaceId: workspaceId ?? null,
        projectId: projectId ?? null,
      },
    })

    // Create new permissions
    const data = permissions
      .filter((p) => permissionMap.has(p.name))
      .map((p) => ({
        groupId,
        permissionId: permissionMap.get(p.name)!,
        accessType: p.accessType,
        workspaceId,
        projectId,
        createdById,
        inherited: false,
      }))

    if (data.length > 0) {
      await prisma.groupPermission.createMany({ data })
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of GroupPermissionService.
 * Use this for all group-based permission checks across the application.
 */
export const groupPermissionService = new GroupPermissionService()
