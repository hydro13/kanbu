/*
 * AI Assistant Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for Claude Code MCP server integration.
 * Implements one-time setup code pairing flow for secure machine binding.
 *
 * Flow:
 * 1. User generates setup code in profile page (KNB-XXXX-XXXX, 5 min TTL)
 * 2. User tells Claude the code
 * 3. Claude exchanges code for permanent token (256-bit, machine-bound)
 * 4. Claude can now act on behalf of user with inherited ACL permissions
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.7 - Claude Code MCP Integration
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { randomBytes, createHash } from 'crypto'
import * as argon2 from 'argon2'
import { router, protectedProcedure, publicProcedure } from '../router'
import { auditService, AUDIT_ACTIONS, AUDIT_CATEGORIES } from '../../services/auditService'

// =============================================================================
// Constants
// =============================================================================

const SETUP_CODE_PREFIX = 'KNB'
const TOKEN_PREFIX = 'ast_'
const TOKEN_BYTES = 32 // 256 bits
const SETUP_CODE_TTL_MINUTES = 5
const MAX_SETUP_CODE_ATTEMPTS_PER_HOUR = 5

// Characters that won't be confused (no O/0, I/1, etc.)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// =============================================================================
// Crypto Utilities
// =============================================================================

/**
 * Generate a random string from safe characters
 */
function randomChars(length: number): string {
  const bytes = randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += SAFE_CHARS[bytes[i]! % SAFE_CHARS.length]
  }
  return result
}

/**
 * Generate a setup code in format KNB-XXXX-XXXX
 */
function generateSetupCodeString(): string {
  const part1 = randomChars(4)
  const part2 = randomChars(4)
  return `${SETUP_CODE_PREFIX}-${part1}-${part2}`
}

/**
 * Generate a secure permanent token
 */
function generateSecureToken(): string {
  const bytes = randomBytes(TOKEN_BYTES)
  const base64 = bytes.toString('base64url')
  return `${TOKEN_PREFIX}${base64}`
}

/**
 * Hash a token using SHA256 + argon2 for secure storage
 */
async function hashToken(token: string): Promise<string> {
  const sha256 = createHash('sha256').update(token).digest('hex')
  return argon2.hash(sha256)
}

/**
 * Verify a token against its stored hash
 */
async function verifyToken(token: string, hash: string): Promise<boolean> {
  const sha256 = createHash('sha256').update(token).digest('hex')
  return argon2.verify(hash, sha256)
}

// =============================================================================
// Input Schemas
// =============================================================================

