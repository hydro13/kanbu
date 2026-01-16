/**
 * tRPC Router Configuration
 *
 * Root router and procedure definitions
 *
 * ═══════════════════════════════════════════════════════════════════
 * Modified by:
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added adminProcedure for admin-only routes (ADMIN-01)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2026-01-06
 * Change: Updated adminProcedure to use AD-style Domain Admins group check
 *
 * Session: 2026-01-08
 * Change: Updated adminProcedure to also check ACL (admin:root with P permission)
 *
 * Session: 2026-01-09
 * Fase: 9.6 - API Keys & Service Accounts
 * Change: Added apiKeyProcedure and hybridProcedure for API key authentication
 * ═══════════════════════════════════════════════════════════════════
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Context, AuthUser, AuthSource } from './context';
import type { ApiKeyContext } from '../services/apiKeyService';
import { aclService, ACL_PERMISSIONS } from '../services/aclService';

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

import { rateLimitService } from '../services/rateLimitService';

// Rate limit for Assistant requests: 100 req/min
const ASSISTANT_RATE_LIMIT = 100;

const rateLimitMiddleware = middleware(async ({ ctx, next }) => {
    if (ctx.assistantContext) {
        const key = `binding:${ctx.assistantContext.bindingId}`;
        if (!rateLimitService.check(key, ASSISTANT_RATE_LIMIT)) {
            throw new TRPCError({
                code: 'TOO_MANY_REQUESTS',
                message: 'Rate limit exceeded for Assistant binding',
            });
        }
    }
    return next();
});

/**
 * Protected procedure - requires authentication
 * Adds user to context with non-null type
 */
export const protectedProcedure = publicProcedure
  .use(rateLimitMiddleware)
  .use(
    middleware(async ({ ctx, next }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access this resource',
        });
      }
      return next({
        ctx: {
          ...ctx,
          user: ctx.user as AuthUser, // Assert non-null
        },
      });
    })
  );

/**
 * Admin procedure - requires admin access via ACL or Domain Admins group
 *
 * SECURITY: Access is granted if ANY of these conditions are met:
 * 1. ACL: admin:root resource with READ permission or higher
 * 2. ACL: PERMISSIONS (P) bit on ANY workspace (workspace admin)
 * 3. ACL: System-level permissions (system:null with WRITE or PERMISSIONS)
 * 4. Legacy: Domain Admins group membership
 *
 * Note: Individual procedures may further restrict access based on scope.
 * For example, workspace admins can only see users in their workspace.
 */
export const adminProcedure = protectedProcedure.use(
  middleware(async ({ ctx, next }) => {
    // ctx.user is guaranteed non-null by protectedProcedure
    const user = ctx.user as AuthUser;

    // Check 1: ACL - user has access on admin:root
    const hasAclAdmin = await aclService.hasPermission(
      user.id,
      'admin',
      null,
      ACL_PERMISSIONS.READ
    );

    if (hasAclAdmin) {
      return next({ ctx });
    }

    // Check 2: Legacy - Domain Admins group membership
    const domainAdminMembership = await ctx.prisma.groupMember.findFirst({
      where: {
        userId: user.id,
        group: {
          name: 'Domain Admins',
          isActive: true,
        },
      },
    });

    if (domainAdminMembership) {
      return next({ ctx });
    }

    // Check 3: ACL - user is a workspace admin (has PERMISSIONS on any workspace)
    const workspaceAclEntries = await ctx.prisma.aclEntry.findMany({
      where: {
        principalType: 'user',
        principalId: user.id,
        resourceType: 'workspace',
        deny: false,
      },
      select: {
        permissions: true,
      },
    });

    // Also check group memberships for workspace permissions
    const userGroupIds = await ctx.prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = userGroupIds.map(g => g.groupId);

    if (groupIds.length > 0) {
      const groupAclEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          principalType: 'group',
          principalId: { in: groupIds },
          resourceType: 'workspace',
          deny: false,
        },
        select: {
          permissions: true,
        },
      });
      workspaceAclEntries.push(...groupAclEntries);
    }

    // Check if any entry has PERMISSIONS bit (workspace admin)
    const isWorkspaceAdmin = workspaceAclEntries.some(
      entry => (entry.permissions & ACL_PERMISSIONS.PERMISSIONS) !== 0
    );

    if (isWorkspaceAdmin) {
      return next({ ctx });
    }

    // Check 4: ACL - system-level management permissions
    const [canManageUsers, canManageAcl] = await Promise.all([
      aclService.hasPermission(user.id, 'system', null, ACL_PERMISSIONS.WRITE),
      aclService.hasPermission(user.id, 'system', null, ACL_PERMISSIONS.PERMISSIONS),
    ]);

    if (canManageUsers || canManageAcl) {
      return next({ ctx });
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  })
);

/**
 * API Key only procedure - requires API key authentication
 * Rejects JWT tokens, only accepts kb_ prefixed API keys.
 * Use for external API endpoints that should not allow session auth.
 */
export const apiKeyProcedure = publicProcedure.use(
  middleware(async ({ ctx, next }) => {
    if (ctx.authSource !== 'apiKey' || !ctx.apiKeyContext) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'API key required. Use Authorization: Bearer kb_xxx or ApiKey kb_xxx',
      });
    }

    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'API key is invalid or associated user is inactive',
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as AuthUser,
        apiKeyContext: ctx.apiKeyContext as ApiKeyContext,
        authSource: 'apiKey' as AuthSource,
      },
    });
  })
);

/**
 * Hybrid procedure - accepts both JWT and API key authentication
 * Use for endpoints that should work with both session and API access.
 * The procedure context will include authSource to distinguish.
 */
export const hybridProcedure = publicProcedure.use(
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Use JWT or API key.',
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as AuthUser,
        apiKeyContext: ctx.apiKeyContext ?? null,
        authSource: ctx.authSource as AuthSource,
      },
    });
  })
);
