/*
 * ScopeService - User Scope Determination
 * Version: 1.0.0
 *
 * Determines what data a user can access based on their ACL permissions.
 * Used to filter queries and show only accessible resources.
 *
 * Scope Levels:
 *   - system: Full access to everything (Domain Admins)
 *   - workspace: Access to specific workspace(s) and their projects
 *   - project: Access to specific project(s) only
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 5 - Scoped Data Access
 * =============================================================================
 */

import { prisma } from '../lib/prisma';
import { aclService, ACL_PERMISSIONS } from './aclService';

// =============================================================================
// Types
// =============================================================================

export type ScopeLevel = 'system' | 'workspace' | 'project' | 'none';

export interface UserScope {
  /** The highest scope level this user has */
  level: ScopeLevel;

  /** Workspace IDs the user has access to */
  workspaceIds: number[];

  /** Project IDs the user has access to */
  projectIds: number[];

  /** Permission flags for common operations */
  permissions: {
    /** Can manage users (create, edit, delete) */
    canManageUsers: boolean;
    /** Can manage security groups */
    canManageGroups: boolean;
    /** Can manage workspaces */
    canManageWorkspaces: boolean;
    /** Can access admin panel at all */
    canAccessAdminPanel: boolean;
    /** Can manage ACL entries */
    canManageAcl: boolean;
  };

  /** Is this user a Domain Admin (full system access) */
  isDomainAdmin: boolean;
}

// =============================================================================
// ScopeService Class
// =============================================================================

export class ScopeService {
  /**
   * Get the full scope for a user.
   * This determines what resources they can access and what actions they can perform.
   *
   * @param userId - The user to check
   * @returns UserScope object with all scope information
   */
  async getUserScope(userId: number): Promise<UserScope> {
    // 1. Check if user is a Domain Admin (has system-level access)
    const isDomainAdmin = await this.isDomainAdmin(userId);

    if (isDomainAdmin) {
      // Domain Admins have full access to everything
      const allWorkspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      const allProjects = await prisma.project.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      return {
        level: 'system',
        workspaceIds: allWorkspaces.map((w) => w.id),
        projectIds: allProjects.map((p) => p.id),
        permissions: {
          canManageUsers: true,
          canManageGroups: true,
          canManageWorkspaces: true,
          canAccessAdminPanel: true,
          canManageAcl: true,
        },
        isDomainAdmin: true,
      };
    }

    // 2. Get workspaces user has access to via ACL
    const accessibleWorkspaceIds = await this.getAccessibleWorkspaceIds(userId);

    // 3. Get projects user has access to via ACL
    const accessibleProjectIds = await this.getAccessibleProjectIds(userId, accessibleWorkspaceIds);

    // 4. Determine scope level based on what access they have
    let level: ScopeLevel = 'none';
    if (accessibleWorkspaceIds.length > 0) {
      level = 'workspace';
    } else if (accessibleProjectIds.length > 0) {
      level = 'project';
    }

    // 5. Check permission flags
    const permissions = await this.checkPermissionFlags(userId, accessibleWorkspaceIds);

    return {
      level,
      workspaceIds: accessibleWorkspaceIds,
      projectIds: accessibleProjectIds,
      permissions,
      isDomainAdmin: false,
    };
  }

  /**
   * Check if a user is a Domain Admin.
   * Domain Admins have READ permission on 'root' resource OR are ADMIN role users.
   */
  async isDomainAdmin(userId: number): Promise<boolean> {
    // Check if user has ADMIN role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'ADMIN') {
      return true;
    }

    // Check if user has READ access on root (via ACL)
    const hasRootAccess = await aclService.hasPermission(
      userId,
      'root',
      null,
      ACL_PERMISSIONS.READ
    );