const exchangeSetupCodeSchema = z.object({
  code: z.string().regex(/^KNB-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid setup code format'),
  machineId: z.string().min(1).max(64),
  machineName: z.string().max(100).optional(),
})

const revokeBindingSchema = z.object({
  bindingId: z.number(),
})

const validateTokenSchema = z.object({
  token: z.string().min(1),
})

// =============================================================================
// Assistant Router
// =============================================================================

export const assistantRouter = router({
  /**
   * Generate a new setup code (authenticated users only)
   * Invalidates any existing unused codes for this user.
   */
  generateSetupCode: protectedProcedure.mutation(async ({ ctx }) => {
    // Check rate limit: max 5 codes per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCodes = await ctx.prisma.assistantSetupCode.count({
      where: {
        userId: ctx.user.id,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentCodes >= MAX_SETUP_CODE_ATTEMPTS_PER_HOUR) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many setup codes generated. Please wait before trying again.',
      })
    }

    // Invalidate any existing unused codes
    await ctx.prisma.assistantSetupCode.updateMany({
      where: {
        userId: ctx.user.id,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(), // Mark as cancelled
      },
    })

    // Generate new code
    const code = generateSetupCodeString()
    const expiresAt = new Date(Date.now() + SETUP_CODE_TTL_MINUTES * 60 * 1000)

    await ctx.prisma.assistantSetupCode.create({
      data: {
        userId: ctx.user.id,
        code,
        expiresAt,
      },
    })

    return {
      code,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: SETUP_CODE_TTL_MINUTES * 60,
    }
  }),

  /**
   * Exchange a setup code for a permanent token (public - called by MCP server)
   * Validates the code, marks it as consumed, and creates/updates binding.
   */
  exchangeSetupCode: publicProcedure
    .input(exchangeSetupCodeSchema)
    .mutation(async ({ ctx, input }) => {
      // Find the setup code
      const setupCode = await ctx.prisma.assistantSetupCode.findUnique({
        where: { code: input.code.toUpperCase() },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          },
        },
      })

      if (!setupCode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid setup code',
        })
      }

      if (setupCode.consumedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup code has already been used',
        })
      }

      if (setupCode.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup code has expired',
        })
      }

      if (!setupCode.user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User account is not active',
        })
      }

      // Mark code as consumed
      await ctx.prisma.assistantSetupCode.update({
        where: { id: setupCode.id },
        data: {
          consumedAt: new Date(),
          machineId: input.machineId,
        },
      })

      // Check if binding already exists for this machine
      const existingBinding = await ctx.prisma.assistantBinding.findUnique({
        where: {
          userId_machineId: {
            userId: setupCode.userId,
            machineId: input.machineId,
          },
        },
      })

      // Generate new permanent token
      const token = generateSecureToken()
      const tokenHash = await hashToken(token)
      const tokenPrefix = token.substring(0, 12)

      if (existingBinding) {
        // Update existing binding with new token
        await ctx.prisma.assistantBinding.update({
          where: { id: existingBinding.id },
          data: {
            tokenHash,
            tokenPrefix,
            machineName: input.machineName ?? existingBinding.machineName,
            revokedAt: null, // Un-revoke if was revoked
            lastUsedAt: new Date(),
          },
        })
      } else {
        // Create new binding
        await ctx.prisma.assistantBinding.create({
          data: {
            userId: setupCode.userId,
            machineId: input.machineId,
            machineName: input.machineName,
            tokenHash,
            tokenPrefix,
          },
        })
      }

      // Audit log
      await auditService.log({
        category: AUDIT_CATEGORIES.API,
        action: AUDIT_ACTIONS.ASSISTANT_PAIRED,
        resourceType: 'assistant_binding',
        resourceId: existingBinding?.id ?? null,
        resourceName: input.machineName ?? input.machineId.substring(0, 8),
        userId: setupCode.userId,
        metadata: {
          machineId: input.machineId,
          machineName: input.machineName,
          isReconnect: !!existingBinding,
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent'],
      })

      return {
        token,
        user: {
          id: setupCode.user.id,
          email: setupCode.user.email,
          name: setupCode.user.name,
          role: setupCode.user.role,
        },
      }
    }),

  /**
   * Get list of connected machines (authenticated users only)
   */
  getBindings: protectedProcedure.query(async ({ ctx }) => {
    const bindings = await ctx.prisma.assistantBinding.findMany({
      where: {
        userId: ctx.user.id,
        revokedAt: null,
      },
      select: {
        id: true,
        machineId: true,
        machineName: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    })

    return bindings
  }),

  /**
   * Disconnect a machine (authenticated users only)
   */
  revokeBinding: protectedProcedure
    .input(revokeBindingSchema)
    .mutation(async ({ ctx, input }) => {
      const binding = await ctx.prisma.assistantBinding.findFirst({
        where: {
          id: input.bindingId,
          userId: ctx.user.id,
        },
      })

      if (!binding) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Binding not found',
        })
      }

      await ctx.prisma.assistantBinding.update({
        where: { id: binding.id },
        data: { revokedAt: new Date() },
      })

      // Audit log
      await auditService.log({
        category: AUDIT_CATEGORIES.API,
        action: AUDIT_ACTIONS.ASSISTANT_DISCONNECTED,
        resourceType: 'assistant_binding',
        resourceId: binding.id,
        resourceName: binding.machineName ?? binding.machineId.substring(0, 8),
        userId: ctx.user.id,
        metadata: {
          machineId: binding.machineId,
          machineName: binding.machineName,
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent'],
      })

      return { success: true }
    }),

  /**
   * Validate a permanent token (public - called by MCP server)
   * Returns user context if token is valid.
   */
  validateToken: publicProcedure
    .input(validateTokenSchema)
    .query(async ({ ctx, input }) => {
      // Quick check: must start with ast_
      if (!input.token.startsWith(TOKEN_PREFIX)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token format',
        })
      }

      const tokenPrefix = input.token.substring(0, 12)

      // Find binding by token prefix
      const binding = await ctx.prisma.assistantBinding.findFirst({
        where: {
          tokenPrefix,
          revokedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          },
        },
      })

      if (!binding) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or revoked token',
        })
      }

      // Verify full token hash
      const isValid = await verifyToken(input.token, binding.tokenHash)
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        })
      }

      // Check if user is still active
      if (!binding.user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User account is not active',
        })
      }

      // Update last used timestamp
      await ctx.prisma.assistantBinding.update({
        where: { id: binding.id },
        data: { lastUsedAt: new Date() },
      })

      return {
        userId: binding.user.id,
        email: binding.user.email,
        name: binding.user.name,
        role: binding.user.role,
        machineId: binding.machineId,
        machineName: binding.machineName,
      }
    }),

  /**
   * Check if current user has any active bindings
   */
  hasActiveBinding: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.assistantBinding.count({
      where: {
        userId: ctx.user.id,
        revokedAt: null,
      },
    })

    return { hasBinding: count > 0, bindingCount: count }
  }),

  /**
   * Get current active setup code (if any) for polling UI updates
   */
  getActiveSetupCode: protectedProcedure.query(async ({ ctx }) => {
    const activeCode = await ctx.prisma.assistantSetupCode.findFirst({
      where: {
        userId: ctx.user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!activeCode) {
      return null
    }

    return {
      code: activeCode.code,
      expiresAt: activeCode.expiresAt.toISOString(),
      ttlSeconds: Math.max(0, Math.floor((activeCode.expiresAt.getTime() - Date.now()) / 1000)),
    }
  }),
})
