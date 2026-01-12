/*
 * AI Provider Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for managing AI provider configurations.
 * Supports global, workspace, and project-level providers.
 * Requires Domain Admin access.
 *
 * Fase: 14.2 - AI Provider Admin UI
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
import { router, adminProcedure } from '../router'
import { groupPermissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const providerTypeSchema = z.enum(['OPENAI', 'OLLAMA', 'LM_STUDIO'])
const capabilitySchema = z.enum(['EMBEDDING', 'REASONING', 'VISION'])

const listProvidersSchema = z.object({
  scope: z.enum(['global', 'workspace', 'project', 'all']).default('all'),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
  providerType: providerTypeSchema.optional(),
  isActive: z.boolean().optional(),
  capability: capabilitySchema.optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

const createProviderSchema = z.object({
  // Scope (one of: global, workspace, or project)
  isGlobal: z.boolean().default(false),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
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

const updateProviderSchema = z.object({
  id: z.number(),
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

const testConnectionSchema = z.object({
  id: z.number().optional(), // Test existing provider
  // Or test new provider settings
  providerType: providerTypeSchema.optional(),
  baseUrl: z.string().url().max(500).optional(),
  apiKey: z.string().max(500).optional(),
})

// =============================================================================
// AI Provider Router
// =============================================================================

export const aiProviderRouter = router({
  /**
   * List AI providers based on scope and filters
   * - Domain Admins see all providers
   * - Workspace Admins see global + their workspace providers
   */
  list: adminProcedure
    .input(listProvidersSchema)
    .query(async ({ ctx, input }) => {
      const { scope, workspaceId, projectId, providerType, isActive, capability, limit, offset } = input
      const userId = ctx.user!.id

      // Check if user is Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId)

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {}

      // Scope filter
      if (scope === 'global') {
        where.isGlobal = true
      } else if (scope === 'workspace') {
        if (workspaceId) {
          where.workspaceId = workspaceId
          where.projectId = null
        } else {
          where.workspaceId = { not: null }
          where.projectId = null
        }
      } else if (scope === 'project') {
        if (projectId) {
          where.projectId = projectId
        } else {
          where.projectId = { not: null }
        }
      }
      // 'all' scope - no additional filter, but restrict non-domain admins

      // Non-domain admins can only see global + their workspace providers
      if (!isDomainAdmin && scope === 'all') {
        const userWorkspaces = await groupPermissionService.getUserWorkspaces(userId)
        const workspaceIds = userWorkspaces.map(ws => ws.id)

        where.OR = [
          { isGlobal: true },
          { workspaceId: { in: workspaceIds } },
        ]
      }

      // Additional filters
      if (providerType) {
        where.providerType = providerType
      }
      if (isActive !== undefined) {
        where.isActive = isActive
      }
      if (capability) {
        where.capabilities = { has: capability }
      }

      const [providers, total] = await Promise.all([
        ctx.prisma.aiProviderConfig.findMany({
          where,
          include: {
            workspace: {
              select: { id: true, name: true, slug: true },
            },
            project: {
              select: { id: true, name: true, identifier: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [
            { isGlobal: 'desc' },
            { priority: 'desc' },
            { name: 'asc' },
          ],
          take: limit,
          skip: offset,
        }),
        ctx.prisma.aiProviderConfig.count({ where }),
      ])

      // Mask API keys for security
      const safeProviders = providers.map(provider => ({
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
      }))

      return {
        providers: safeProviders,
        total,
        limit,
        offset,
        hasMore: offset + providers.length < total,
      }
    }),

  /**
   * Get a single AI provider by ID
   */
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id: input.id },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          project: {
            select: { id: true, name: true, identifier: true },
          },
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

      // Mask API key
      return {
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
        hasApiKey: !!provider.apiKey,
      }
    }),

  /**
   * Create a new AI provider configuration
   * Only Domain Admins can create global providers
   */
  create: adminProcedure
    .input(createProviderSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Validate scope
      const { isGlobal, workspaceId, projectId, ...providerData } = input

      // Only one scope can be set
      const scopeCount = [isGlobal, !!workspaceId, !!projectId].filter(Boolean).length
      if (scopeCount !== 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Exactly one scope must be set: isGlobal, workspaceId, or projectId',
        })
      }

      // Only Domain Admins can create global providers
      if (isGlobal) {
        const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId)
        if (!isDomainAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Domain Admins can create global AI providers',
          })
        }
      }

      // Verify workspace exists if specified
      if (workspaceId) {
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
        })
        if (!workspace) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workspace not found',
          })
        }
      }

      // Verify project exists if specified
      if (projectId) {
        const project = await ctx.prisma.project.findUnique({
          where: { id: projectId },
        })
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          })
        }
      }

      // Create the provider
      const provider = await ctx.prisma.aiProviderConfig.create({
        data: {
          isGlobal,
          workspaceId,
          projectId,
          createdById: userId,
          ...providerData,
        },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          project: {
            select: { id: true, name: true, identifier: true },
          },
        },
      })

      return {
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
      }
    }),

  /**
   * Update an AI provider configuration
   */
  update: adminProcedure
    .input(updateProviderSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const userId = ctx.user!.id

      // Check provider exists
      const existing = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not found',
        })
      }

      // Only Domain Admins can update global providers
      if (existing.isGlobal) {
        const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId)
        if (!isDomainAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Domain Admins can update global AI providers',
          })
        }
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
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          project: {
            select: { id: true, name: true, identifier: true },
          },
        },
      })

      return {
        ...provider,
        apiKey: provider.apiKey ? '••••••••' : null,
      }
    }),

  /**
   * Delete an AI provider configuration
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      const existing = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not found',
        })
      }

      // Only Domain Admins can delete global providers
      if (existing.isGlobal) {
        const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId)
        if (!isDomainAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Domain Admins can delete global AI providers',
          })
        }
      }

      await ctx.prisma.aiProviderConfig.delete({
        where: { id: input.id },
      })

      return { success: true, message: 'AI provider deleted' }
    }),

  /**
   * Test connection to an AI provider
   * Tests either an existing provider (by ID) or new settings
   */
  testConnection: adminProcedure
    .input(testConnectionSchema)
    .mutation(async ({ ctx, input }) => {
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

      // Test the connection based on provider type
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

  /**
   * Get available models from a provider
   */
  getModels: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.prisma.aiProviderConfig.findUnique({
        where: { id: input.id },
      })

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not found',
        })
      }

      if (!provider.baseUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Provider has no base URL configured',
        })
      }

      try {
        const models = await fetchProviderModels(provider.providerType, provider.baseUrl, provider.apiKey)
        return { models }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch models: ${message}`,
        })
      }
    }),

  /**
   * Get the effective provider for a specific capability
   * Returns the highest-priority active provider that supports the capability
   */
  getEffective: adminProcedure
    .input(z.object({
      capability: capabilitySchema,
      workspaceId: z.number().optional(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { capability, workspaceId, projectId } = input

      // Build priority order: project > workspace > global
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = []

      if (projectId) {
        conditions.push({ projectId, isActive: true, capabilities: { has: capability } })
      }
      if (workspaceId) {
        conditions.push({ workspaceId, projectId: null, isActive: true, capabilities: { has: capability } })
      }
      conditions.push({ isGlobal: true, isActive: true, capabilities: { has: capability } })

      // Try each scope in order, returning the highest priority provider
      for (const where of conditions) {
        const provider = await ctx.prisma.aiProviderConfig.findFirst({
          where,
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

        if (provider) {
          return {
            provider,
            scope: provider.isGlobal ? 'global' : provider.workspaceId ? 'workspace' : 'project',
          }
        }
      }

      return {
        provider: null,
        scope: null,
        message: `No active provider found for capability: ${capability}`,
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

/**
 * Fetch available models from a provider
 */
async function fetchProviderModels(
  _providerType: string,
  baseUrl: string,
  apiKey: string | null
): Promise<Array<{ id: string; type?: string }>> {
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
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json() as { data?: Array<{ id: string; owned_by?: string }> }

  if (!Array.isArray(data.data)) {
    return []
  }

  // Categorize models if possible
  return data.data.map((model) => {
    const id = model.id
    let type = 'unknown'

    // Simple heuristics to categorize models
    if (id.includes('embed') || id.includes('nomic')) {
      type = 'embedding'
    } else if (id.includes('vision') || id.includes('llava')) {
      type = 'vision'
    } else if (id.includes('gpt') || id.includes('llama') || id.includes('claude') || id.includes('mistral')) {
      type = 'reasoning'
    }

    return { id, type }
  })
}
