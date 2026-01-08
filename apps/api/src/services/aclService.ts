/*
 * AclService - Filesystem-style Access Control List Service
 * Version: 1.0.0
 *
 * NTFS/AD-compatible permission system met bitmask permissions.
 * Implementeert deny-first logica en inheritance net als echte filesystems.
 *
 * Permission Bitmask:
 *   R (Read)    = 1  (0b00001) - Kan resource bekijken
 *   W (Write)   = 2  (0b00010) - Kan resource wijzigen
 *   X (Execute) = 4  (0b00100) - Kan acties uitvoeren (tasks aanmaken, etc.)
 *   D (Delete)  = 8  (0b01000) - Kan resource verwijderen
 *   P (Perms)   = 16 (0b10000) - Kan permissions beheren
 *
 * Common Combinations:
 *   Read only      = R         = 1
 *   Contributor    = R+W+X     = 7
 *   Editor         = R+W+X+D   = 15
 *   Full Control   = R+W+X+D+P = 31
 *
 * Deny-First Logic:
 *   1. Collect all ACL entries for user AND user's groups
 *   2. If ANY deny entry matches the requested permission -> DENY
 *   3. If any allow entry matches -> ALLOW
 *   4. Otherwise -> DENY (implicit deny)
 *
 * Inheritance:
 *   - ACLs can be inherited from parent resources
 *   - inheritToChildren=true propagates permissions down
 *   - Explicit permissions on child override inherited (unless deny)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { TRPCError } from '@trpc/server'
import { prisma } from '../lib/prisma'

// =============================================================================
// Permission Constants
// =============================================================================

export const ACL_PERMISSIONS = {
  READ: 1,      // 0b00001
  WRITE: 2,     // 0b00010
  EXECUTE: 4,   // 0b00100
  DELETE: 8,    // 0b01000
  PERMISSIONS: 16, // 0b10000
} as const

// Common permission combinations
export const ACL_PRESETS = {
  NONE: 0,
  READ_ONLY: ACL_PERMISSIONS.READ,                                             // 1
  CONTRIBUTOR: ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE | ACL_PERMISSIONS.EXECUTE, // 7
  EDITOR: ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE | ACL_PERMISSIONS.EXECUTE | ACL_PERMISSIONS.DELETE, // 15
  FULL_CONTROL: ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE | ACL_PERMISSIONS.EXECUTE | ACL_PERMISSIONS.DELETE | ACL_PERMISSIONS.PERMISSIONS, // 31
} as const

// Resource types - Extended hierarchy (Fase 4C, 8B)
// root → system/dashboard/workspaces → workspace:{id} → project:{id} → feature:{id}
export type AclResourceType = 'root' | 'system' | 'dashboard' | 'workspace' | 'project' | 'feature' | 'admin' | 'profile'

// Principal types
export type AclPrincipalType = 'user' | 'group'

// =============================================================================
// Types
// =============================================================================

export interface AclCheckResult {
  allowed: boolean
  effectivePermissions: number
  deniedPermissions: number
  matchedEntries: {
    id: number
    source: 'user' | 'group'
    groupName?: string
    permissions: number
    deny: boolean
    inherited: boolean
  }[]
}

export interface AclEntry {
  id: number
  resourceType: string
  resourceId: number | null
  principalType: string
  principalId: number
  permissions: number
  deny: boolean
  inherited: boolean
  inheritToChildren: boolean
}

// =============================================================================
// AclService Class
// =============================================================================

export class AclService {
  // ===========================================================================
  // Core Permission Checking
  // ===========================================================================

  /**
   * Check if a user has specific permission(s) on a resource.
   * Implements deny-first logic with group support.
   *
   * @param userId - The user to check
   * @param resourceType - Type of resource ('workspace', 'project', 'admin', 'profile')
   * @param resourceId - ID of the resource (null for root level like /admin)
   * @param requiredPermission - Bitmask of required permissions (e.g., ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE)
   * @returns true if ALL required permissions are granted and NONE are denied
   */
  async hasPermission(
    userId: number,
    resourceType: AclResourceType,
    resourceId: number | null,
    requiredPermission: number
  ): Promise<boolean> {
    const result = await this.checkPermission(userId, resourceType, resourceId)

    // Check if any required permission is denied
    if ((result.deniedPermissions & requiredPermission) !== 0) {
      return false
    }

    // Check if all required permissions are allowed
    return (result.effectivePermissions & requiredPermission) === requiredPermission
  }

  /**
   * Detailed permission check that returns all matching ACL entries.
   * Useful for debugging and UI display.
   */
  async checkPermission(
    userId: number,
    resourceType: AclResourceType,
    resourceId: number | null
  ): Promise<AclCheckResult> {
    // 1. Get all groups the user belongs to
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: {
        groupId: true,
        group: { select: { name: true } }
      }
    })
    const groupIds = userGroups.map(g => g.groupId)
    const groupNameMap = new Map(userGroups.map(g => [g.groupId, g.group.name]))

    // 2. Build resource hierarchy for inheritance
    // For now: workspace -> project (project inherits from workspace)
    const resourceHierarchy = await this.buildResourceHierarchy(resourceType, resourceId)

    // 3. Fetch all relevant ACL entries
    const aclEntries = await prisma.aclEntry.findMany({
      where: {
        OR: resourceHierarchy.map(res => ({
          resourceType: res.type,
          resourceId: res.id,
        })),
        AND: {
          OR: [
            // Direct user entries
            { principalType: 'user', principalId: userId },
            // Group entries (if user is in any groups)
            ...(groupIds.length > 0 ? [{ principalType: 'group', principalId: { in: groupIds } }] : []),
          ]
        }
      },
      orderBy: [
        // Order: most specific first (child before parent)
        { inherited: 'asc' },
        // Deny entries should be processed (they always win regardless of order)
        { deny: 'desc' },
      ]
    })

    // 4. Calculate effective permissions using deny-first logic
    let allowedPermissions = 0
    let deniedPermissions = 0
    const matchedEntries: AclCheckResult['matchedEntries'] = []

    for (const entry of aclEntries) {
      const entryInfo = {
        id: entry.id,
        source: entry.principalType as 'user' | 'group',
        groupName: entry.principalType === 'group' ? groupNameMap.get(entry.principalId) : undefined,
        permissions: entry.permissions,
        deny: entry.deny,
        inherited: entry.inherited,
      }
      matchedEntries.push(entryInfo)

      if (entry.deny) {
        // Deny ALWAYS wins - add to denied permissions
        deniedPermissions |= entry.permissions
      } else {
        // Allow - add to allowed permissions (but may be overridden by deny)
        allowedPermissions |= entry.permissions
      }
    }

    // Effective = allowed minus denied
    const effectivePermissions = allowedPermissions & ~deniedPermissions

    return {
      allowed: effectivePermissions > 0,
      effectivePermissions,
      deniedPermissions,
      matchedEntries,
    }
  }

  /**
   * Build resource hierarchy for inheritance resolution.
   * Returns resources from most specific to most general.
   *
   * Hierarchy (Fase 4C, 8B):
   *   root (null)
   *     ├── system (null) → admin (null)
   *     ├── dashboard (null)
   *     └── workspace (null)
   *           └── workspace:{id}
   *                 └── project:{id}
   *                       └── feature:{id}
   *
   * Inheritance flows from root down to children.
   */
  private async buildResourceHierarchy(
    resourceType: AclResourceType,
    resourceId: number | null
  ): Promise<{ type: AclResourceType; id: number | null }[]> {
    const hierarchy: { type: AclResourceType; id: number | null }[] = []

    // Add the specific resource
    hierarchy.push({ type: resourceType, id: resourceId })

    // Add root level of this type (for inherited permissions)
    if (resourceId !== null) {
      hierarchy.push({ type: resourceType, id: null })
    }

    // Handle cross-resource inheritance based on type
    switch (resourceType) {
      case 'feature':
        // Features inherit from their project (Fase 8B)
        if (resourceId !== null) {
          const feature = await prisma.feature.findUnique({
            where: { id: resourceId },
            select: { projectId: true }
          })
          if (feature?.projectId) {
            // Add the project
            hierarchy.push({ type: 'project', id: feature.projectId })
            hierarchy.push({ type: 'project', id: null }) // All projects level
            // Add workspace
            const project = await prisma.project.findUnique({
              where: { id: feature.projectId },
              select: { workspaceId: true }
            })
            if (project) {
              hierarchy.push({ type: 'workspace', id: project.workspaceId })
              hierarchy.push({ type: 'workspace', id: null })
            }
          }
        }
        hierarchy.push({ type: 'root', id: null })
        break

      case 'project':
        // Projects inherit from their workspace
        if (resourceId !== null) {
          const project = await prisma.project.findUnique({
            where: { id: resourceId },
            select: { workspaceId: true }
          })
          if (project) {
            hierarchy.push({ type: 'workspace', id: project.workspaceId })
            hierarchy.push({ type: 'workspace', id: null }) // All workspaces level
          }
        }
        // Workspaces inherit from root
        hierarchy.push({ type: 'root', id: null })
        break

      case 'workspace':
        // Workspaces inherit from root
        hierarchy.push({ type: 'root', id: null })
        break

      case 'admin':
        // Admin inherits from system, which inherits from root
        hierarchy.push({ type: 'system', id: null })
        hierarchy.push({ type: 'root', id: null })
        break

      case 'system':
        // System inherits from root
        hierarchy.push({ type: 'root', id: null })
        break

      case 'dashboard':
        // Dashboard inherits from root
        hierarchy.push({ type: 'root', id: null })
        break

      case 'profile':
        // Profile inherits from root
        hierarchy.push({ type: 'root', id: null })
        break

      case 'root':
        // Root is the top level, no further inheritance
        break
    }

    return hierarchy
  }

  // ===========================================================================
  // Permission Requirement Helpers
  // ===========================================================================

  /**
   * Require specific permission, throw FORBIDDEN if not granted.
   */
  async requirePermission(
    userId: number,
    resourceType: AclResourceType,
    resourceId: number | null,
    requiredPermission: number,
    errorMessage?: string
  ): Promise<void> {
    const hasPerms = await this.hasPermission(userId, resourceType, resourceId, requiredPermission)
    if (!hasPerms) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: errorMessage || `Geen toegang: ontbrekende permissies voor ${resourceType}`,
      })
    }
  }

  /**
   * Require READ permission.
   */
  async requireRead(userId: number, resourceType: AclResourceType, resourceId: number | null): Promise<void> {
    await this.requirePermission(userId, resourceType, resourceId, ACL_PERMISSIONS.READ, 'Geen leesrechten')
  }

  /**
   * Require WRITE permission.
   */
  async requireWrite(userId: number, resourceType: AclResourceType, resourceId: number | null): Promise<void> {
    await this.requirePermission(userId, resourceType, resourceId, ACL_PERMISSIONS.WRITE, 'Geen schrijfrechten')
  }

  /**
   * Require EXECUTE permission (for creating items, triggering actions).
   */
  async requireExecute(userId: number, resourceType: AclResourceType, resourceId: number | null): Promise<void> {
    await this.requirePermission(userId, resourceType, resourceId, ACL_PERMISSIONS.EXECUTE, 'Geen uitvoerrechten')
  }

  /**
   * Require DELETE permission.
   */
  async requireDelete(userId: number, resourceType: AclResourceType, resourceId: number | null): Promise<void> {
    await this.requirePermission(userId, resourceType, resourceId, ACL_PERMISSIONS.DELETE, 'Geen verwijderrechten')
  }

  /**
   * Require PERMISSIONS permission (to manage ACLs).
   */
  async requirePermissionsManagement(userId: number, resourceType: AclResourceType, resourceId: number | null): Promise<void> {
    await this.requirePermission(userId, resourceType, resourceId, ACL_PERMISSIONS.PERMISSIONS, 'Geen rechten om permissies te beheren')
  }

  // ===========================================================================
  // ACL Management
  // ===========================================================================

  /**
   * Grant permissions to a user or group on a resource.
   */
  async grantPermission(params: {
    resourceType: AclResourceType
    resourceId: number | null
    principalType: AclPrincipalType
    principalId: number
    permissions: number
    inheritToChildren?: boolean
    createdById?: number
  }): Promise<{ id: number }> {
    const { resourceType, resourceId, principalType, principalId, permissions, inheritToChildren = true, createdById } = params

    // Find existing entry (handle null resourceId separately since Prisma unique constraints with nulls are tricky)
    const existing = await prisma.aclEntry.findFirst({
      where: {
        resourceType,
        resourceId,
        principalType,
        principalId,
        deny: false,
      }
    })

    if (existing) {
      const updated = await prisma.aclEntry.update({
        where: { id: existing.id },
        data: {
          permissions,
          inheritToChildren,
        }
      })
      return { id: updated.id }
    } else {
      const created = await prisma.aclEntry.create({
        data: {
          resourceType,
          resourceId,
          principalType,
          principalId,
          permissions,
          deny: false,
          inherited: false,
          inheritToChildren,
          createdById,
        }
      })
      return { id: created.id }
    }
  }

  /**
   * Deny permissions to a user or group on a resource.
   * Deny ALWAYS overrides allow.
   */
  async denyPermission(params: {
    resourceType: AclResourceType
    resourceId: number | null
    principalType: AclPrincipalType
    principalId: number
    permissions: number
    inheritToChildren?: boolean
    createdById?: number
  }): Promise<{ id: number }> {
    const { resourceType, resourceId, principalType, principalId, permissions, inheritToChildren = true, createdById } = params

    // Find existing entry (handle null resourceId separately since Prisma unique constraints with nulls are tricky)
    const existing = await prisma.aclEntry.findFirst({
      where: {
        resourceType,
        resourceId,
        principalType,
        principalId,
        deny: true,
      }
    })

    if (existing) {
      const updated = await prisma.aclEntry.update({
        where: { id: existing.id },
        data: {
          permissions,
          inheritToChildren,
        }
      })
      return { id: updated.id }
    } else {
      const created = await prisma.aclEntry.create({
        data: {
          resourceType,
          resourceId,
          principalType,
          principalId,
          permissions,
          deny: true,
          inherited: false,
          inheritToChildren,
          createdById,
        }
      })
      return { id: created.id }
    }
  }

  /**
   * Revoke all permissions for a principal on a resource.
   */
  async revokePermission(params: {
    resourceType: AclResourceType
    resourceId: number | null
    principalType: AclPrincipalType
    principalId: number
  }): Promise<void> {
    const { resourceType, resourceId, principalType, principalId } = params

    await prisma.aclEntry.deleteMany({
      where: {
        resourceType,
        resourceId,
        principalType,
        principalId,
      }
    })
  }

  /**
   * Get all ACL entries for a resource.
   */
  async getAclEntries(resourceType: AclResourceType, resourceId: number | null): Promise<AclEntry[]> {
    return prisma.aclEntry.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: [
        { principalType: 'asc' },
        { deny: 'desc' },
        { principalId: 'asc' },
      ]
    })
  }

  /**
   * Get all ACL entries for a user (direct and group).
   */
  async getUserAclEntries(userId: number): Promise<AclEntry[]> {
    // Get user's groups
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true }
    })
    const groupIds = userGroups.map(g => g.groupId)

    return prisma.aclEntry.findMany({
      where: {
        OR: [
          { principalType: 'user', principalId: userId },
          ...(groupIds.length > 0 ? [{ principalType: 'group', principalId: { in: groupIds } }] : []),
        ]
      },
      orderBy: [
        { resourceType: 'asc' },
        { resourceId: 'asc' },
        { deny: 'desc' },
      ]
    })
  }

  // ===========================================================================
  // Utility Functions
  // ===========================================================================

  /**
   * Convert permission bitmask to human-readable array.
   */
  permissionToArray(permissions: number): string[] {
    const result: string[] = []
    if (permissions & ACL_PERMISSIONS.READ) result.push('Read')
    if (permissions & ACL_PERMISSIONS.WRITE) result.push('Write')
    if (permissions & ACL_PERMISSIONS.EXECUTE) result.push('Execute')
    if (permissions & ACL_PERMISSIONS.DELETE) result.push('Delete')
    if (permissions & ACL_PERMISSIONS.PERMISSIONS) result.push('Permissions')
    return result
  }

  /**
   * Convert array of permission names to bitmask.
   */
  arrayToPermission(perms: string[]): number {
    let result = 0
    for (const p of perms) {
      switch (p.toLowerCase()) {
        case 'read': case 'r': result |= ACL_PERMISSIONS.READ; break
        case 'write': case 'w': result |= ACL_PERMISSIONS.WRITE; break
        case 'execute': case 'x': result |= ACL_PERMISSIONS.EXECUTE; break
        case 'delete': case 'd': result |= ACL_PERMISSIONS.DELETE; break
        case 'permissions': case 'p': result |= ACL_PERMISSIONS.PERMISSIONS; break
      }
    }
    return result
  }

  /**
   * Get preset name for a permission value.
   */
  getPresetName(permissions: number): string | null {
    switch (permissions) {
      case ACL_PRESETS.NONE: return 'None'
      case ACL_PRESETS.READ_ONLY: return 'Read Only'
      case ACL_PRESETS.CONTRIBUTOR: return 'Contributor'
      case ACL_PRESETS.EDITOR: return 'Editor'
      case ACL_PRESETS.FULL_CONTROL: return 'Full Control'
      default: return null
    }
  }

  // ===========================================================================
  // Transition Helpers
  // ===========================================================================

  /**
   * Check if ACL system has any entries for a resource.
   * Used during transition to determine if ACL or legacy system should be used.
   */
  async hasAclEntries(resourceType: AclResourceType, resourceId: number | null): Promise<boolean> {
    const count = await prisma.aclEntry.count({
      where: { resourceType, resourceId }
    })
    return count > 0
  }

  /**
   * Check if ACL system is enabled for a resource.
   * During transition, we use ACL if entries exist, otherwise fall back to legacy.
   */
  async isAclEnabled(resourceType: AclResourceType, resourceId: number | null): Promise<boolean> {
    // Check if there are any ACL entries for this specific resource
    // or for the root level of this resource type
    const hasSpecific = await this.hasAclEntries(resourceType, resourceId)
    if (hasSpecific) return true

    if (resourceId !== null) {
      const hasRoot = await this.hasAclEntries(resourceType, null)
      if (hasRoot) return true
    }

    return false
  }

  /**
   * Count total ACL entries in the system.
   * Used to check if migration has been run.
   */
  async getTotalAclCount(): Promise<number> {
    return prisma.aclEntry.count()
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const aclService = new AclService()
