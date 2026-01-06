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

import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'
import { router, protectedProcedure } from '../router'

// =============================================================================
// Constants
// =============================================================================

const API_KEY_PREFIX = 'kb_' // Kanbu API key prefix
const KEY_LENGTH = 32 // 32 bytes = 64 hex chars

// Available permissions
export const API_PERMISSIONS = [
  'tasks:read',
  'tasks:write',
  'projects:read',
  'projects:write',
  'comments:read',
  'comments:write',
  'webhooks:read',
  'webhooks:write',
] as const

export type ApiPermission = (typeof API_PERMISSIONS)[number]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a new API key
 * Returns: { key: full key (shown once), prefix: first 8 chars, hash: for storage }
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(KEY_LENGTH).toString('hex')
  const key = `${API_KEY_PREFIX}${randomPart}`
  const prefix = key.substring(0, 8)
  const hash = createHash('sha256').update(key).digest('hex')

  return { key, prefix, hash }
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// =============================================================================
// Input Schemas
// =============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.array(z.enum(API_PERMISSIONS)).default([]),
  rateLimit: z.number().min(10).max(10000).default(100),
  expiresAt: z.string().datetime().optional(),
})

const revokeApiKeySchema = z.object({
  keyId: z.number(),
})

const updateApiKeySchema = z.object({
  keyId: z.number(),
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.enum(API_PERMISSIONS)).optional(),
  rateLimit: z.number().min(10).max(10000).optional(),
  isActive: z.boolean().optional(),
})

// =============================================================================
// API Key Router
// =============================================================================

export const apiKeyRouter = router({
  /**
   * List all API keys for the current user
   * Note: Does not return the actual key, only metadata
   */
  list: protectedProcedure.query(async ({ ctx }) => {
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
    })

    return keys.map((key) => ({
      ...key,
      permissions: key.permissions as ApiPermission[],
      isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
    }))
  }),

  /**
   * Create a new API key
   * Returns the full key ONCE - it cannot be retrieved again
   */
  create: protectedProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const { key, prefix, hash } = generateApiKey()

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
      })

      return {
        ...apiKey,
        permissions: apiKey.permissions as ApiPermission[],
        // This is the ONLY time the full key is returned
        key,
      }
    }),

  /**
   * Update an API key
   */
  update: protectedProcedure
    .input(updateApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.apiKey.findFirst({
        where: {
          id: input.keyId,
          userId: ctx.user.id,
        },
      })

      if (!existing) {
        return { success: false, message: 'API key not found' }
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
      })

      return {
        success: true,
        key: {
          ...updated,
          permissions: updated.permissions as ApiPermission[],
        },
      }
    }),

  /**
   * Revoke (delete) an API key
   */
  revoke: protectedProcedure
    .input(revokeApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.apiKey.findFirst({
        where: {
          id: input.keyId,
          userId: ctx.user.id,
        },
      })

      if (!existing) {
        return { success: false, message: 'API key not found' }
      }

      await ctx.prisma.apiKey.delete({
        where: { id: input.keyId },
      })

      return { success: true }
    }),

  /**
   * Get available permissions
   */
  getPermissions: protectedProcedure.query(() => {
    return API_PERMISSIONS.map((p) => ({
      value: p,
      label: p.replace(':', ' ').replace(/^\w/, (c) => c.toUpperCase()),
      description: getPermissionDescription(p),
    }))
  }),
})

/**
 * Get human-readable description for a permission
 */
function getPermissionDescription(permission: ApiPermission): string {
  const descriptions: Record<ApiPermission, string> = {
    'tasks:read': 'View tasks in projects',
    'tasks:write': 'Create, update, and delete tasks',
    'projects:read': 'View project information',
    'projects:write': 'Update project settings',
    'comments:read': 'View task comments',
    'comments:write': 'Add and edit comments',
    'webhooks:read': 'View webhook configurations',
    'webhooks:write': 'Manage webhooks',
  }
  return descriptions[permission]
}
