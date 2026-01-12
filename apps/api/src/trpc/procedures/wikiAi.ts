/**
 * Wiki AI Procedures
 * Version: 1.1.0
 *
 * tRPC procedures for Wiki AI features.
 * Provides access to embeddings, entity extraction, text operations,
 * and semantic search for Wiki pages using configured AI providers.
 *
 * Fase: 15.1 - Provider Koppeling
 * Fase: 15.2 - Semantic Search
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
import {
  getWikiAiService,
  WikiAiError,
  type WikiContext,
} from '../../lib/ai/wiki'
import { getGraphitiService } from '../../services/graphitiService'

// =============================================================================
// Input Schemas
// =============================================================================

const wikiContextSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
})

const embedSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  text: z.string().min(1).max(100000),
})

const embedBatchSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  texts: z.array(z.string().min(1).max(100000)).min(1).max(100),
})

const extractEntitiesSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  text: z.string().min(1).max(100000),
  entityTypes: z
    .array(z.string())
    .optional()
    .default(['WikiPage', 'Task', 'User', 'Project', 'Concept']),
})

const summarizeSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  text: z.string().min(1).max(100000),
  maxLength: z.number().min(50).max(10000).optional(),
})

const chatSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1),
    })
  ),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(128000).optional(),
    })
    .optional(),
})

// Semantic Search schemas (Fase 15.2)
const semanticSearchSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  query: z.string().min(1).max(1000),
  groupId: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  scoreThreshold: z.number().min(0).max(1).optional().default(0.5),
})

const similarPagesSchema = z.object({
  workspaceId: z.number(),
  pageId: z.number(),
  limit: z.number().min(1).max(20).optional().default(5),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Verify user has access to the workspace using the permission service
 */
async function verifyWorkspaceAccess(
  userId: number,
  workspaceId: number
): Promise<void> {
  await permissionService.requireWorkspaceAccess(userId, workspaceId, 'VIEWER')
}

/**
 * Handle WikiAiError and convert to TRPCError
 */
function handleWikiAiError(error: unknown): never {
  if (error instanceof WikiAiError) {
    const codeMap: Record<WikiAiError['code'], 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR'> = {
      NO_EMBEDDING_PROVIDER: 'NOT_FOUND',
      NO_REASONING_PROVIDER: 'NOT_FOUND',
      PROVIDER_ERROR: 'INTERNAL_SERVER_ERROR',
      INVALID_INPUT: 'BAD_REQUEST',
    }

    throw new TRPCError({
      code: codeMap[error.code],
      message: error.message,
    })
  }

  if (error instanceof TRPCError) {
    throw error
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  })
}

// =============================================================================
// Wiki AI Router
// =============================================================================

export const wikiAiRouter = router({
  /**
   * Get AI capabilities available for a workspace/project context
   */
  getCapabilities: protectedProcedure
    .input(wikiContextSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        return await service.getCapabilities(context)
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Test connection to AI providers for a workspace/project context
   */
  testConnection: protectedProcedure
    .input(wikiContextSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        return await service.testConnection(context)
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Get embedding for a single text
   */
  embed: protectedProcedure.input(embedSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user!.id

    // Verify access
    await verifyWorkspaceAccess(userId, input.workspaceId)

    const service = getWikiAiService(ctx.prisma)
    const context: WikiContext = {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    }

    try {
      const result = await service.embed(context, input.text)
      return {
        success: true,
        dimensions: result.dimensions,
        model: result.model,
        provider: result.provider,
        // Return first 10 values as sample to avoid huge response
        embeddingSample: result.embedding.slice(0, 10),
        embeddingLength: result.embedding.length,
      }
    } catch (error) {
      handleWikiAiError(error)
    }
  }),

  /**
   * Get embeddings for multiple texts (batched)
   */
  embedBatch: protectedProcedure
    .input(embedBatchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        const results = await service.embedBatch(context, input.texts)
        return {
          success: true,
          count: results.length,
          dimensions: results[0]?.dimensions ?? 0,
          model: results[0]?.model ?? 'unknown',
          provider: results[0]?.provider ?? 'unknown',
        }
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Extract entities from text using AI
   */
  extractEntities: protectedProcedure
    .input(extractEntitiesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        const result = await service.extractEntities(
          context,
          input.text,
          input.entityTypes
        )
        return {
          success: true,
          entities: result.entities,
          provider: result.provider,
          model: result.model,
          count: result.entities.length,
        }
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Summarize text using AI
   */
  summarize: protectedProcedure
    .input(summarizeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        const result = await service.summarize(
          context,
          input.text,
          input.maxLength
        )
        return {
          success: true,
          summary: result.summary,
          originalLength: result.originalLength,
          summaryLength: result.summaryLength,
          provider: result.provider,
        }
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  /**
   * Chat with AI (non-streaming)
   * For simple Q&A or single-turn conversations
   */
  chat: protectedProcedure.input(chatSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user!.id

    // Verify access
    await verifyWorkspaceAccess(userId, input.workspaceId)

    const service = getWikiAiService(ctx.prisma)
    const context: WikiContext = {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    }

    try {
      const response = await service.chat(context, input.messages, input.options)
      return {
        success: true,
        response,
        provider: (await service.getCapabilities(context)).reasoningProvider,
        model: (await service.getCapabilities(context)).reasoningModel,
      }
    } catch (error) {
      handleWikiAiError(error)
    }
  }),

  /**
   * Get embedding info for a context without generating embeddings
   */
  getEmbeddingInfo: protectedProcedure
    .input(wikiContextSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const service = getWikiAiService(ctx.prisma)
      const context: WikiContext = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      try {
        return await service.getEmbeddingInfo(context)
      } catch (error) {
        handleWikiAiError(error)
      }
    }),

  // ===========================================================================
  // Semantic Search (Fase 15.2)
  // ===========================================================================

  /**
   * Search wiki pages by semantic similarity
   * Uses embeddings to find pages related to the query meaning
   */
  semanticSearch: protectedProcedure
    .input(semanticSearchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const graphitiService = getGraphitiService(ctx.prisma)

      try {
        const results = await graphitiService.semanticSearch(
          input.query,
          input.workspaceId,
          {
            projectId: input.projectId,
            groupId: input.groupId,
            limit: input.limit,
            scoreThreshold: input.scoreThreshold,
          }
        )

        return {
          success: true,
          results,
          count: results.length,
          query: input.query,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Semantic search failed',
        })
      }
    }),

  /**
   * Find wiki pages similar to a given page
   */
  findSimilarPages: protectedProcedure
    .input(similarPagesSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const graphitiService = getGraphitiService(ctx.prisma)

      try {
        const results = await graphitiService.findSimilarPages(
          input.pageId,
          input.workspaceId,
          input.limit
        )

        return {
          success: true,
          results,
          count: results.length,
          sourcePageId: input.pageId,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Find similar pages failed',
        })
      }
    }),

  /**
   * Get embedding statistics for the wiki
   */
  getEmbeddingStats: protectedProcedure
    .input(wikiContextSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const graphitiService = getGraphitiService(ctx.prisma)

      try {
        return await graphitiService.getEmbeddingStats()
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Get embedding stats failed',
        })
      }
    }),
})