    return hasRootAccess;
  }

  /**
   * Get all workspace IDs a user has access to.
   * Checks for explicit ACL entries on workspaces.
   */
  private async getAccessibleWorkspaceIds(userId: number): Promise<number[]> {
    // Get all ACL entries for this user on workspaces
    const userAclEntries = await aclService.getUserAclEntries(userId);

    // Filter for workspace entries with READ permission
    const workspaceIds = new Set<number>();

    for (const entry of userAclEntries) {
      if (entry.resourceType === 'workspace' && entry.resourceId !== null) {
        // Check if this entry grants READ access
        if (!entry.deny && (entry.permissions & ACL_PERMISSIONS.READ) !== 0) {
          workspaceIds.add(entry.resourceId);
        }
      }
    }

    // Also check if user has READ on "all workspaces" (resourceId = null)
    const hasAllWorkspacesAccess = await aclService.hasPermission(
      userId,
      'workspace',
      null,
      ACL_PERMISSIONS.READ
    );

    if (hasAllWorkspacesAccess) {
      // User has access to all workspaces
      const allWorkspaces = await prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return allWorkspaces.map((w) => w.id);
    }

    return Array.from(workspaceIds);
  }

  /**
   * Get all project IDs a user has access to.
   * This includes projects in accessible workspaces AND directly assigned projects.
   */
  private async getAccessibleProjectIds(
    userId: number,
    accessibleWorkspaceIds: number[]
  ): Promise<number[]> {
    const projectIds = new Set<number>();

    // 1. Get all projects in accessible workspaces
    if (accessibleWorkspaceIds.length > 0) {
      const workspaceProjects = await prisma.project.findMany({
        where: {
          isActive: true,
          workspaceId: { in: accessibleWorkspaceIds },
        },
        select: { id: true },
      });
      workspaceProjects.forEach((p) => projectIds.add(p.id));
    }

    // 2. Get directly assigned projects (via ACL)
    const userAclEntries = await aclService.getUserAclEntries(userId);

    for (const entry of userAclEntries) {
      if (entry.resourceType === 'project' && entry.resourceId !== null) {
        if (!entry.deny && (entry.permissions & ACL_PERMISSIONS.READ) !== 0) {
          projectIds.add(entry.resourceId);
        }
      }
    }

    return Array.from(projectIds);
  }

  /**
   * Check various permission flags for a user.
   *
   * SECURITY: Admin panel access requires explicit admin-level permissions.
   * Having READ access on a workspace does NOT grant admin panel access.
   */
  private async checkPermissionFlags(
    userId: number,
    accessibleWorkspaceIds: number[]
  ): Promise<UserScope['permissions']> {
    // Check system-level permissions
    const [canManageUsers, canManageGroups, canManageAcl] = await Promise.all([
      aclService.hasPermission(userId, 'system', null, ACL_PERMISSIONS.WRITE),
      aclService.hasPermission(userId, 'system', null, ACL_PERMISSIONS.WRITE),
      aclService.hasPermission(userId, 'system', null, ACL_PERMISSIONS.PERMISSIONS),
    ]);

    // Can manage workspaces if they have WRITE on any workspace
    let canManageWorkspaces = false;
    for (const wsId of accessibleWorkspaceIds) {
      if (await aclService.hasPermission(userId, 'workspace', wsId, ACL_PERMISSIONS.WRITE)) {
        canManageWorkspaces = true;
        break;
      }
    }

    // Check if user is a workspace admin (has PERMISSIONS on any workspace)
    // This is required for admin panel access - just having READ is NOT enough
    let isWorkspaceAdmin = false;
    for (const wsId of accessibleWorkspaceIds) {
      if (await aclService.hasPermission(userId, 'workspace', wsId, ACL_PERMISSIONS.PERMISSIONS)) {
        isWorkspaceAdmin = true;
        break;
      }
    }

    // Check if user has explicit admin-level ACL access
    const hasAdminAccess = await aclService.hasPermission(
      userId,
      'admin',
      null,
      ACL_PERMISSIONS.READ
    );

    // SECURITY FIX: Admin panel access requires explicit admin permissions
    // Just having READ on a workspace does NOT grant admin panel access!
    // User needs one of:
    // 1. Explicit ACL on 'admin' resource, OR
    // 2. PERMISSIONS (P) bit on a workspace (workspace admin), OR
    // 3. System-level management permissions
    const canAccessAdminPanel =
      hasAdminAccess || isWorkspaceAdmin || canManageUsers || canManageGroups || canManageAcl;

    return {
      canManageUsers,
      canManageGroups,
      canManageWorkspaces,
      canAccessAdminPanel,
      canManageAcl,
    };
  }

  // ===========================================================================
  // Scoped Query Helpers
  // ===========================================================================

  /**
   * Get users visible to a given user based on their scope.
   * - Domain Admins: All users
   * - Workspace Admins: Users in their workspace(s)
   * - Others: Only themselves
   */
  async getUsersInScope(userId: number): Promise<number[]> {
    const scope = await this.getUserScope(userId);

    if (scope.isDomainAdmin) {
      // Return all active users
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    if (scope.workspaceIds.length > 0) {
      // Get users who have ACL access to the same workspaces
      const userIdsInWorkspaces = await prisma.aclEntry.findMany({
        where: {
          resourceType: 'workspace',
          resourceId: { in: scope.workspaceIds },
          principalType: 'user',
        },
        select: { principalId: true },
        distinct: ['principalId'],
      });

      const userIds = new Set(userIdsInWorkspaces.map((e) => e.principalId));
      userIds.add(userId); // Always include self

      return Array.from(userIds);
    }

    // Only return self
    return [userId];
  }

  /**
   * Get groups visible to a given user based on their scope.
   * - Domain Admins: All groups
   * - Workspace Admins: System groups + workspace-scoped groups
   * - Others: Groups they are a member of
   */
  async getGroupsInScope(userId: number): Promise<number[]> {
    const scope = await this.getUserScope(userId);

    if (scope.isDomainAdmin) {
      // Return all active groups
      const groups = await prisma.group.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return groups.map((g) => g.id);
    }

    // Get groups user is a member of
    const memberGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = new Set(memberGroups.map((m) => m.groupId));

    // If user has workspace access, also include system groups (workspaceId = null)
    if (scope.workspaceIds.length > 0) {
      const systemGroups = await prisma.group.findMany({
        where: {
          isActive: true,
          workspaceId: null,
        },
        select: { id: true },
      });
      systemGroups.forEach((g) => groupIds.add(g.id));
    }

    return Array.from(groupIds);
  }

  /**
   * Get workspaces visible to a given user.
   */
  async getWorkspacesInScope(userId: number): Promise<number[]> {
    const scope = await this.getUserScope(userId);
    return scope.workspaceIds;
  }

  /**
   * Get projects visible to a given user, optionally filtered by workspace.
   */
  async getProjectsInScope(userId: number, workspaceId?: number): Promise<number[]> {
    const scope = await this.getUserScope(userId);

    if (workspaceId) {
      // Filter to specific workspace
      if (!scope.workspaceIds.includes(workspaceId)) {
        return []; // User doesn't have access to this workspace
      }

      const projects = await prisma.project.findMany({
        where: {
          isActive: true,
          workspaceId,
          id: { in: scope.projectIds },
        },
        select: { id: true },
      });
      return projects.map((p) => p.id);
    }

    return scope.projectIds;
  }

  // ===========================================================================
  // Convenience Helpers
  // ===========================================================================

  /**
   * Check if a user can access a specific workspace.
   */
  async canAccessWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    const scope = await this.getUserScope(userId);
    return scope.isDomainAdmin || scope.workspaceIds.includes(workspaceId);
  }

  /**
   * Check if a user can access a specific project.
   */
  async canAccessProject(userId: number, projectId: number): Promise<boolean> {
    const scope = await this.getUserScope(userId);
    return scope.isDomainAdmin || scope.projectIds.includes(projectId);
  }

  /**
   * Get a Prisma where clause for filtering workspaces by scope.
   */
  async getWorkspaceWhereClause(userId: number): Promise<{ id?: { in: number[] } }> {
    const scope = await this.getUserScope(userId);

    if (scope.isDomainAdmin) {
      return {}; // No filter for Domain Admins
    }

    return { id: { in: scope.workspaceIds } };
  }

  /**
   * Get a Prisma where clause for filtering projects by scope.
   */
  async getProjectWhereClause(userId: number): Promise<{ id?: { in: number[] } }> {
    const scope = await this.getUserScope(userId);

    if (scope.isDomainAdmin) {
      return {}; // No filter for Domain Admins
    }

    return { id: { in: scope.projectIds } };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const scopeService = new ScopeService();
