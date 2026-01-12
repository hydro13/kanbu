/*
 * Workspace AI Provider Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for workspace-level AI provider management.
 * Allows Workspace Admins to configure AI providers for their workspace.
 * Providers inherit from Global scope if not overridden.
 *
 * Fase: 14.4 - Workspace & Project Overrides
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * =============================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const providerTypeSchema = z.enum(['OPENAI', 'OLLAMA', 'LM_STUDIO'])
const capabilitySchema = z.enum(['EMBEDDING', 'REASONING', 'VISION'])

const listWorkspaceProvidersSchema = z.object({
  workspaceId: z.number(),
  providerType: providerTypeSchema.optional(),
  isActive: z.boolean().optional(),
  capability: capabilitySchema.optional(),
})

const createWorkspaceProviderSchema = z.object({
  workspaceId: z.number(),
  // Provider config
  providerType: providerTypeSchema,
  name: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  priority: z.number().min(0).max(1000).default(0),
  capabilities: z.array(capabilitySchema).min(1),
  // Connection settings
  baseUrl: z.string().url().max(500).optional(),
  apiKey: z.string().max(500).optional(),
  organizationId: z.string().max(100).optional(),
  // Model configuration
  embeddingModel: z.string().max(100).optional(),
  reasoningModel: z.string().max(100).optional(),
  visionModel: z.string().max(100).optional(),
  // Rate limits
  maxRequestsPerMinute: z.number().min(1).max(10000).optional(),
  maxTokensPerMinute: z.number().min(1).max(1000000).optional(),
})

const updateWorkspaceProviderSchema = z.object({
  id: z.number(),
  workspaceId: z.number(), // Required for permission check
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().min(0).max(1000).optional(),
  capabilities: z.array(capabilitySchema).min(1).optional(),
  baseUrl: z.string().url().max(500).nullable().optional(),
  apiKey: z.string().max(500).nullable().optional(),
  organizationId: z.string().max(100).nullable().optional(),
  embeddingModel: z.string().max(100).nullable().optional(),
  reasoningModel: z.string().max(100).nullable().optional(),
  visionModel: z.string().max(100).nullable().optional(),
  maxRequestsPerMinute: z.number().min(1).max(10000).nullable().optional(),
  maxTokensPerMinute: z.number().min(1).max(1000000).nullable().optional(),
})

const deleteWorkspaceProviderSchema = z.object({
  id: z.number(),
  workspaceId: z.number(), // Required for permission check
})

const getEffectiveProviderSchema = z.object({
  workspaceId: z.number(),
  capability: capabilitySchema,
})

const testConnectionSchema = z.object({
  workspaceId: z.number(),
  id: z.number().optional(), // Test existing provider
  // Or test new provider settings
  providerType: providerTypeSchema.optional(),
  baseUrl: z.string().url().max(500).optional(),
  apiKey: z.string().max(500).optional(),
})

// =============================================================================
// Workspace AI Provider Router
// =============================================================================

export const workspaceAiProviderRouter = router({
  /**
   * List AI providers for a workspace
   * Shows workspace-level providers and inherited global providers
   */
  list: protectedProcedure
    .input(listWorkspaceProvidersSchema)
    .query(async ({ ctx, input }) => {
      // Require at least VIEWER access to see providers
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      const { workspaceId, providerType, isActive, capability } = input

      // Build where clause for workspace providers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workspaceWhere: any = {
        workspaceId,
        projectId: null, // Only workspace-level, not project-level
      }

      // Build where clause for global providers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalWhere: any = {
        isGlobal: true,
      }

      // Apply common filters
      if (providerType) {
        workspaceWhere.providerType = providerType
        globalWhere.providerType = providerType
      }
      if (isActive !== undefined) {
        workspaceWhere.isActive = isActive
        globalWhere.isActive = isActive
      }
      if (capability) {
        workspaceWhere.capabilities = { has: capability }
        globalWhere.capabilities = { has: capability }
      }

      // Fetch workspace-level and global providers
      const [workspaceProviders, globalProviders] = await Promise.all([
        ctx.prisma.aiProviderConfig.findMany({
          where: workspaceWhere,
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        }),
        ctx.prisma.aiProviderConfig.findMany({
          where: globalWhere,
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        }),
      ])

      // Mask API keys for security
      const maskApiKey = (provider: typeof workspaceProviders[0]) => ({
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
      })

      return {
        workspaceProviders: workspaceProviders.map(maskApiKey),
        globalProviders: globalProviders.map(maskApiKey),
        // Quick summary for UI
        hasWorkspaceOverride: workspaceProviders.length > 0,
      }
    }),

  /**
   * Get a specific workspace-level provider by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number(), workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      const provider = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not found',
        })
      }

      // Verify provider belongs to this workspace
      if (provider.workspaceId !== input.workspaceId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Provider does not belong to this workspace',
        })
      }

      return {
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
        hasApiKey: !!provider.apiKey,
      }
    }),

  /**
   * Create a workspace-level AI provider
   * Requires ADMIN access to the workspace
   */
  create: protectedProcedure
    .input(createWorkspaceProviderSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      const { workspaceId, ...providerData } = input

      // Verify workspace exists
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true },
      })

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        })
      }

      // Create the provider
      const provider = await ctx.prisma.aiProviderConfig.create({
        data: {
          isGlobal: false,
          workspaceId,
          projectId: null,
          createdById: ctx.user.id,
          ...providerData,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      return {
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
      }
    }),

  /**
   * Update a workspace-level AI provider
   * Requires ADMIN access to the workspace
   */
  update: protectedProcedure
    .input(updateWorkspaceProviderSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      const { id, workspaceId, ...data } = input

      // Check provider exists and belongs to this workspace
      const existing = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not found',
        })
      }

      if (existing.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Provider does not belong to this workspace',
        })
      }

      // Cannot update global providers from workspace context
      if (existing.isGlobal) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify global providers from workspace settings',
        })
      }

      // Handle null values for optional fields
      const updateData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updateData[key] = value
        }
      }

      const provider = await ctx.prisma.aiProviderConfig.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      return {
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
      }
    }),

  /**
   * Delete a workspace-level AI provider
   * Requires ADMIN access to the workspace
   */
  delete: protectedProcedure
    .input(deleteWorkspaceProviderSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      const existing = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not found',
        })
      }

      if (existing.workspaceId !== input.workspaceId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Provider does not belong to this workspace',
        })
      }

      // Cannot delete global providers from workspace context
      if (existing.isGlobal) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete global providers from workspace settings',
        })
      }

      await ctx.prisma.aiProviderConfig.delete({
        where: { id: input.id },
      })

      return { success: true, message: 'AI provider deleted' }
    }),

  /**
   * Get the effective provider for a capability
   * Returns the highest-priority active provider (workspace > global)
   */
  getEffective: protectedProcedure
    .input(getEffectiveProviderSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      const { workspaceId, capability } = input

      // Try workspace-level first
      const workspaceProvider = await ctx.prisma.aiProviderConfig.findFirst({
        where: {
          workspaceId,
          projectId: null,
          isActive: true,
          capabilities: { has: capability },
        },
        orderBy: { priority: 'desc' },
        select: {
          id: true,
          name: true,
          providerType: true,
          isGlobal: true,
          workspaceId: true,
          projectId: true,
          capabilities: true,
          embeddingModel: true,
          reasoningModel: true,
          visionModel: true,
        },
      })

      if (workspaceProvider) {
        return {
          provider: workspaceProvider,
          scope: 'workspace' as const,
          isOverride: true,
        }
      }

      // Fall back to global
      const globalProvider = await ctx.prisma.aiProviderConfig.findFirst({
        where: {
          isGlobal: true,
          isActive: true,
          capabilities: { has: capability },
        },
        orderBy: { priority: 'desc' },
        select: {
          id: true,
          name: true,
          providerType: true,
          isGlobal: true,
          workspaceId: true,
          projectId: true,
          capabilities: true,
          embeddingModel: true,
          reasoningModel: true,
          visionModel: true,
        },
      })

      if (globalProvider) {
        return {
          provider: globalProvider,
          scope: 'global' as const,
          isOverride: false,
        }
      }

      return {
        provider: null,
        scope: null,
        isOverride: false,
        message: `No active provider found for capability: ${capability}`,
      }
    }),

  /**
   * Get effective providers for all capabilities
   * Returns a summary of which provider handles each capability
   */
  getEffectiveAll: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      const capabilities = ['EMBEDDING', 'REASONING', 'VISION'] as const
      const result: Record<string, {
        provider: { id: number; name: string; providerType: string } | null
        scope: 'workspace' | 'global' | null
        isOverride: boolean
      }> = {}

      for (const capability of capabilities) {
        // Try workspace-level first
        const workspaceProvider = await ctx.prisma.aiProviderConfig.findFirst({
          where: {
            workspaceId: input.workspaceId,
            projectId: null,
            isActive: true,
            capabilities: { has: capability },
          },
          orderBy: { priority: 'desc' },
          select: { id: true, name: true, providerType: true },
        })

        if (workspaceProvider) {
          result[capability] = {
            provider: workspaceProvider,
            scope: 'workspace',
            isOverride: true,
          }
          continue
        }

        // Fall back to global
        const globalProvider = await ctx.prisma.aiProviderConfig.findFirst({
          where: {
            isGlobal: true,
            isActive: true,
            capabilities: { has: capability },
          },
          orderBy: { priority: 'desc' },
          select: { id: true, name: true, providerType: true },
        })

        result[capability] = {
          provider: globalProvider,
          scope: globalProvider ? 'global' : null,
          isOverride: false,
        }
      }

      return result
    }),

  /**
   * Test connection to a provider
   */
  testConnection: protectedProcedure
    .input(testConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      let baseUrl: string | null = null
      let apiKey: string | null = null
      let providerType: string

      if (input.id) {
        // Test existing provider
        const provider = await ctx.prisma.aiProviderConfig.findUnique({
          where: { id: input.id },
        })

        if (!provider) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'AI provider not found',
          })
        }

        // Verify provider is accessible from this workspace
        if (!provider.isGlobal && provider.workspaceId !== input.workspaceId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Provider does not belong to this workspace',
          })
        }

        baseUrl = provider.baseUrl
        apiKey = provider.apiKey
        providerType = provider.providerType
      } else {
        // Test new settings
        if (!input.providerType || !input.baseUrl) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'providerType and baseUrl required for testing new settings',
          })
        }

        baseUrl = input.baseUrl
        apiKey = input.apiKey ?? null
        providerType = input.providerType
      }

      // Test the connection
      try {
        const result = await testProviderConnection(providerType, baseUrl, apiKey)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          success: false,
          error: message,
          latencyMs: null,
          models: null,
        }
      }
    }),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Test connection to an AI provider
 */
async function testProviderConnection(
  _providerType: string,
  baseUrl: string | null,
  apiKey: string | null
): Promise<{
  success: boolean
  latencyMs: number | null
  models: string[] | null
  error?: string
}> {
  if (!baseUrl) {
    return { success: false, latencyMs: null, models: null, error: 'No base URL configured' }
  }

  const startTime = Date.now()

  try {
    // All providers use OpenAI-compatible /v1/models endpoint
    const modelsUrl = baseUrl.replace(/\/$/, '') + '/models'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const text = await response.text()
      return {
        success: false,
        latencyMs,
        models: null,
        error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      }
    }

    const data = await response.json() as { data?: Array<{ id: string }> }
    const models = Array.isArray(data.data)
      ? data.data.map((m) => m.id).slice(0, 50) // Limit to first 50 models
      : []

    return {
      success: true,
      latencyMs,
      models,
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      latencyMs,
      models: null,
      error: message,
    }
  }
}
