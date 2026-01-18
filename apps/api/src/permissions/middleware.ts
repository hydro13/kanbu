/*
 * Permission Middleware for tRPC
 * Version: 1.0.0
 *
 * Provides middleware functions for checking permissions in tRPC procedures.
 *
 * Usage:
 * ```ts
 * export const taskRouter = router({
 *   create: protectedProcedure
 *     .input(createTaskSchema)
 *     .use(requirePermission('task.create'))
 *     .mutation(async ({ ctx, input }) => {
 *       // Only runs if user has task.create permission
 *     }),
 * })
 * ```
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc/router';
import { prisma } from '../lib/prisma';
import { groupPermissionService } from '../services/groupPermissions';
import { permissionRegistry } from './registry';
import type { PermissionCheckResult } from './types';

// =============================================================================
// Types
// =============================================================================

interface MiddlewareContext {
  user: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

interface PermissionOptions {
  /** Permission path to check, e.g., "task.create" */
  permission: string;

  /** Optional: Get workspaceId from input */
  getWorkspaceId?: (input: unknown) => number | undefined;

  /** Optional: Get projectId from input */
  getProjectId?: (input: unknown) => number | undefined;

  /** If true, don't throw error, just set ctx.hasPermission */
  soft?: boolean;
}

// =============================================================================
// Permission Check Logic
// =============================================================================

/**
 * Check if a user has a specific permission.
 */
async function checkPermission(
  userId: number,
  permissionPath: string,
  context: { workspaceId?: number; projectId?: number }
): Promise<PermissionCheckResult> {
  // 1. Check if permission exists in registry
  if (!permissionRegistry.has(permissionPath)) {
    console.warn(`[Permission] Unknown permission path: ${permissionPath}`);
    return { allowed: false, reason: 'NOT_GRANTED' };
  }

  // 2. Domain Admins bypass all permission checks
  const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
  if (isDomainAdmin) {
    return { allowed: true, reason: 'ALLOW', grantedBy: 'Domain Admins' };
  }

  // 3. Check if user has system.admin permission (Super Admin)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === 'ADMIN') {
    return { allowed: true, reason: 'ALLOW', grantedBy: 'Super Admin' };
  }

  // 4. Check group-based permissions
  const hasPermission = await groupPermissionService.hasPermission(
    userId,
    permissionPath,
    context.workspaceId,
    context.projectId
  );
  if (hasPermission) {
    return { allowed: true, reason: 'ALLOW', grantedBy: 'Group permission' };
  }

  // 5. Check if permission is denied explicitly
  const effectivePermission = await groupPermissionService.getEffectivePermission(
    userId,
    permissionPath,
    context.workspaceId,
    context.projectId
  );
  if (effectivePermission?.allowed === false && effectivePermission.reason === 'DENY') {
    return { allowed: false, reason: 'DENY', grantedBy: effectivePermission.grantedBy };
  }

  // 6. Default: not granted
  return { allowed: false, reason: 'NOT_GRANTED' };
}

// =============================================================================
// Middleware Factories
// =============================================================================

/**
 * Create a permission check middleware.
 *
 * @param permission - Permission path to check, e.g., "task.create"
 * @param options - Optional configuration
 */
export function requirePermission(
  permission: string,
  options?: Omit<PermissionOptions, 'permission'>
) {
  return middleware(async ({ ctx, next, input }) => {
    const user = (ctx as MiddlewareContext).user;
    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Extract context from input if provided
    const workspaceId = options?.getWorkspaceId?.(input);
    const projectId = options?.getProjectId?.(input);

    const result = await checkPermission(user.id, permission, {
      workspaceId,
      projectId,
    });

    if (!result.allowed) {
      if (options?.soft) {
        // Soft mode: add result to context, don't throw
        return next({
          ctx: {
            ...ctx,
            permissionCheck: result,
            hasPermission: false,
          },
        });
      }

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        permissionCheck: result,
        hasPermission: true,
      },
    });
  });
}

/**
 * Create a permission middleware with workspace context.
 *
 * @param permission - Permission path
 * @param workspaceIdPath - Path to workspaceId in input, e.g., "workspaceId"
 */
export function requireWorkspacePermission(permission: string, workspaceIdPath = 'workspaceId') {
  return requirePermission(permission, {
    getWorkspaceId: (input) => {
      const inp = input as Record<string, unknown>;
      return inp[workspaceIdPath] as number | undefined;
    },
  });
}

/**
 * Create a permission middleware with project context.
 *
 * @param permission - Permission path
 * @param projectIdPath - Path to projectId in input, e.g., "projectId"
 */
export function requireProjectPermission(permission: string, projectIdPath = 'projectId') {
  return requirePermission(permission, {
    getProjectId: (input) => {
      const inp = input as Record<string, unknown>;
      return inp[projectIdPath] as number | undefined;
    },
  });
}

/**
 * Create a configurable permission middleware factory.
 * Useful for creating reusable permission checks.
 */
export function createPermissionMiddleware(options: PermissionOptions) {
  return requirePermission(options.permission, options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check permission without throwing.
 * Useful for conditional UI or logic.
 */
export async function canDo(
  userId: number,
  permission: string,
  context?: { workspaceId?: number; projectId?: number }
): Promise<boolean> {
  const result = await checkPermission(userId, permission, context ?? {});
  return result.allowed;
}

/**
 * Check multiple permissions at once.
 * Returns an object with permission paths as keys and boolean values.
 */
export async function canDoMany(
  userId: number,
  permissions: string[],
  context?: { workspaceId?: number; projectId?: number }
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    permissions.map(async (permission) => {
      results[permission] = await canDo(userId, permission, context);
    })
  );

  return results;
}
