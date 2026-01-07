/*
 * User Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for user profile management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T03:58 CET
 *
 * Modified by:
 * Session: 9a49de0d-74ae-4a76-a6f6-53c7e3f2218b
 * Signed: 2025-12-29T16:53 CET
 * Change: Avatar storage migrated to database (uploadAvatar, removeAvatar)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:47 CET
 * Change: Added getMyTasks and getMySubtasks procedures (USER-02)
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import * as OTPAuth from 'otpauth'
import { router, protectedProcedure } from '../router'
import { hashPassword, verifyPassword } from '../../lib/auth'

// =============================================================================
// Input Schemas
// =============================================================================

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultFilter: z.string().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
})

const timeTrackingSchema = z.object({
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  limit: z.number().min(1).max(100).default(50),
})

const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

// =============================================================================
// User Router
// =============================================================================

// =============================================================================
// Social Links Schema
// =============================================================================

const socialLinkSchema = z.object({
  value: z.string(),
  visible: z.boolean(),
})

const updateSocialLinksSchema = z.object({
  // Messaging
  whatsapp: socialLinkSchema.nullable(),
  slack: socialLinkSchema.nullable(),
  discord: socialLinkSchema.nullable(),
  // Professional/Social
  linkedin: socialLinkSchema.nullable(),
  github: socialLinkSchema.nullable(),
  reddit: socialLinkSchema.nullable(),
  // Video calls (placeholders for future)
  zoom: socialLinkSchema.nullable(),
  googlemeet: socialLinkSchema.nullable(),
  teams: socialLinkSchema.nullable(),
  // Code collaboration (placeholders for future)
  gitlab: socialLinkSchema.nullable(),
})

const SOCIAL_PLATFORMS = [
  'whatsapp', 'slack', 'discord',
  'linkedin', 'github', 'reddit',
  'zoom', 'googlemeet', 'teams',
  'gitlab',
] as const
type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

function getSocialMetadataKey(platform: SocialPlatform): string {
  return `social_${platform}`
}

export const userRouter = router({
  /**
   * Get current user's full profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        language: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        // Security - 2FA
        twofactorActivated: true,
        // Security - Brute force
        failedLoginCount: true,
        lockedUntil: true,
        // OAuth providers
        googleId: true,
        githubId: true,
        gitlabId: true,
        // Preferences
        theme: true,
        defaultFilter: true,
        // Public access
        publicToken: true,
        // Budgettering
        hourlyRate: true,
        // Notification preferences
        notificationsEnabled: true,
        notificationFilter: true,
        // Workspaces with details
        workspaces: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
          orderBy: { workspace: { name: 'asc' } },
        },
        _count: {
          select: {
            workspaces: true,
          },
        },
      },
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    // Get recent projects the user is member of
    const recentProjects = await ctx.prisma.project.findMany({
      where: {
        members: { some: { userId: ctx.user.id } },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        identifier: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    return {
      ...user,
      workspaceCount: user._count.workspaces,
      workspaces: user.workspaces.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        logoUrl: m.workspace.logoUrl,
        role: m.role,
      })),
      recentProjects,
    }
  }),

  /**
   * Update current user's profile
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
          timezone: true,
          language: true,
          theme: true,
          defaultFilter: true,
          updatedAt: true,
        },
      })

      return user
    }),

  /**
   * Change current user's password
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      // Get user with password hash
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          passwordHash: true,
        },
      })

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change password for this account',
        })
      }

      // Verify current password
      const isValid = await verifyPassword(user.passwordHash, input.currentPassword)
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        })
      }

      // Hash new password
      const newPasswordHash = await hashPassword(input.newPassword)

      // Update password
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { passwordHash: newPasswordHash },
      })

      return { success: true, message: 'Password changed successfully' }
    }),

  /**
   * Verify email address
   * DEV MODE: Directly marks email as verified (no email service configured)
   * TODO: Implement proper email verification flow with tokens
   */
  verifyEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { emailVerified: true },
    })

    if (user?.emailVerified) {
      return { success: true, message: 'Email already verified' }
    }

    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { emailVerified: true },
    })

    return { success: true, message: 'Email verified successfully' }
  }),

  /**
   * Upload avatar with base64 encoded image
   * Stores in database for reliability
   */
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        base64: z.string().min(1),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Decode base64 to buffer
      const buffer = Buffer.from(input.base64, 'base64')
      const size = buffer.length

      // Validate size (max 5MB)
      if (size > 5 * 1024 * 1024) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size must be less than 5MB',
        })
      }

      // Upsert avatar in database
      await ctx.prisma.userAvatar.upsert({
        where: { userId: ctx.user.id },
        update: {
          data: buffer,
          mimeType: input.mimeType,
          size,
        },
        create: {
          userId: ctx.user.id,
          data: buffer,
          mimeType: input.mimeType,
          size,
        },
      })

      // Update user's avatarUrl to point to the API endpoint
      const avatarUrl = `/api/avatar/${ctx.user.id}`
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { avatarUrl },
      })

      return {
        success: true,
        avatarUrl,
        message: 'Avatar uploaded successfully',
      }
    }),

  /**
   * Remove avatar
   */
  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    // Delete avatar from database
    await ctx.prisma.userAvatar.deleteMany({
      where: { userId: ctx.user.id },
    })

    // Clear avatar URL
    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { avatarUrl: null },
    })

    return { success: true, message: 'Avatar removed' }
  }),

  /**
   * Delete current user's account
   * Soft delete by deactivating
   */
  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Get user with password hash
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          passwordHash: true,
        },
      })

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete this account',
        })
      }

      // Verify password
      const isValid = await verifyPassword(user.passwordHash, input.password)
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Password is incorrect',
        })
      }

      // Soft delete - deactivate account
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { isActive: false },
      })

      return { success: true, message: 'Account deactivated' }
    }),

  /**
   * Get time tracking data for current user
   * Shows hours worked across all projects/tasks
   */
  getTimeTracking: protectedProcedure
    .input(timeTrackingSchema)
    .query(async ({ ctx, input }) => {
      const dateFilter = {
        ...(input.dateFrom && { gte: new Date(input.dateFrom) }),
        ...(input.dateTo && { lte: new Date(input.dateTo) }),
      }
      const hasDateFilter = input.dateFrom || input.dateTo

      // Get subtasks assigned to this user with time tracking
      const subtasks = await ctx.prisma.subtask.findMany({
        where: {
          assigneeId: ctx.user.id,
          timeSpent: { gt: 0 },
          ...(hasDateFilter && { updatedAt: dateFilter }),
        },
        select: {
          id: true,
          title: true,
          status: true,
          timeEstimated: true,
          timeSpent: true,
          updatedAt: true,
          task: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit,
      })

      // Get tasks assigned to this user with time tracking
      const tasks = await ctx.prisma.task.findMany({
        where: {
          assignees: { some: { userId: ctx.user.id } },
          timeSpent: { gt: 0 },
          ...(hasDateFilter && { updatedAt: dateFilter }),
        },
        select: {
          id: true,
          title: true,
          isActive: true,
          timeEstimated: true,
          timeSpent: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit,
      })

      // Aggregate totals per project
      const projectTotals = new Map<number, { name: string; estimated: number; spent: number }>()

      for (const subtask of subtasks) {
        const projectId = subtask.task.project.id
        const existing = projectTotals.get(projectId) ?? {
          name: subtask.task.project.name,
          estimated: 0,
          spent: 0,
        }
        projectTotals.set(projectId, {
          name: existing.name,
          estimated: existing.estimated + subtask.timeEstimated,
          spent: existing.spent + subtask.timeSpent,
        })
      }

      for (const task of tasks) {
        const projectId = task.project.id
        const existing = projectTotals.get(projectId) ?? {
          name: task.project.name,
          estimated: 0,
          spent: 0,
        }
        projectTotals.set(projectId, {
          name: existing.name,
          estimated: existing.estimated + task.timeEstimated,
          spent: existing.spent + task.timeSpent,
        })
      }

      // Calculate overall totals
      let totalEstimated = 0
      let totalSpent = 0
      const byProject = Array.from(projectTotals.entries()).map(([projectId, data]) => {
        totalEstimated += data.estimated
        totalSpent += data.spent
        return {
          projectId,
          projectName: data.name,
          timeEstimated: Math.round(data.estimated * 100) / 100,
          timeSpent: Math.round(data.spent * 100) / 100,
        }
      })

      // Sort projects by time spent (highest first)
      byProject.sort((a, b) => b.timeSpent - a.timeSpent)

      // Combine recent entries (tasks + subtasks)
      const recentEntries = [
        ...subtasks.map((s) => ({
          type: 'subtask' as const,
          id: s.id,
          title: s.title,
          taskId: s.task.id,
          taskTitle: s.task.title,
          projectId: s.task.project.id,
          projectName: s.task.project.name,
          timeEstimated: s.timeEstimated,
          timeSpent: s.timeSpent,
          updatedAt: s.updatedAt,
          isActive: s.status !== 'DONE',
        })),
        ...tasks.map((t) => ({
          type: 'task' as const,
          id: t.id,
          title: t.title,
          taskId: t.id,
          taskTitle: t.title,
          projectId: t.project.id,
          projectName: t.project.name,
          timeEstimated: t.timeEstimated,
          timeSpent: t.timeSpent,
          updatedAt: t.updatedAt,
          isActive: t.isActive,
        })),
      ]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, input.limit)

      return {
        totalEstimated: Math.round(totalEstimated * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        byProject,
        recentEntries,
      }
    }),

  /**
   * Get last logins for current user
   */
  getLastLogins: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const [logins, total] = await Promise.all([
        ctx.prisma.lastLogin.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.lastLogin.count({
          where: { userId: ctx.user.id },
        }),
      ])

      return {
        logins,
        total,
        hasMore: input.offset + logins.length < total,
      }
    }),

  /**
   * Get active sessions (persistent connections)
   */
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()

    const sessions = await ctx.prisma.session.findMany({
      where: {
        userId: ctx.user.id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }))
  }),

  /**
   * Get remember tokens
   */
  getRememberTokens: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()

    const tokens = await ctx.prisma.rememberToken.findMany({
      where: {
        userId: ctx.user.id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    return tokens.map((t) => ({
      id: t.id,
      tokenPreview: t.token.slice(0, 8) + '...',
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    }))
  }),

  /**
   * Revoke a session
   */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.session.deleteMany({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      })
      return { success: true }
    }),

  /**
   * Revoke a remember token
   */
  revokeRememberToken: protectedProcedure
    .input(z.object({ tokenId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.rememberToken.deleteMany({
        where: {
          id: input.tokenId,
          userId: ctx.user.id,
        },
      })
      return { success: true }
    }),

  /**
   * Revoke all sessions except current
   */
  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    // We can't know the current session ID from JWT, so we delete all
    const result = await ctx.prisma.session.deleteMany({
      where: { userId: ctx.user.id },
    })
    return { success: true, count: result.count }
  }),

  /**
   * Get password reset history
   */
  getPasswordResets: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const [resets, total] = await Promise.all([
        ctx.prisma.passwordReset.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
          select: {
            id: true,
            ip: true,
            userAgent: true,
            isUsed: true,
            expiresAt: true,
            createdAt: true,
          },
        }),
        ctx.prisma.passwordReset.count({
          where: { userId: ctx.user.id },
        }),
      ])

      return {
        resets,
        total,
        hasMore: input.offset + resets.length < total,
      }
    }),

  /**
   * Get user metadata (custom key-value pairs)
   */
  getMetadata: protectedProcedure.query(async ({ ctx }) => {
    const metadata = await ctx.prisma.userMetadata.findMany({
      where: { userId: ctx.user.id },
      orderBy: { key: 'asc' },
    })

    return metadata
  }),

  /**
   * Set a metadata value
   */
  setMetadata: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.userMetadata.findFirst({
        where: {
          userId: ctx.user.id,
          key: input.key,
        },
      })

      if (existing) {
        await ctx.prisma.userMetadata.update({
          where: { id: existing.id },
          data: { value: input.value },
        })
      } else {
        await ctx.prisma.userMetadata.create({
          data: {
            userId: ctx.user.id,
            key: input.key,
            value: input.value,
          },
        })
      }

      return { success: true }
    }),

  /**
   * Delete a metadata key
   */
  deleteMetadata: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userMetadata.deleteMany({
        where: {
          userId: ctx.user.id,
          key: input.key,
        },
      })
      return { success: true }
    }),

  // ===========================================================================
  // TWO-FACTOR AUTHENTICATION
  // ===========================================================================

  /**
   * Get 2FA status
   */
  get2FAStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { twofactorActivated: true },
    })
    return { enabled: user?.twofactorActivated ?? false }
  }),

  /**
   * Setup 2FA - generate secret and return QR code URI
   */
  setup2FA: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { email: true, twofactorActivated: true },
    })

    if (user?.twofactorActivated) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '2FA is already enabled',
      })
    }

    // Generate secret
    const secret = new OTPAuth.Secret({ size: 16 })

    // Create TOTP object
    const totp = new OTPAuth.TOTP({
      issuer: 'Kanbu',
      label: user?.email ?? 'user',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })

    // Store secret temporarily (not activated yet)
    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { twofactorSecret: secret.base32 },
    })

    return {
      secret: secret.base32,
      qrCodeUri: totp.toString(),
    }
  }),

  /**
   * Verify and activate 2FA
   */
  verify2FA: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { email: true, twofactorSecret: true, twofactorActivated: true },
      })

      if (!user?.twofactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please setup 2FA first',
        })
      }

      if (user.twofactorActivated) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is already activated',
        })
      }

      // Verify token
      const totp = new OTPAuth.TOTP({
        issuer: 'Kanbu',
        label: user.email ?? 'user',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.twofactorSecret),
      })

      const delta = totp.validate({ token: input.token, window: 1 })

      if (delta === null) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid verification code',
        })
      }

      // Generate backup codes
      const backupCodes: string[] = []
      for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase()
        backupCodes.push(code)
      }

      // Store backup codes as metadata
      await ctx.prisma.userMetadata.upsert({
        where: {
          userId_key: {
            userId: ctx.user.id,
            key: '2fa_backup_codes',
          },
        },
        update: { value: JSON.stringify(backupCodes) },
        create: {
          userId: ctx.user.id,
          key: '2fa_backup_codes',
          value: JSON.stringify(backupCodes),
        },
      })

      // Activate 2FA
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { twofactorActivated: true },
      })

      return {
        success: true,
        backupCodes,
      }
    }),

  /**
   * Disable 2FA
   */
  disable2FA: protectedProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { passwordHash: true, twofactorActivated: true },
      })

      if (!user?.twofactorActivated) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not enabled',
        })
      }

      if (!user.passwordHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot disable 2FA for this account',
        })
      }

      // Verify password
      const isValid = await verifyPassword(user.passwordHash, input.password)
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Password is incorrect',
        })
      }

      // Disable 2FA
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          twofactorActivated: false,
          twofactorSecret: null,
        },
      })

      // Remove backup codes
      await ctx.prisma.userMetadata.deleteMany({
        where: {
          userId: ctx.user.id,
          key: '2fa_backup_codes',
        },
      })

      return { success: true }
    }),

  // ===========================================================================
  // PUBLIC ACCESS
  // ===========================================================================

  /**
   * Get public access status
   */
  getPublicAccess: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { publicToken: true },
    })
    return {
      enabled: !!user?.publicToken,
      token: user?.publicToken ?? null,
    }
  }),

  /**
   * Enable public access - generate a token
   */
  enablePublicAccess: protectedProcedure.mutation(async ({ ctx }) => {
    const crypto = await import('crypto')

    // Generate a random 64-character token
    const token = crypto.randomBytes(32).toString('hex')

    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { publicToken: token },
    })

    return { success: true, token }
  }),

  /**
   * Disable public access - remove token
   */
  disablePublicAccess: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { publicToken: null },
    })

    return { success: true }
  }),

  /**
   * Regenerate public access token
   */
  regeneratePublicToken: protectedProcedure.mutation(async ({ ctx }) => {
    const crypto = await import('crypto')

    // Generate a new random token
    const token = crypto.randomBytes(32).toString('hex')

    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { publicToken: token },
    })

    return { success: true, token }
  }),

  // ===========================================================================
  // EXTERNAL ACCOUNTS (OAuth)
  // ===========================================================================

  /**
   * Get connected OAuth accounts
   */
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        googleId: true,
        githubId: true,
        gitlabId: true,
      },
    })

    return {
      google: {
        connected: !!user?.googleId,
        id: user?.googleId ?? null,
      },
      github: {
        connected: !!user?.githubId,
        id: user?.githubId ?? null,
      },
      gitlab: {
        connected: !!user?.gitlabId,
        id: user?.gitlabId ? String(user.gitlabId) : null,
      },
    }
  }),

  /**
   * Unlink an OAuth account
   */
  unlinkAccount: protectedProcedure
    .input(z.object({
      provider: z.enum(['google', 'github', 'gitlab']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if this is the user's only auth method
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          passwordHash: true,
          googleId: true,
          githubId: true,
          gitlabId: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Count available auth methods
      const authMethods = [
        !!user.passwordHash,
        !!user.googleId,
        !!user.githubId,
        !!user.gitlabId,
      ].filter(Boolean).length

      if (authMethods <= 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot unlink your only authentication method. Set a password first or link another account.',
        })
      }

      // Unlink the account
      const updateData =
        input.provider === 'google'
          ? { googleId: null }
          : input.provider === 'github'
            ? { githubId: null }
            : { gitlabId: null }

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: updateData,
      })

      return { success: true }
    }),

  // ===========================================================================
  // HOURLY RATE
  // ===========================================================================

  /**
   * Get hourly rate
   */
  getHourlyRate: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { hourlyRate: true },
    })

    return {
      hourlyRate: user?.hourlyRate ? Number(user.hourlyRate) : null,
    }
  }),

  /**
   * Update hourly rate
   */
  updateHourlyRate: protectedProcedure
    .input(z.object({
      hourlyRate: z.number().min(0).max(10000).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { hourlyRate: input.hourlyRate },
      })

      return { success: true }
    }),

  // ===========================================================================
  // SOCIAL LINKS
  // ===========================================================================

  /**
   * Get current user's social links (full data including visibility)
   */
  getSocialLinks: protectedProcedure.query(async ({ ctx }) => {
    const metadata = await ctx.prisma.userMetadata.findMany({
      where: {
        userId: ctx.user.id,
        key: { in: SOCIAL_PLATFORMS.map(getSocialMetadataKey) },
      },
    })

    const result: Record<SocialPlatform, { value: string; visible: boolean } | null> = {
      whatsapp: null,
      slack: null,
      discord: null,
      linkedin: null,
      github: null,
      reddit: null,
      zoom: null,
      googlemeet: null,
      teams: null,
      gitlab: null,
    }

    for (const item of metadata) {
      const platform = item.key.replace('social_', '') as SocialPlatform
      if (SOCIAL_PLATFORMS.includes(platform)) {
        try {
          result[platform] = JSON.parse(item.value)
        } catch {
          // Invalid JSON, skip
        }
      }
    }

    return result
  }),

  /**
   * Update current user's social links
   */
  updateSocialLinks: protectedProcedure
    .input(updateSocialLinksSchema)
    .mutation(async ({ ctx, input }) => {
      // Process each platform
      for (const platform of SOCIAL_PLATFORMS) {
        const key = getSocialMetadataKey(platform)
        const data = input[platform]

        if (data === null || data.value === '') {
          // Delete if null or empty
          await ctx.prisma.userMetadata.deleteMany({
            where: { userId: ctx.user.id, key },
          })
        } else {
          // Upsert the value
          await ctx.prisma.userMetadata.upsert({
            where: {
              userId_key: { userId: ctx.user.id, key },
            },
            update: { value: JSON.stringify(data) },
            create: {
              userId: ctx.user.id,
              key,
              value: JSON.stringify(data),
            },
          })
        }
      }

      return { success: true }
    }),

  /**
   * Get another user's visible social links (for popover)
   */
  getUserSocialLinks: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const metadata = await ctx.prisma.userMetadata.findMany({
        where: {
          userId: input.userId,
          key: { in: SOCIAL_PLATFORMS.map(getSocialMetadataKey) },
        },
      })

      const result: Record<SocialPlatform, string | null> = {
        whatsapp: null,
        slack: null,
        discord: null,
        linkedin: null,
        github: null,
        reddit: null,
        zoom: null,
        googlemeet: null,
        teams: null,
        gitlab: null,
      }

      for (const item of metadata) {
        const platform = item.key.replace('social_', '') as SocialPlatform
        if (SOCIAL_PLATFORMS.includes(platform)) {
          try {
            const data = JSON.parse(item.value) as { value: string; visible: boolean }
            // Only return if visible
            if (data.visible) {
              result[platform] = data.value
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      return result
    }),

  // ===========================================================================
  // MY TASKS & SUBTASKS (Cross-Project Dashboard)
  // ===========================================================================

  /**
   * Get all tasks assigned to current user across all projects
   * For the dashboard "My Tasks" view
   */
  getMyTasks: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.prisma.task.findMany({
      where: {
        assignees: { some: { userId: ctx.user.id } },
        isActive: true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            identifier: true,
          },
        },
        column: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { dateDue: { sort: 'asc', nulls: 'last' } },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      progress: task.progress,
      dateDue: task.dateDue,
      dateStarted: task.dateStarted,
      timeEstimated: task.timeEstimated,
      timeSpent: task.timeSpent,
      isActive: task.isActive,
      createdAt: task.createdAt,
      project: task.project,
      column: task.column,
    }))
  }),

  /**
   * Get all subtasks assigned to current user across all projects
   * For the dashboard "My Subtasks" view
   */
  getMySubtasks: protectedProcedure.query(async ({ ctx }) => {
    const subtasks = await ctx.prisma.subtask.findMany({
      where: {
        assigneeId: ctx.user.id,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true,
                identifier: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // TODO first, then IN_PROGRESS, then DONE
        { updatedAt: 'desc' },
      ],
    })

    return subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      status: subtask.status,
      position: subtask.position,
      timeEstimated: subtask.timeEstimated,
      timeSpent: subtask.timeSpent,
      createdAt: subtask.createdAt,
      updatedAt: subtask.updatedAt,
      task: {
        id: subtask.task.id,
        title: subtask.task.title,
        project: subtask.task.project,
      },
    }))
  }),

  // ===========================================================================
  // PAGE WIDTH PREFERENCES (Per-Device)
  // ===========================================================================

  /**
   * Get page width preference for a specific page path
   */
  getPageWidthPreference: protectedProcedure
    .input(z.object({
      deviceId: z.string().uuid(),
      pagePath: z.string().max(255),
    }))
    .query(async ({ ctx, input }) => {
      const preference = await ctx.prisma.userPagePreference.findUnique({
        where: {
          userId_deviceId_pagePath: {
            userId: ctx.user.id,
            deviceId: input.deviceId,
            pagePath: input.pagePath,
          },
        },
      })

      return {
        isFullWidth: preference?.isFullWidth ?? false,
        isPinned: !!preference,
      }
    }),

  /**
   * Get all pinned page width preferences for a device
   */
  getAllPageWidthPreferences: protectedProcedure
    .input(z.object({
      deviceId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const preferences = await ctx.prisma.userPagePreference.findMany({
        where: {
          userId: ctx.user.id,
          deviceId: input.deviceId,
        },
      })

      return preferences.map((p) => ({
        pagePath: p.pagePath,
        isFullWidth: p.isFullWidth,
      }))
    }),

  /**
   * Set page width preference (pin/unpin)
   * If isPinned is true, saves the preference
   * If isPinned is false, removes the preference (unpins)
   */
  setPageWidthPreference: protectedProcedure
    .input(z.object({
      deviceId: z.string().uuid(),
      pagePath: z.string().max(255),
      isFullWidth: z.boolean(),
      isPinned: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.isPinned) {
        // Upsert the preference
        await ctx.prisma.userPagePreference.upsert({
          where: {
            userId_deviceId_pagePath: {
              userId: ctx.user.id,
              deviceId: input.deviceId,
              pagePath: input.pagePath,
            },
          },
          update: {
            isFullWidth: input.isFullWidth,
          },
          create: {
            userId: ctx.user.id,
            deviceId: input.deviceId,
            pagePath: input.pagePath,
            isFullWidth: input.isFullWidth,
          },
        })
      } else {
        // Remove the preference (unpin)
        await ctx.prisma.userPagePreference.deleteMany({
          where: {
            userId: ctx.user.id,
            deviceId: input.deviceId,
            pagePath: input.pagePath,
          },
        })
      }

      return { success: true }
    }),
})
