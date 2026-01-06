"use strict";
/*
 * API Key Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for API key management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:07 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRouter = exports.API_PERMISSIONS = void 0;
exports.hashApiKey = hashApiKey;
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const router_1 = require("../router");
// =============================================================================
// Constants
// =============================================================================
const API_KEY_PREFIX = 'kb_'; // Kanbu API key prefix
const KEY_LENGTH = 32; // 32 bytes = 64 hex chars
// Available permissions
exports.API_PERMISSIONS = [
    'tasks:read',
    'tasks:write',
    'projects:read',
    'projects:write',
    'comments:read',
    'comments:write',
    'webhooks:read',
    'webhooks:write',
];
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Generate a new API key
 * Returns: { key: full key (shown once), prefix: first 8 chars, hash: for storage }
 */
function generateApiKey() {
    const randomPart = (0, crypto_1.randomBytes)(KEY_LENGTH).toString('hex');
    const key = `${API_KEY_PREFIX}${randomPart}`;
    const prefix = key.substring(0, 8);
    const hash = (0, crypto_1.createHash)('sha256').update(key).digest('hex');
    return { key, prefix, hash };
}
/**
 * Hash an API key for comparison
 */
function hashApiKey(key) {
    return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
}
// =============================================================================
// Input Schemas
// =============================================================================
const createApiKeySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    permissions: zod_1.z.array(zod_1.z.enum(exports.API_PERMISSIONS)).default([]),
    rateLimit: zod_1.z.number().min(10).max(10000).default(100),
    expiresAt: zod_1.z.string().datetime().optional(),
});
const revokeApiKeySchema = zod_1.z.object({
    keyId: zod_1.z.number(),
});
const updateApiKeySchema = zod_1.z.object({
    keyId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255).optional(),
    permissions: zod_1.z.array(zod_1.z.enum(exports.API_PERMISSIONS)).optional(),
    rateLimit: zod_1.z.number().min(10).max(10000).optional(),
    isActive: zod_1.z.boolean().optional(),
});
// =============================================================================
// API Key Router
// =============================================================================
exports.apiKeyRouter = (0, router_1.router)({
    /**
     * List all API keys for the current user
     * Note: Does not return the actual key, only metadata
     */
    list: router_1.protectedProcedure.query(async ({ ctx }) => {
        const keys = await ctx.prisma.apiKey.findMany({
            where: { userId: ctx.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                rateLimit: true,
                lastUsedAt: true,
                expiresAt: true,
                isActive: true,
                createdAt: true,
            },
        });
        return keys.map((key) => ({
            ...key,
            permissions: key.permissions,
            isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
        }));
    }),
    /**
     * Create a new API key
     * Returns the full key ONCE - it cannot be retrieved again
     */
    create: router_1.protectedProcedure
        .input(createApiKeySchema)
        .mutation(async ({ ctx, input }) => {
        const { key, prefix, hash } = generateApiKey();
        const apiKey = await ctx.prisma.apiKey.create({
            data: {
                userId: ctx.user.id,
                name: input.name,
                keyPrefix: prefix,
                keyHash: hash,
                permissions: input.permissions,
                rateLimit: input.rateLimit,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                rateLimit: true,
                expiresAt: true,
                createdAt: true,
            },
        });
        return {
            ...apiKey,
            permissions: apiKey.permissions,
            // This is the ONLY time the full key is returned
            key,
        };
    }),
    /**
     * Update an API key
     */
    update: router_1.protectedProcedure
        .input(updateApiKeySchema)
        .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const existing = await ctx.prisma.apiKey.findFirst({
            where: {
                id: input.keyId,
                userId: ctx.user.id,
            },
        });
        if (!existing) {
            return { success: false, message: 'API key not found' };
        }
        const updated = await ctx.prisma.apiKey.update({
            where: { id: input.keyId },
            data: {
                ...(input.name && { name: input.name }),
                ...(input.permissions && { permissions: input.permissions }),
                ...(input.rateLimit && { rateLimit: input.rateLimit }),
                ...(input.isActive !== undefined && { isActive: input.isActive }),
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                rateLimit: true,
                isActive: true,
                updatedAt: true,
            },
        });
        return {
            success: true,
            key: {
                ...updated,
                permissions: updated.permissions,
            },
        };
    }),
    /**
     * Revoke (delete) an API key
     */
    revoke: router_1.protectedProcedure
        .input(revokeApiKeySchema)
        .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const existing = await ctx.prisma.apiKey.findFirst({
            where: {
                id: input.keyId,
                userId: ctx.user.id,
            },
        });
        if (!existing) {
            return { success: false, message: 'API key not found' };
        }
        await ctx.prisma.apiKey.delete({
            where: { id: input.keyId },
        });
        return { success: true };
    }),
    /**
     * Get available permissions
     */
    getPermissions: router_1.protectedProcedure.query(() => {
        return exports.API_PERMISSIONS.map((p) => ({
            value: p,
            label: p.replace(':', ' ').replace(/^\w/, (c) => c.toUpperCase()),
            description: getPermissionDescription(p),
        }));
    }),
});
/**
 * Get human-readable description for a permission
 */
function getPermissionDescription(permission) {
    const descriptions = {
        'tasks:read': 'View tasks in projects',
        'tasks:write': 'Create, update, and delete tasks',
        'projects:read': 'View project information',
        'projects:write': 'Update project settings',
        'comments:read': 'View task comments',
        'comments:write': 'Add and edit comments',
        'webhooks:read': 'View webhook configurations',
        'webhooks:write': 'Manage webhooks',
    };
    return descriptions[permission];
}
//# sourceMappingURL=apiKey.js.map