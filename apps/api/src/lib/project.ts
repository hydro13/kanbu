/*
 * Project Helper Functions
 * Version: 1.1.0
 *
 * Permission checks and project utilities.
 *
 * DEPRECATION NOTICE:
 * The permission checking functions (requireProjectAccess, getProjectAccess,
 * hasMinProjectRole) in this file are DEPRECATED.
 * Use the central PermissionService instead:
 *
 *   import { permissionService } from '../services'
 *   await permissionService.requireProjectAccess(userId, projectId, 'MANAGER')
 *
 * The utility functions (createDefaultColumns, createDefaultSwimlane, etc.)
 * remain available and are NOT deprecated.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 *
 * Modified: Task 258 - Refactor to PermissionService
 * Date: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { TRPCError } from '@trpc/server';
import { ProjectRole } from '@prisma/client';
import { prisma } from './prisma';
import { permissionService } from '../services/permissions';

// =============================================================================
// Types
// =============================================================================

export interface ProjectAccess {
  projectId: number;
  workspaceId: number;
  userId: number;
  role: ProjectRole;
}

// Role hierarchy for permission checks
const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
  OWNER: 4,
};

// Default columns for new projects
const DEFAULT_COLUMNS = [
  { title: 'Backlog', position: 1, isArchive: false },
  { title: 'Ready', position: 2, isArchive: false },
  { title: 'WIP', position: 3, isArchive: false },
  { title: 'Review', position: 4, isArchive: false },
  { title: 'Done', position: 5, isArchive: false },
  { title: 'Archive', position: 6, isArchive: true },
];

// =============================================================================
// Permission Helpers
// =============================================================================

/**
 * Check if a user has access to a project with at least the minimum role.
 * Throws FORBIDDEN if access denied.
 *
 * @deprecated Use permissionService.requireProjectAccess() instead
 * @param userId - The user ID to check
 * @param projectId - The project ID to check access for
 * @param minRole - Minimum required role (default: VIEWER)
 * @returns ProjectAccess with user's actual role
 * @throws TRPCError FORBIDDEN if access denied
 */
export async function requireProjectAccess(
  userId: number,
  projectId: number,
  minRole: ProjectRole = 'VIEWER'
): Promise<ProjectAccess> {
  // Delegate to permissionService (ACL-based)
  const access = await permissionService.requireProjectAccess(userId, projectId, minRole);
  return {
    projectId: access.projectId,
    workspaceId: access.workspaceId,
    userId: access.userId,
    role: access.role,
  };
}

/**
 * Check if a user has access to a project without throwing.
 * Returns null if no access.
 *
 * @deprecated Use permissionService.getProjectAccess() instead
 * @param userId - The user ID to check
 * @param projectId - The project ID to check access for
 * @returns ProjectAccess or null
 */
export async function getProjectAccess(
  userId: number,
  projectId: number
): Promise<ProjectAccess | null> {
  // Delegate to permissionService (ACL-based)
  const access = await permissionService.getProjectAccess(userId, projectId);
  if (!access) return null;
  return {
    projectId: access.projectId,
    workspaceId: access.workspaceId,
    userId: access.userId,
    role: access.role,
  };
}

/**
 * Check if a role meets the minimum requirement
 *
 * @deprecated Use permissionService.hasMinProjectRole() instead
 * @param userRole - The user's current role
 * @param minRole - The minimum required role
 * @returns true if userRole >= minRole
 */
export function hasMinProjectRole(userRole: ProjectRole, minRole: ProjectRole): boolean {
  return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[minRole];
}

// =============================================================================
// Project Creation Helpers
// =============================================================================

/**
 * Create default columns for a new project.
 * Creates: Backlog, Ready, WIP, Review, Done, Archive
 *
 * @param projectId - The project ID to create columns for
 * @returns Array of created columns
 */
export async function createDefaultColumns(
  projectId: number
): Promise<Array<{ id: number; title: string; position: number; isArchive: boolean }>> {
  const columns = await prisma.column.createManyAndReturn({
    data: DEFAULT_COLUMNS.map((col) => ({
      projectId,
      title: col.title,
      position: col.position,
      isArchive: col.isArchive,
    })),
    select: {
      id: true,
      title: true,
      position: true,
      isArchive: true,
    },
  });

  return columns;
}

/**
 * Create default swimlane for a new project.
 *
 * @param projectId - The project ID to create swimlane for
 * @returns The created swimlane
 */
export async function createDefaultSwimlane(
  projectId: number
): Promise<{ id: number; name: string }> {
  const swimlane = await prisma.swimlane.create({
    data: {
      projectId,
      name: 'Default',
      position: 1,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return swimlane;
}

/**
 * Generate unique project identifier from name.
 * Creates slug-like identifier for task references (e.g., "PLAN" for PLAN-123)
 *
 * @param name - The project name
 * @param workspaceId - The workspace ID for uniqueness check
 * @returns Unique identifier (max 10 chars, uppercase)
 */
export async function generateProjectIdentifier(
  name: string,
  workspaceId: number
): Promise<string> {
  // Generate base identifier from name (uppercase, letters only)
  let baseIdentifier = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6);

  // Fallback if no letters
  if (baseIdentifier.length < 2) {
    baseIdentifier = 'PROJ';
  }

  // Check uniqueness within workspace
  let identifier = baseIdentifier;
  let counter = 1;

  while (true) {
    const existing = await prisma.project.findFirst({
      where: {
        workspaceId,
        identifier,
      },
      select: { id: true },
    });

    if (!existing) {
      break;
    }

    identifier = `${baseIdentifier}${counter}`;
    counter++;

    // Safety limit
    if (counter > 99) {
      identifier = `${baseIdentifier}${Date.now() % 1000}`;
      break;
    }
  }

  return identifier;
}

/**
 * Generate next task reference number for a project.
 * Format: {identifier}-{number} (e.g., PLAN-123)
 *
 * @param projectId - The project ID
 * @returns Next task reference (e.g., "PLAN-1")
 */
export async function generateTaskReference(projectId: number): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      identifier: true,
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  // Count existing tasks + 1
  const nextNumber = project._count.tasks + 1;
  const identifier = project.identifier || 'TASK';

  return `${identifier}-${nextNumber}`;
}
