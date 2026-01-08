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
 * ═══════════════════════════════════════════════════════════════════
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Context, AuthUser } from './context';
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

/**
 * Protected procedure - requires authentication
 * Adds user to context with non-null type
 */
export const protectedProcedure = publicProcedure.use(
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
 * Checks in order:
 * 1. ACL: admin:root resource with PERMISSIONS bit (Full Control)
 * 2. Legacy: Domain Admins group membership
 */
export const adminProcedure = protectedProcedure.use(
  middleware(async ({ ctx, next }) => {
    // ctx.user is guaranteed non-null by protectedProcedure
    const user = ctx.user as AuthUser;

    // Check 1: ACL - user has Full Control on admin:root
    // resourceId=null means "all admin resources" (root level)
    const hasAclAdmin = await aclService.hasPermission(
      user.id,
      'admin',
      null, // root level admin access
      ACL_PERMISSIONS.PERMISSIONS // P bit = can manage permissions = full admin
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

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  })
);
