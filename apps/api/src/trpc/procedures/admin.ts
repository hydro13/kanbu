/*
 * Admin Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for system administration.
 * Requires ADMIN role for all procedures.
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { randomBytes } from 'crypto';
import { router, adminProcedure } from '../router';
import { hashPassword } from '../../lib/auth';
import {
  groupPermissionService,
  scopeService,
  auditService,
  AUDIT_ACTIONS,
  backupService,
  scheduleService,
  internalScheduler,
  retentionService,
  backupNotificationService,
  restoreService,
  verificationService,
  isValidCronExpression,
  describeCronExpression,
  getSchedulerMode,
  isInternalSchedulerEnabled,
} from '../../services';

// =============================================================================
// Input Schemas
// =============================================================================

const listUsersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['id', 'email', 'username', 'name', 'createdAt', 'lastLoginAt']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores and hyphens'
    ),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER'),
});

const updateUserSchema = z.object({
  userId: z.number(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
  isActive: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

const resetPasswordSchema = z.object({
  userId: z.number(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

const sendInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(20),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER'),
  expiresInDays: z.number().min(1).max(30).default(7),
});

const listInvitesSchema = z.object({
  status: z.enum(['pending', 'accepted', 'expired', 'all']).default('all'),
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
});

// =============================================================================
// Admin Router
// =============================================================================

export const adminRouter = router({
  /**
   * List users visible to the current user based on their scope.
   * - Domain Admins: All users
   * - Workspace Admins: Users in their workspace(s)
   * - Others: No access (adminProcedure blocks them)
   */
  listUsers: adminProcedure.input(listUsersSchema).query(async ({ ctx, input }) => {
    const { search, role, isActive, limit, offset, sortBy, sortOrder } = input;
    const userId = ctx.user!.id;

    // Get visible user IDs based on scope
    const visibleUserIds = await scopeService.getUsersInScope(userId);

    // Build where clause with scope filter
    const where: Record<string, unknown> = {
      id: { in: visibleUserIds },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      ctx.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          emailVerified: true,
          twofactorActivated: true,
          lastLoginAt: true,
          lockedUntil: true,
          createdAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      ctx.prisma.user.count({ where }),
    ]);

    // Get Domain Admin status for all users in the result
    const userIds = users.map((u) => u.id);
    const domainAdminIds = await groupPermissionService.getDomainAdminUserIds(userIds);

    // Get workspace counts from ACL entries for all users
    const workspaceCounts = await ctx.prisma.aclEntry.groupBy({
      by: ['principalId'],
      where: {
        principalType: 'user',
        principalId: { in: userIds },
        resourceType: 'workspace',
        deny: false,
      },
      _count: { resourceId: true },
    });
    const workspaceCountMap = new Map(
      workspaceCounts.map((wc) => [wc.principalId, wc._count.resourceId])
    );

    // Get group memberships for all users
    const groupMemberships = await ctx.prisma.groupMember.findMany({
      where: { userId: { in: userIds } },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
          },
        },
      },
    });

    // Group memberships by userId
    const membershipsByUser = new Map<
      number,
      Array<{ id: number; name: string; displayName: string; type: string }>
    >();
    for (const membership of groupMemberships) {
      const existing = membershipsByUser.get(membership.userId) ?? [];
      existing.push({
        id: membership.group.id,
        name: membership.group.name,
        displayName: membership.group.displayName,
        type: membership.group.type,
      });
      membershipsByUser.set(membership.userId, existing);
    }

    return {
      users: users.map((user) => ({
        ...user,
        workspaceCount: workspaceCountMap.get(user.id) ?? 0,
        isLocked: user.lockedUntil ? new Date(user.lockedUntil) > new Date() : false,
        isDomainAdmin: domainAdminIds.has(user.id),
        groups: membershipsByUser.get(user.id) ?? [],
      })),
      total,
      limit,
      offset,
      hasMore: offset + users.length < total,
    };
  }),

  /**
   * Get a single user by ID (with scope check)
   * Only returns users visible to the current user's scope.
   */
  getUser: adminProcedure.input(z.object({ userId: z.number() })).query(async ({ ctx, input }) => {
    // Check if user is in scope
    const visibleUserIds = await scopeService.getUsersInScope(ctx.user!.id);
    if (!visibleUserIds.includes(input.userId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this user',
      });
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        emailVerified: true,
        twofactorActivated: true,
        timezone: true,
        language: true,
        theme: true,
        lastLoginAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        // OAuth connections
        googleId: true,
        githubId: true,
        gitlabId: true,
        // Counts
        _count: {
          select: {
            sessions: true,
            lastLogins: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Get workspace count from ACL entries
    const workspaceCount = await ctx.prisma.aclEntry.count({
      where: {
        principalType: 'user',
        principalId: input.userId,
        resourceType: 'workspace',
        deny: false,
      },
    });

    return {
      ...user,
      workspaceCount,
      sessionCount: user._count.sessions,
      loginCount: user._count.lastLogins,
      isLocked: user.lockedUntil ? new Date(user.lockedUntil) > new Date() : false,
      hasPassword: true, // We don't expose password hash
      hasGoogle: !!user.googleId,
      hasGithub: !!user.githubId,
      hasGitlab: !!user.gitlabId,
    };
  }),

  /**
   * Create a new user
   */
  createUser: adminProcedure.input(createUserSchema).mutation(async ({ ctx, input }) => {
    const { email, username, name, password, role } = input;

    // Check if email already exists
    const existingEmail = await ctx.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Email already registered',
      });
    }

    // Check if username already exists
    const existingUsername = await ctx.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Username already taken',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await ctx.prisma.user.create({
      data: {
        email,
        username,
        name,
        passwordHash,
        role,
        emailVerified: true, // Admin-created users are verified
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit logging
    await auditService.logUserEvent({
      action: AUDIT_ACTIONS.USER_CREATED,
      resourceType: 'user',
      resourceId: user.id,
      resourceName: user.name || user.username,
      changes: { after: { email, username, name, role } },
      userId: ctx.user!.id,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return user;
  }),

  /**
   * Update a user
   */
  updateUser: adminProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
    const { userId, ...data } = input;

    // Check if user exists
    const existing = await ctx.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== existing.email) {
      const emailExists = await ctx.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }
    }

    // Check username uniqueness if changing
    if (data.username && data.username !== existing.username) {
      const usernameExists = await ctx.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (usernameExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already taken',
        });
      }
    }

    // Prevent admin from demoting themselves
    // Note: ctx.user is guaranteed non-null by adminProcedure
    const currentUserId = ctx.user!.id;
    if (userId === currentUserId && data.role && data.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot demote yourself from admin',
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === currentUserId && data.isActive === false) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot deactivate yourself',
      });
    }

    const user = await ctx.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        timezone: true,
        language: true,
        updatedAt: true,
      },
    });

    // Audit logging
    await auditService.logUserEvent({
      action: AUDIT_ACTIONS.USER_UPDATED,
      resourceType: 'user',
      resourceId: user.id,
      resourceName: user.name || user.username,
      changes: {
        before: {
          email: existing.email,
          username: existing.username,
          name: existing.name,
          role: existing.role,
          isActive: existing.isActive,
        },
        after: data,
      },
      userId: ctx.user!.id,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return user;
  }),

  /**
   * Delete a user (soft delete - deactivate)
   */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Cannot delete yourself
      // Note: ctx.user is guaranteed non-null by adminProcedure
      if (input.userId === ctx.user!.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete yourself',
        });
      }

      // Check if user exists
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Soft delete - deactivate
      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: false },
      });

      // Audit logging
      await auditService.logUserEvent({
        action: AUDIT_ACTIONS.USER_DELETED,
        resourceType: 'user',
        resourceId: user.id,
        resourceName: user.name || user.username,
        changes: { before: { isActive: true }, after: { isActive: false } },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true, message: 'User deactivated' };
    }),

  /**
   * Reactivate a deactivated user
   */
  reactivateUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: true },
      });

      // Audit logging
      await auditService.logUserEvent({
        action: AUDIT_ACTIONS.USER_REACTIVATED,
        resourceType: 'user',
        resourceId: user.id,
        resourceName: user.name || user.username,
        changes: { before: { isActive: false }, after: { isActive: true } },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true, message: 'User reactivated' };
    }),

  /**
   * Reset a user's password (admin override)
   */
  resetPassword: adminProcedure.input(resetPasswordSchema).mutation(async ({ ctx, input }) => {
    const { userId, newPassword } = input;

    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await ctx.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Audit logging (no password in changes for security)
    await auditService.logUserEvent({
      action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
      resourceType: 'user',
      resourceId: user.id,
      resourceName: user.name || user.username,
      metadata: { resetByAdmin: true },
      userId: ctx.user!.id,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return { success: true, message: 'Password reset successfully' };
  }),

  /**
   * Unlock a locked user account
   */
  unlockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          lockedUntil: null,
          failedLoginCount: 0,
          lockoutCount: 0, // Reset exponential backoff counter
        },
      });

      // Audit logging
      await auditService.logUserEvent({
        action: AUDIT_ACTIONS.USER_UNLOCKED,
        resourceType: 'user',
        resourceId: user.id,
        resourceName: user.name || user.username,
        changes: {
          before: { lockedUntil: user.lockedUntil, failedLoginCount: user.failedLoginCount },
          after: { lockedUntil: null, failedLoginCount: 0 },
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true, message: 'User unlocked' };
    }),

  /**
   * Disable 2FA for a user (admin override)
   */
  disable2FA: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { twofactorActivated: true },
      });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (!user.twofactorActivated) {
        return { success: true, message: '2FA was not enabled' };
      }

      // Disable 2FA
      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          twofactorActivated: false,
          twofactorSecret: null,
        },
      });

      // Remove backup codes
      await ctx.prisma.userMetadata.deleteMany({
        where: {
          userId: input.userId,
          key: '2fa_backup_codes',
        },
      });

      // Audit logging
      await auditService.logUserEvent({
        action: AUDIT_ACTIONS.USER_2FA_DISABLED,
        resourceType: 'user',
        resourceId: input.userId,
        resourceName: `User #${input.userId}`,
        changes: { before: { twofactorActivated: true }, after: { twofactorActivated: false } },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true, message: '2FA disabled' };
    }),

  /**
   * Revoke all sessions for a user
   */
  revokeSessions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.session.deleteMany({
        where: { userId: input.userId },
      });

      // Audit logging
      await auditService.logUserEvent({
        action: AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
        resourceType: 'user',
        resourceId: input.userId,
        resourceName: `User #${input.userId}`,
        metadata: { sessionsRevoked: result.count },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true, count: result.count };
    }),

  /**
   * Get user login history
   */
  getUserLogins: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const [logins, total] = await Promise.all([
        ctx.prisma.lastLogin.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.lastLogin.count({
          where: { userId: input.userId },
        }),
      ]);

      return {
        logins,
        total,
        hasMore: input.offset + logins.length < total,
      };
    }),

  // ===========================================================================
  // Invite Management
  // ===========================================================================

  /**
   * List all invites with status filtering
   */
  listInvites: adminProcedure.input(listInvitesSchema).query(async ({ ctx, input }) => {
    const { status, limit, offset } = input;
    const now = new Date();

    // Build where clause based on status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status === 'accepted') {
      where.acceptedAt = { not: null };
    } else if (status === 'expired') {
      where.acceptedAt = null;
      where.expiresAt = { lt: now };
    } else if (status === 'pending') {
      where.acceptedAt = null;
      where.expiresAt = { gte: now };
    }

    const [invites, total] = await Promise.all([
      ctx.prisma.invite.findMany({
        where,
        include: {
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      ctx.prisma.invite.count({ where }),
    ]);

    return {
      invites: invites.map((invite) => ({
        ...invite,
        status: invite.acceptedAt ? 'accepted' : invite.expiresAt < now ? 'expired' : 'pending',
      })),
      total,
      limit,
      offset,
      hasMore: offset + invites.length < total,
    };
  }),

  /**
   * Send invites to one or more email addresses
   */
  sendInvite: adminProcedure.input(sendInviteSchema).mutation(async ({ ctx, input }) => {
    const { emails, role, expiresInDays } = input;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const results: Array<{
      email: string;
      success: boolean;
      message: string;
      inviteId?: number;
    }> = [];

    for (const email of emails) {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        results.push({
          email,
          success: false,
          message: 'User already exists with this email',
        });
        continue;
      }

      // Check if there's already a pending invite
      const existingInvite = await ctx.prisma.invite.findFirst({
        where: {
          email,
          acceptedAt: null,
          expiresAt: { gte: new Date() },
        },
      });
      if (existingInvite) {
        results.push({
          email,
          success: false,
          message: 'Pending invite already exists',
        });
        continue;
      }

      // Generate unique token
      const token = randomBytes(32).toString('hex');

      // Create invite
      const invite = await ctx.prisma.invite.create({
        data: {
          email,
          token,
          role,
          invitedById: ctx.user!.id,
          expiresAt,
        },
      });

      // TODO: Send email notification
      // For now, just return the token (in production, this would be sent via email)

      results.push({
        email,
        success: true,
        message: 'Invite sent',
        inviteId: invite.id,
      });
    }

    return {
      results,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
    };
  }),

  /**
   * Cancel (delete) a pending invite
   */
  cancelInvite: adminProcedure
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel an already accepted invite',
        });
      }

      await ctx.prisma.invite.delete({
        where: { id: input.inviteId },
      });

      return { success: true, message: 'Invite cancelled' };
    }),

  /**
   * Resend an invite with a new expiration
   */
  resendInvite: adminProcedure
    .input(
      z.object({
        inviteId: z.number(),
        expiresInDays: z.number().min(1).max(30).default(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot resend an already accepted invite',
        });
      }

      // Generate new token and expiration
      const newToken = randomBytes(32).toString('hex');
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + input.expiresInDays);

      const updated = await ctx.prisma.invite.update({
        where: { id: input.inviteId },
        data: {
          token: newToken,
          expiresAt: newExpiresAt,
        },
      });

      // TODO: Send email notification

      return {
        success: true,
        message: 'Invite resent',
        expiresAt: updated.expiresAt,
      };
    }),

  /**
   * Get invite details by ID
   */
  getInvite: adminProcedure
    .input(z.object({ inviteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findUnique({
        where: { id: input.inviteId },
        include: {
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        });
      }

      const now = new Date();
      return {
        ...invite,
        status: invite.acceptedAt ? 'accepted' : invite.expiresAt < now ? 'expired' : 'pending',
      };
    }),

  // ===========================================================================
  // System Settings
  // ===========================================================================

  /**
   * Get all system settings
   */
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const settingsMap: Record<string, string | null> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return {
      settings: settingsMap,
      raw: settings,
    };
  }),

  /**
   * Get a single setting by key
   */
  getSetting: adminProcedure.input(z.object({ key: z.string() })).query(async ({ ctx, input }) => {
    const setting = await ctx.prisma.systemSetting.findUnique({
      where: { key: input.key },
    });

    return setting?.value ?? null;
  }),

  /**
   * Set a system setting
   */
  setSetting: adminProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        value: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get existing value for audit log
      const existing = await ctx.prisma.systemSetting.findUnique({
        where: { key: input.key },
      });

      const setting = await ctx.prisma.systemSetting.upsert({
        where: { key: input.key },
        update: {
          value: input.value,
          changedBy: ctx.user!.id,
          changedAt: new Date(),
        },
        create: {
          key: input.key,
          value: input.value,
          changedBy: ctx.user!.id,
        },
      });

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'setting',
        resourceName: input.key,
        changes: {
          before: existing ? { value: existing.value } : null,
          after: { value: input.value },
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return setting;
    }),

  /**
   * Set multiple settings at once
   */
  setSettings: adminProcedure
    .input(
      z.object({
        settings: z.record(z.string(), z.string().nullable()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results: Array<{ key: string; success: boolean }> = [];

      const entries = Object.entries(input.settings) as Array<[string, string | null]>;
      for (const [key, value] of entries) {
        await ctx.prisma.systemSetting.upsert({
          where: { key },
          update: {
            value,
            changedBy: ctx.user!.id,
            changedAt: new Date(),
          },
          create: {
            key,
            value,
            changedBy: ctx.user!.id,
          },
        });
        results.push({ key, success: true });
      }

      return { results, count: results.length };
    }),

  /**
   * Delete a system setting
   */
  deleteSetting: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.systemSetting.findUnique({
        where: { key: input.key },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setting not found',
        });
      }

      await ctx.prisma.systemSetting.delete({
        where: { key: input.key },
      });

      return { success: true };
    }),

  // ===========================================================================
  // Workspace Management (SYSTEM_ADMIN)
  // ===========================================================================

  /**
   * List workspaces the user can manage
   * - Domain Admins see all workspaces
   * - Workspace Admins only see workspaces they are admin of
   *
   * This replaces the old listAllWorkspaces which showed everything to all admins.
   */
  listAllWorkspaces: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(25),
        offset: z.number().min(0).default(0),
        sortBy: z.enum(['id', 'name', 'createdAt', 'updatedAt']).default('name'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, isActive, limit, offset, sortBy, sortOrder } = input;
      const userId = ctx.user!.id;

      // Check if user is a Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);

      // Get workspace IDs the user can manage (if not Domain Admin)
      let allowedWorkspaceIds: number[] | null = null;
      if (!isDomainAdmin) {
        const userWorkspaces = await groupPermissionService.getUserWorkspaces(userId);
        // Only include workspaces where user is admin
        allowedWorkspaceIds = userWorkspaces.filter((ws) => ws.isAdmin).map((ws) => ws.id);

        // If no workspaces, return empty result
        if (allowedWorkspaceIds.length === 0) {
          return {
            workspaces: [],
            total: 0,
            limit,
            offset,
            hasMore: false,
            isDomainAdmin: false,
          };
        }
      }

      // Build where clause
      const where: Record<string, unknown> = {};

      // Restrict to allowed workspaces if not Domain Admin
      if (allowedWorkspaceIds !== null) {
        where.id = { in: allowedWorkspaceIds };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [workspaces, total] = await Promise.all([
        ctx.prisma.workspace.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                projects: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.workspace.count({ where }),
      ]);

      // Get member counts from ACL entries for all workspaces
      const workspaceIds = workspaces.map((w) => w.id);
      const memberCounts = await ctx.prisma.aclEntry.groupBy({
        by: ['resourceId'],
        where: {
          resourceType: 'workspace',
          resourceId: { in: workspaceIds },
          principalType: 'user',
          deny: false,
        },
        _count: { principalId: true },
      });
      const memberCountMap = new Map(
        memberCounts.map((mc) => [mc.resourceId, mc._count.principalId])
      );

      return {
        workspaces: workspaces.map((ws) => ({
          ...ws,
          memberCount: memberCountMap.get(ws.id) ?? 0,
          projectCount: ws._count.projects,
        })),
        total,
        limit,
        offset,
        hasMore: offset + workspaces.length < total,
        isDomainAdmin,
      };
    }),

  /**
   * Get a single workspace by ID (admin view with all details)
   * - Domain Admins can view any workspace
   * - Workspace Admins can only view their own workspace
   */
  getWorkspace: adminProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id;

      // Check authorization
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
      if (!isDomainAdmin) {
        const isWsAdmin = await groupPermissionService.isWorkspaceAdmin(userId, input.workspaceId);
        if (!isWsAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this workspace',
          });
        }
      }

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          settings: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              projects: true,
              invitations: true,
            },
          },
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      // Get member count from ACL entries
      const memberCount = await ctx.prisma.aclEntry.count({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          deny: false,
        },
      });

      return {
        ...workspace,
        memberCount,
        projectCount: workspace._count.projects,
        pendingInvites: workspace._count.invitations,
      };
    }),

  /**
   * Update a workspace (admin override)
   * - Domain Admins can update any workspace
   * - Workspace Admins can only update their own workspace
   */
  updateWorkspace: adminProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).nullable().optional(),
        logoUrl: z.string().url().max(500).nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, ...data } = input;
      const userId = ctx.user!.id;

      // Check authorization
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
      if (!isDomainAdmin) {
        const isWsAdmin = await groupPermissionService.isWorkspaceAdmin(userId, workspaceId);
        if (!isWsAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this workspace',
          });
        }
      }

      const existing = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      const workspace = await ctx.prisma.workspace.update({
        where: { id: workspaceId },
        data,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return workspace;
    }),

  /**
   * Delete a workspace (soft delete - deactivate)
   * Only Domain Admins can delete workspaces
   */
  deleteWorkspace: adminProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id;

      // Only Domain Admins can delete workspaces
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
      if (!isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can delete workspaces',
        });
      }

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      // Soft delete
      await ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { isActive: false },
      });

      return { success: true, message: 'Workspace deactivated' };
    }),

  /**
   * Reactivate a deactivated workspace
   * Only Domain Admins can reactivate workspaces
   */
  reactivateWorkspace: adminProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id;

      // Only Domain Admins can reactivate workspaces
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
      if (!isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can reactivate workspaces',
        });
      }

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      await ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { isActive: true },
      });

      return { success: true, message: 'Workspace reactivated' };
    }),

  // ===========================================================================
  // Backup Management
  // ===========================================================================

  /**
   * Create a database backup
   * Updated: 2026-01-18 - Refactored to use BackupService with flexible storage
   */
  createBackup: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await backupService.createDatabaseBackup();

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.BACKUP_CREATED,
        resourceType: 'backup',
        resourceName: result.fileName,
        metadata: {
          type: 'database',
          fileSizeKB: result.fileSizeKB,
          totalBackups: result.totalBackups,
          storagePath: result.storagePath,
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Backup failed: ${message}`,
      });
    }
  }),

  /**
   * Create a full source code backup
   * Updated: 2026-01-18 - Refactored to use BackupService with flexible storage
   */
  createSourceBackup: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await backupService.createSourceBackup();

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.BACKUP_CREATED,
        resourceType: 'backup',
        resourceName: result.fileName,
        metadata: {
          type: 'source',
          fileSizeMB: result.fileSizeMB,
          totalBackups: result.totalBackups,
          storagePath: result.storagePath,
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Source backup failed: ${message}`,
      });
    }
  }),

  /**
   * Get backup system status
   * Added: 2026-01-18 - Phase 2 Self-Service
   */
  getBackupStatus: adminProcedure.query(async () => {
    try {
      return await backupService.getStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get backup status: ${message}`,
      });
    }
  }),

  /**
   * List all backups
   * Added: 2026-01-18 - Phase 2 Self-Service
   */
  listBackups: adminProcedure.query(async () => {
    try {
      return await backupService.listBackups();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to list backups: ${message}`,
      });
    }
  }),

  /**
   * Delete a backup file
   * Added: 2026-01-18 - Phase 2 Self-Service
   */
  deleteBackup: adminProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await backupService.deleteBackup(input.filename);

        // Audit logging
        await auditService.logSettingsEvent({
          action: AUDIT_ACTIONS.BACKUP_DELETED,
          resourceType: 'backup',
          resourceName: input.filename,
          metadata: {},
          userId: ctx.user!.id,
          ipAddress:
            ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
        });

        return { success: true, message: `Backup ${input.filename} deleted` };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete backup: ${message}`,
        });
      }
    }),

  /**
   * Download a backup file
   * Returns base64 encoded file data for browser download
   */
  downloadBackup: adminProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const buffer = await backupService.downloadBackup(input.filename);
        return {
          filename: input.filename,
          data: buffer.toString('base64'),
          size: buffer.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to download backup: ${message}`,
        });
      }
    }),

  // ===========================================================================
  // Backup Scheduling (Phase 3)
  // ===========================================================================

  /**
   * Get scheduler status
   */
  getSchedulerStatus: adminProcedure.query(async () => {
    return {
      ...internalScheduler.getStatus(),
      mode: getSchedulerMode(),
      isEnabled: isInternalSchedulerEnabled(),
    };
  }),

  /**
   * List all backup schedules
   */
  listBackupSchedules: adminProcedure.query(async () => {
    const schedules = await scheduleService.listSchedules();
    return schedules.map((schedule) => ({
      ...schedule,
      cronDescription: describeCronExpression(schedule.cronExpression),
    }));
  }),

  /**
   * Get a single backup schedule
   */
  getBackupSchedule: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const schedule = await scheduleService.getSchedule(input.id);
    if (!schedule) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Schedule not found',
      });
    }
    return {
      ...schedule,
      cronDescription: describeCronExpression(schedule.cronExpression),
    };
  }),

  /**
   * Create a new backup schedule
   */
  createBackupSchedule: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(['DATABASE', 'SOURCE']),
        cronExpression: z.string().min(9).max(100),
        enabled: z.boolean().default(true),
        retentionDays: z.number().min(1).max(365).default(30),
        keepDaily: z.number().min(1).max(30).default(7),
        keepWeekly: z.number().min(1).max(12).default(4),
        keepMonthly: z.number().min(1).max(12).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate cron expression
      if (!isValidCronExpression(input.cronExpression)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid cron expression: ${input.cronExpression}`,
        });
      }

      const schedule = await scheduleService.createSchedule({
        ...input,
        createdById: ctx.user!.id,
      });

      // Reload scheduler to pick up new schedule
      if (isInternalSchedulerEnabled()) {
        await internalScheduler.reload();
      }

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup_schedule',
        resourceName: schedule.name,
        changes: { after: input },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return {
        ...schedule,
        cronDescription: describeCronExpression(schedule.cronExpression),
      };
    }),

  /**
   * Update a backup schedule
   */
  updateBackupSchedule: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        cronExpression: z.string().min(9).max(100).optional(),
        enabled: z.boolean().optional(),
        retentionDays: z.number().min(1).max(365).optional(),
        keepDaily: z.number().min(1).max(30).optional(),
        keepWeekly: z.number().min(1).max(12).optional(),
        keepMonthly: z.number().min(1).max(12).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Validate cron expression if provided
      if (data.cronExpression && !isValidCronExpression(data.cronExpression)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid cron expression: ${data.cronExpression}`,
        });
      }

      const schedule = await scheduleService.updateSchedule(id, data);

      // Reload scheduler to pick up changes
      if (isInternalSchedulerEnabled()) {
        await internalScheduler.reload();
      }

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup_schedule',
        resourceName: schedule.name,
        changes: { after: data },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return {
        ...schedule,
        cronDescription: describeCronExpression(schedule.cronExpression),
      };
    }),

  /**
   * Delete a backup schedule
   */
  deleteBackupSchedule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const schedule = await scheduleService.getSchedule(input.id);
      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      await scheduleService.deleteSchedule(input.id);

      // Reload scheduler to remove the schedule
      if (isInternalSchedulerEnabled()) {
        await internalScheduler.reload();
      }

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup_schedule',
        resourceName: schedule.name,
        changes: { before: { id: input.id, name: schedule.name }, after: null },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true, message: 'Schedule deleted' };
    }),

  /**
   * Run a schedule now (manual trigger)
   */
  runScheduleNow: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await scheduleService.executeSchedule(input.id, 'MANUAL');

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.BACKUP_CREATED,
        resourceType: 'backup',
        resourceName: result.execution.filename ?? 'manual-backup',
        metadata: {
          scheduleId: input.id,
          trigger: 'manual',
          success: result.success,
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    }),

  /**
   * Preview retention policy effect
   */
  previewRetention: adminProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      const schedule = await scheduleService.getSchedule(input.scheduleId);
      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      return retentionService.previewRetention(schedule);
    }),

  // ===========================================================================
  // Backup Execution History (Phase 3)
  // ===========================================================================

  /**
   * Get execution history
   */
  getExecutionHistory: adminProcedure
    .input(
      z.object({
        scheduleId: z.number().optional(),
        type: z.enum(['DATABASE', 'SOURCE']).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return scheduleService.getExecutionHistory({
        scheduleId: input.scheduleId,
        type: input.type,
        limit: input.limit,
      });
    }),

  /**
   * Get recent executions for dashboard
   */
  getRecentExecutions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return scheduleService.getRecentExecutions(input.limit);
    }),

  /**
   * Get execution statistics
   */
  getExecutionStats: adminProcedure.query(async () => {
    return scheduleService.getExecutionStats();
  }),

  // ===========================================================================
  // Backup Restore (Phase 3)
  // ===========================================================================

  /**
   * Validate a backup for restore
   */
  validateRestore: adminProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      return restoreService.validateBackup(input.filename);
    }),

  /**
   * Get list of restorable backups
   */
  getRestorableBackups: adminProcedure.query(async () => {
    return restoreService.getRestorableBackups();
  }),

  /**
   * Restore a database backup
   * WARNING: This will overwrite the current database!
   */
  restoreDatabase: adminProcedure
    .input(
      z.object({
        filename: z.string(),
        createPreRestoreBackup: z.boolean().default(true),
        skipVerification: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Audit logging before restore
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup',
        resourceName: input.filename,
        metadata: {
          action: 'restore_started',
          createPreRestoreBackup: input.createPreRestoreBackup,
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      const result = await restoreService.restoreDatabase(input.filename, {
        createPreRestoreBackup: input.createPreRestoreBackup,
        skipVerification: input.skipVerification,
        performedById: ctx.user!.id,
      });

      // Audit logging after restore
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup',
        resourceName: input.filename,
        metadata: {
          action: result.success ? 'restore_completed' : 'restore_failed',
          preRestoreBackup: result.preRestoreBackup,
          durationMs: result.durationMs,
          tablesRestored: result.tablesRestored,
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.message,
        });
      }

      return result;
    }),

  // ===========================================================================
  // Backup Notifications (Phase 3)
  // ===========================================================================

  /**
   * Get notification configuration
   */
  getNotificationConfig: adminProcedure.query(async () => {
    const config = await backupNotificationService.getConfig();
    // Don't expose the full webhook secret
    return {
      ...config,
      webhookSecret: config?.webhookSecret ? '********' : null,
      hasWebhookSecret: !!config?.webhookSecret,
    };
  }),

  /**
   * Update notification configuration
   */
  updateNotificationConfig: adminProcedure
    .input(
      z.object({
        notifyOnSuccess: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
        webhookUrl: z.string().url().nullable().optional(),
        webhookSecret: z.string().max(255).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = await backupNotificationService.updateConfig(input);

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup_notification',
        resourceName: 'notification_config',
        changes: {
          after: {
            notifyOnSuccess: config.notifyOnSuccess,
            notifyOnFailure: config.notifyOnFailure,
            hasWebhook: !!config.webhookUrl,
          },
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return {
        ...config,
        webhookSecret: config.webhookSecret ? '********' : null,
        hasWebhookSecret: !!config.webhookSecret,
      };
    }),

  /**
   * Test webhook configuration
   */
  testWebhook: adminProcedure.mutation(async () => {
    return backupNotificationService.testWebhook();
  }),

  // ===========================================================================
  // Backup Verification (Phase 4.4)
  // ===========================================================================

  /**
   * Verify a single backup file integrity
   */
  verifyBackup: adminProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await verificationService.verifyBackup(input.filename);

      // Audit logging
      await auditService.logSettingsEvent({
        action: AUDIT_ACTIONS.SETTING_CHANGED,
        resourceType: 'backup',
        resourceName: input.filename,
        metadata: {
          action: 'verification',
          success: result.success,
          message: result.message,
        },
        userId: ctx.user!.id,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    }),

  /**
   * Verify all pending backups (batch verification)
   */
  verifyAllBackups: adminProcedure.mutation(async ({ ctx }) => {
    const result = await verificationService.verifyAllPending();

    // Audit logging
    await auditService.logSettingsEvent({
      action: AUDIT_ACTIONS.SETTING_CHANGED,
      resourceType: 'backup',
      resourceName: 'batch_verification',
      metadata: {
        action: 'batch_verification',
        total: result.stats.total,
        success: result.stats.success,
        failed: result.stats.failed,
      },
      userId: ctx.user!.id,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return result;
  }),

  /**
   * Get verification statistics
   */
  getVerificationStats: adminProcedure.query(async () => {
    return verificationService.getVerificationStats();
  }),

  /**
   * Quick integrity check (existence and size only)
   */
  quickCheckBackup: adminProcedure
    .input(z.object({ filename: z.string() }))
    .query(async ({ input }) => {
      return verificationService.quickCheck(input.filename);
    }),
});
