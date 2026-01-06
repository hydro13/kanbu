"use strict";
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
 * ═══════════════════════════════════════════════════════════════════
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const OTPAuth = __importStar(require("otpauth"));
const router_1 = require("../router");
const auth_1 = require("../../lib/auth");
// =============================================================================
// Input Schemas
// =============================================================================
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    timezone: zod_1.z.string().max(50).optional(),
    language: zod_1.z.string().max(10).optional(),
    theme: zod_1.z.enum(['light', 'dark', 'system']).optional(),
    defaultFilter: zod_1.z.string().optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
});
const timeTrackingSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().optional(), // ISO date string
    dateTo: zod_1.z.string().optional(), // ISO date string
    limit: zod_1.z.number().min(1).max(100).default(50),
});
const paginationSchema = zod_1.z.object({
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
});
// =============================================================================
// User Router
// =============================================================================
exports.userRouter = (0, router_1.router)({
    /**
     * Get current user's full profile
     */
    getProfile: router_1.protectedProcedure.query(async ({ ctx }) => {
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
                _count: {
                    select: {
                        workspaces: true,
                    },
                },
            },
        });
        if (!user) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'User not found',
            });
        }
        return {
            ...user,
            workspaceCount: user._count.workspaces,
        };
    }),
    /**
     * Update current user's profile
     */
    updateProfile: router_1.protectedProcedure
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
        });
        return user;
    }),
    /**
     * Change current user's password
     */
    changePassword: router_1.protectedProcedure
        .input(changePasswordSchema)
        .mutation(async ({ ctx, input }) => {
        // Get user with password hash
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: {
                id: true,
                passwordHash: true,
            },
        });
        if (!user || !user.passwordHash) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot change password for this account',
            });
        }
        // Verify current password
        const isValid = await (0, auth_1.verifyPassword)(user.passwordHash, input.currentPassword);
        if (!isValid) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Current password is incorrect',
            });
        }
        // Hash new password
        const newPasswordHash = await (0, auth_1.hashPassword)(input.newPassword);
        // Update password
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { passwordHash: newPasswordHash },
        });
        return { success: true, message: 'Password changed successfully' };
    }),
    /**
     * Upload avatar with base64 encoded image
     * Stores in database for reliability
     */
    uploadAvatar: router_1.protectedProcedure
        .input(zod_1.z.object({
        base64: zod_1.z.string().min(1),
        mimeType: zod_1.z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    }))
        .mutation(async ({ ctx, input }) => {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.base64, 'base64');
        const size = buffer.length;
        // Validate size (max 5MB)
        if (size > 5 * 1024 * 1024) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'File size must be less than 5MB',
            });
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
        });
        // Update user's avatarUrl to point to the API endpoint
        const avatarUrl = `/api/avatar/${ctx.user.id}`;
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { avatarUrl },
        });
        return {
            success: true,
            avatarUrl,
            message: 'Avatar uploaded successfully',
        };
    }),
    /**
     * Remove avatar
     */
    removeAvatar: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        // Delete avatar from database
        await ctx.prisma.userAvatar.deleteMany({
            where: { userId: ctx.user.id },
        });
        // Clear avatar URL
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { avatarUrl: null },
        });
        return { success: true, message: 'Avatar removed' };
    }),
    /**
     * Delete current user's account
     * Soft delete by deactivating
     */
    deleteAccount: router_1.protectedProcedure
        .input(zod_1.z.object({ password: zod_1.z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
        // Get user with password hash
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: {
                id: true,
                passwordHash: true,
            },
        });
        if (!user || !user.passwordHash) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot delete this account',
            });
        }
        // Verify password
        const isValid = await (0, auth_1.verifyPassword)(user.passwordHash, input.password);
        if (!isValid) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Password is incorrect',
            });
        }
        // Soft delete - deactivate account
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { isActive: false },
        });
        return { success: true, message: 'Account deactivated' };
    }),
    /**
     * Get time tracking data for current user
     * Shows hours worked across all projects/tasks
     */
    getTimeTracking: router_1.protectedProcedure
        .input(timeTrackingSchema)
        .query(async ({ ctx, input }) => {
        const dateFilter = {
            ...(input.dateFrom && { gte: new Date(input.dateFrom) }),
            ...(input.dateTo && { lte: new Date(input.dateTo) }),
        };
        const hasDateFilter = input.dateFrom || input.dateTo;
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
        });
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
        });
        // Aggregate totals per project
        const projectTotals = new Map();
        for (const subtask of subtasks) {
            const projectId = subtask.task.project.id;
            const existing = projectTotals.get(projectId) ?? {
                name: subtask.task.project.name,
                estimated: 0,
                spent: 0,
            };
            projectTotals.set(projectId, {
                name: existing.name,
                estimated: existing.estimated + subtask.timeEstimated,
                spent: existing.spent + subtask.timeSpent,
            });
        }
        for (const task of tasks) {
            const projectId = task.project.id;
            const existing = projectTotals.get(projectId) ?? {
                name: task.project.name,
                estimated: 0,
                spent: 0,
            };
            projectTotals.set(projectId, {
                name: existing.name,
                estimated: existing.estimated + task.timeEstimated,
                spent: existing.spent + task.timeSpent,
            });
        }
        // Calculate overall totals
        let totalEstimated = 0;
        let totalSpent = 0;
        const byProject = Array.from(projectTotals.entries()).map(([projectId, data]) => {
            totalEstimated += data.estimated;
            totalSpent += data.spent;
            return {
                projectId,
                projectName: data.name,
                timeEstimated: Math.round(data.estimated * 100) / 100,
                timeSpent: Math.round(data.spent * 100) / 100,
            };
        });
        // Sort projects by time spent (highest first)
        byProject.sort((a, b) => b.timeSpent - a.timeSpent);
        // Combine recent entries (tasks + subtasks)
        const recentEntries = [
            ...subtasks.map((s) => ({
                type: 'subtask',
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
                type: 'task',
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
            .slice(0, input.limit);
        return {
            totalEstimated: Math.round(totalEstimated * 100) / 100,
            totalSpent: Math.round(totalSpent * 100) / 100,
            byProject,
            recentEntries,
        };
    }),
    /**
     * Get last logins for current user
     */
    getLastLogins: router_1.protectedProcedure
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
        ]);
        return {
            logins,
            total,
            hasMore: input.offset + logins.length < total,
        };
    }),
    /**
     * Get active sessions (persistent connections)
     */
    getSessions: router_1.protectedProcedure.query(async ({ ctx }) => {
        const now = new Date();
        const sessions = await ctx.prisma.session.findMany({
            where: {
                userId: ctx.user.id,
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
        });
        return sessions.map((s) => ({
            id: s.id,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
        }));
    }),
    /**
     * Get remember tokens
     */
    getRememberTokens: router_1.protectedProcedure.query(async ({ ctx }) => {
        const now = new Date();
        const tokens = await ctx.prisma.rememberToken.findMany({
            where: {
                userId: ctx.user.id,
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
        });
        return tokens.map((t) => ({
            id: t.id,
            tokenPreview: t.token.slice(0, 8) + '...',
            expiresAt: t.expiresAt,
            createdAt: t.createdAt,
        }));
    }),
    /**
     * Revoke a session
     */
    revokeSession: router_1.protectedProcedure
        .input(zod_1.z.object({ sessionId: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        await ctx.prisma.session.deleteMany({
            where: {
                id: input.sessionId,
                userId: ctx.user.id,
            },
        });
        return { success: true };
    }),
    /**
     * Revoke a remember token
     */
    revokeRememberToken: router_1.protectedProcedure
        .input(zod_1.z.object({ tokenId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        await ctx.prisma.rememberToken.deleteMany({
            where: {
                id: input.tokenId,
                userId: ctx.user.id,
            },
        });
        return { success: true };
    }),
    /**
     * Revoke all sessions except current
     */
    revokeAllSessions: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        // We can't know the current session ID from JWT, so we delete all
        const result = await ctx.prisma.session.deleteMany({
            where: { userId: ctx.user.id },
        });
        return { success: true, count: result.count };
    }),
    /**
     * Get password reset history
     */
    getPasswordResets: router_1.protectedProcedure
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
        ]);
        return {
            resets,
            total,
            hasMore: input.offset + resets.length < total,
        };
    }),
    /**
     * Get user metadata (custom key-value pairs)
     */
    getMetadata: router_1.protectedProcedure.query(async ({ ctx }) => {
        const metadata = await ctx.prisma.userMetadata.findMany({
            where: { userId: ctx.user.id },
            orderBy: { key: 'asc' },
        });
        return metadata;
    }),
    /**
     * Set a metadata value
     */
    setMetadata: router_1.protectedProcedure
        .input(zod_1.z.object({
        key: zod_1.z.string().min(1).max(100),
        value: zod_1.z.string(),
    }))
        .mutation(async ({ ctx, input }) => {
        const existing = await ctx.prisma.userMetadata.findFirst({
            where: {
                userId: ctx.user.id,
                key: input.key,
            },
        });
        if (existing) {
            await ctx.prisma.userMetadata.update({
                where: { id: existing.id },
                data: { value: input.value },
            });
        }
        else {
            await ctx.prisma.userMetadata.create({
                data: {
                    userId: ctx.user.id,
                    key: input.key,
                    value: input.value,
                },
            });
        }
        return { success: true };
    }),
    /**
     * Delete a metadata key
     */
    deleteMetadata: router_1.protectedProcedure
        .input(zod_1.z.object({ key: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        await ctx.prisma.userMetadata.deleteMany({
            where: {
                userId: ctx.user.id,
                key: input.key,
            },
        });
        return { success: true };
    }),
    // ===========================================================================
    // TWO-FACTOR AUTHENTICATION
    // ===========================================================================
    /**
     * Get 2FA status
     */
    get2FAStatus: router_1.protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { twofactorActivated: true },
        });
        return { enabled: user?.twofactorActivated ?? false };
    }),
    /**
     * Setup 2FA - generate secret and return QR code URI
     */
    setup2FA: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { email: true, twofactorActivated: true },
        });
        if (user?.twofactorActivated) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: '2FA is already enabled',
            });
        }
        // Generate secret
        const secret = new OTPAuth.Secret({ size: 16 });
        // Create TOTP object
        const totp = new OTPAuth.TOTP({
            issuer: 'Kanbu',
            label: user?.email ?? 'user',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret,
        });
        // Store secret temporarily (not activated yet)
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { twofactorSecret: secret.base32 },
        });
        return {
            secret: secret.base32,
            qrCodeUri: totp.toString(),
        };
    }),
    /**
     * Verify and activate 2FA
     */
    verify2FA: router_1.protectedProcedure
        .input(zod_1.z.object({ token: zod_1.z.string().length(6) }))
        .mutation(async ({ ctx, input }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { email: true, twofactorSecret: true, twofactorActivated: true },
        });
        if (!user?.twofactorSecret) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Please setup 2FA first',
            });
        }
        if (user.twofactorActivated) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: '2FA is already activated',
            });
        }
        // Verify token
        const totp = new OTPAuth.TOTP({
            issuer: 'Kanbu',
            label: user.email ?? 'user',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(user.twofactorSecret),
        });
        const delta = totp.validate({ token: input.token, window: 1 });
        if (delta === null) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid verification code',
            });
        }
        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            backupCodes.push(code);
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
        });
        // Activate 2FA
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { twofactorActivated: true },
        });
        return {
            success: true,
            backupCodes,
        };
    }),
    /**
     * Disable 2FA
     */
    disable2FA: router_1.protectedProcedure
        .input(zod_1.z.object({ password: zod_1.z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { passwordHash: true, twofactorActivated: true },
        });
        if (!user?.twofactorActivated) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: '2FA is not enabled',
            });
        }
        if (!user.passwordHash) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot disable 2FA for this account',
            });
        }
        // Verify password
        const isValid = await (0, auth_1.verifyPassword)(user.passwordHash, input.password);
        if (!isValid) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Password is incorrect',
            });
        }
        // Disable 2FA
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                twofactorActivated: false,
                twofactorSecret: null,
            },
        });
        // Remove backup codes
        await ctx.prisma.userMetadata.deleteMany({
            where: {
                userId: ctx.user.id,
                key: '2fa_backup_codes',
            },
        });
        return { success: true };
    }),
    // ===========================================================================
    // PUBLIC ACCESS
    // ===========================================================================
    /**
     * Get public access status
     */
    getPublicAccess: router_1.protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { publicToken: true },
        });
        return {
            enabled: !!user?.publicToken,
            token: user?.publicToken ?? null,
        };
    }),
    /**
     * Enable public access - generate a token
     */
    enablePublicAccess: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        const crypto = await import('crypto');
        // Generate a random 64-character token
        const token = crypto.randomBytes(32).toString('hex');
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { publicToken: token },
        });
        return { success: true, token };
    }),
    /**
     * Disable public access - remove token
     */
    disablePublicAccess: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { publicToken: null },
        });
        return { success: true };
    }),
    /**
     * Regenerate public access token
     */
    regeneratePublicToken: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        const crypto = await import('crypto');
        // Generate a new random token
        const token = crypto.randomBytes(32).toString('hex');
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { publicToken: token },
        });
        return { success: true, token };
    }),
    // ===========================================================================
    // EXTERNAL ACCOUNTS (OAuth)
    // ===========================================================================
    /**
     * Get connected OAuth accounts
     */
    getConnectedAccounts: router_1.protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: {
                googleId: true,
                githubId: true,
                gitlabId: true,
            },
        });
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
        };
    }),
    /**
     * Unlink an OAuth account
     */
    unlinkAccount: router_1.protectedProcedure
        .input(zod_1.z.object({
        provider: zod_1.z.enum(['google', 'github', 'gitlab']),
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
        });
        if (!user) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'User not found',
            });
        }
        // Count available auth methods
        const authMethods = [
            !!user.passwordHash,
            !!user.googleId,
            !!user.githubId,
            !!user.gitlabId,
        ].filter(Boolean).length;
        if (authMethods <= 1) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot unlink your only authentication method. Set a password first or link another account.',
            });
        }
        // Unlink the account
        const updateData = input.provider === 'google'
            ? { googleId: null }
            : input.provider === 'github'
                ? { githubId: null }
                : { gitlabId: null };
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: updateData,
        });
        return { success: true };
    }),
    // ===========================================================================
    // HOURLY RATE
    // ===========================================================================
    /**
     * Get hourly rate
     */
    getHourlyRate: router_1.protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { hourlyRate: true },
        });
        return {
            hourlyRate: user?.hourlyRate ? Number(user.hourlyRate) : null,
        };
    }),
    /**
     * Update hourly rate
     */
    updateHourlyRate: router_1.protectedProcedure
        .input(zod_1.z.object({
        hourlyRate: zod_1.z.number().min(0).max(10000).nullable(),
    }))
        .mutation(async ({ ctx, input }) => {
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { hourlyRate: input.hourlyRate },
        });
        return { success: true };
    }),
});
//# sourceMappingURL=user.js.map