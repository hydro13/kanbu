/*
 * Workspace Helper Functions
 * Version: 1.1.0
 *
 * Permission checks and workspace utilities for multi-tenancy.
 *
 * DEPRECATION NOTICE:
 * The permission checking functions (requireWorkspaceAccess, getWorkspaceAccess,
 * hasMinRole, isSystemAdmin, requireSystemAdmin) in this file are DEPRECATED.
 * Use the central PermissionService instead:
 *
 *   import { permissionService } from '../services'
 *   await permissionService.requireWorkspaceAccess(userId, workspaceId, 'ADMIN')
 *
 * The utility functions (generateUniqueSlug, generateInviteToken, etc.) remain
 * available and are NOT deprecated.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T03:55 CET
 *
 * Modified: Task 258 - Refactor to PermissionService
 * Date: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { TRPCError } from '@trpc/server'
import { WorkspaceRole, AppRole } from '@prisma/client'
import { prisma } from './prisma'

// =============================================================================
// Types
// =============================================================================

export interface WorkspaceAccess {
  workspaceId: number
  userId: number
  role: WorkspaceRole
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

// =============================================================================
// Permission Helpers
// =============================================================================

/**
 * Check if a user has access to a workspace with at least the minimum role.
 * Throws FORBIDDEN if access denied.
 *
 * @deprecated Use permissionService.requireWorkspaceAccess() instead
 * @param userId - The user ID to check
 * @param workspaceId - The workspace ID to check access for
 * @param minRole - Minimum required role (default: VIEWER)
 * @returns WorkspaceAccess with user's actual role
 * @throws TRPCError FORBIDDEN if access denied
 */
export async function requireWorkspaceAccess(
  userId: number,
  workspaceId: number,
  minRole: WorkspaceRole = 'VIEWER'
): Promise<WorkspaceAccess> {
  const membership = await prisma.workspaceUser.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    include: {
      workspace: {
        select: {
          isActive: true,
        },
      },
    },
  })

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this workspace',
    })
  }

  if (!membership.workspace.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This workspace has been deactivated',
    })
  }

  // Check role hierarchy
  const userRoleLevel = ROLE_HIERARCHY[membership.role]
  const requiredRoleLevel = ROLE_HIERARCHY[minRole]

  if (userRoleLevel < requiredRoleLevel) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This action requires ${minRole} role or higher`,
    })
  }

  return {
    workspaceId,
    userId,
    role: membership.role,
  }
}

/**
 * Check if a user has access to a workspace without throwing.
 * Returns null if no access.
 *
 * @deprecated Use permissionService.getWorkspaceAccess() instead
 * @param userId - The user ID to check
 * @param workspaceId - The workspace ID to check access for
 * @returns WorkspaceAccess or null
 */
export async function getWorkspaceAccess(
  userId: number,
  workspaceId: number
): Promise<WorkspaceAccess | null> {
  const membership = await prisma.workspaceUser.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    include: {
      workspace: {
        select: {
          isActive: true,
        },
      },
    },
  })

  if (!membership || !membership.workspace.isActive) {
    return null
  }

  return {
    workspaceId,
    userId,
    role: membership.role,
  }
}

/**
 * Check if a role meets the minimum requirement
 *
 * @deprecated Use permissionService.hasMinWorkspaceRole() instead
 * @param userRole - The user's current role
 * @param minRole - The minimum required role
 * @returns true if userRole >= minRole
 */
export function hasMinRole(userRole: WorkspaceRole, minRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

// =============================================================================
// System Admin Helpers
// =============================================================================

/**
 * Check if a user has SYSTEM_ADMIN privileges (AppRole.ADMIN).
 * SYSTEM_ADMINs can create/manage workspaces across the entire system.
 *
 * @deprecated Use permissionService.isSuperAdmin() instead
 * @param appRole - The user's app-level role
 * @returns true if user is a SYSTEM_ADMIN
 */
export function isSystemAdmin(appRole: AppRole): boolean {
  return appRole === 'ADMIN'
}

/**
 * Require SYSTEM_ADMIN privileges for an action.
 * Throws FORBIDDEN if user is not a SYSTEM_ADMIN.
 *
 * @deprecated Use permissionService.requireSuperAdmin() instead
 * @param appRole - The user's app-level role
 * @throws TRPCError FORBIDDEN if not SYSTEM_ADMIN
 */
export function requireSystemAdmin(appRole: AppRole): void {
  if (!isSystemAdmin(appRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action requires system administrator privileges',
    })
  }
}

// =============================================================================
// Workspace Creation Helpers
// =============================================================================

/**
 * Create a default workspace for a newly registered user.
 * The user becomes the OWNER of this workspace.
 *
 * @param userId - The user ID to create workspace for
 * @param userName - The user's name for workspace naming
 * @returns The created workspace
 */
export async function createDefaultWorkspace(
  userId: number,
  userName: string
): Promise<{ id: number; name: string; slug: string }> {
  // Generate a unique slug from user name
  const baseSlug = userName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  // Ensure uniqueness by appending user ID
  const slug = `${baseSlug}-${userId}`

  const workspace = await prisma.workspace.create({
    data: {
      name: `${userName}'s Workspace`,
      slug,
      description: 'Default personal workspace',
      users: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  return workspace
}

/**
 * Generate a unique slug for a workspace name.
 * Appends a number if the slug already exists.
 *
 * @param name - The workspace name to generate slug from
 * @returns A unique slug
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 90) // Leave room for suffix

  // Check if base slug exists
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing) {
      break
    }

    slug = `${baseSlug}-${counter}`
    counter++

    // Safety limit
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`
      break
    }
  }

  return slug
}

// =============================================================================
// Invitation Helpers
// =============================================================================

/**
 * Generate a secure random token for workspace invitations.
 *
 * @returns A 64-character hex token
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Calculate invitation expiration date (7 days from now by default)
 *
 * @param days - Number of days until expiration
 * @returns Expiration date
 */
export function getInviteExpiration(days: number = 7): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
