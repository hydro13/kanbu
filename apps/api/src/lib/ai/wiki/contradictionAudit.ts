/**
 * Contradiction Audit Service
 *
 * Fase 17.3 - Conflict Resolution & Audit Trail
 *
 * Provides:
 * - Audit logging for contradiction resolutions
 * - Resolution strategy management
 * - Revert capability within 24h window
 */

import type { PrismaClient, WikiContradictionAudit } from '@prisma/client'
import {
  ResolutionStrategy as PrismaResolutionStrategy,
  ContradictionCategory as PrismaContradictionCategory,
} from '@prisma/client'
import { ContradictionCategory } from './prompts'

// =============================================================================
// Types
// =============================================================================

/**
 * Resolution strategy enum (mirrors Prisma enum)
 * Used for TypeScript type safety
 */
export const ResolutionStrategy = {
  INVALIDATE_OLD: 'INVALIDATE_OLD',
  INVALIDATE_NEW: 'INVALIDATE_NEW',
  KEEP_BOTH: 'KEEP_BOTH',
  MERGE: 'MERGE',
  ASK_USER: 'ASK_USER',
} as const

export type ResolutionStrategy = (typeof ResolutionStrategy)[keyof typeof ResolutionStrategy]

/**
 * Default resolution strategies per category
 * Can be overridden per workspace
 */
export const DEFAULT_RESOLUTION_STRATEGIES: Record<ContradictionCategory, ResolutionStrategy> = {
  [ContradictionCategory.FACTUAL]: ResolutionStrategy.INVALIDATE_OLD,
  [ContradictionCategory.ATTRIBUTE]: ResolutionStrategy.INVALIDATE_OLD,
  [ContradictionCategory.TEMPORAL]: ResolutionStrategy.ASK_USER,
  [ContradictionCategory.SEMANTIC]: ResolutionStrategy.ASK_USER,
}

/**
 * Workspace resolution strategy configuration
 * Stored in workspace settings JSON
 */
export interface WorkspaceResolutionConfig {
  /** Default strategy when none specified */
  defaultStrategy: ResolutionStrategy
  /** Per-category overrides */
  categoryStrategies?: Partial<Record<ContradictionCategory, ResolutionStrategy>>
  /** Minimum confidence required for auto-resolution */
  autoResolveThreshold: number
  /** Hours until revert is no longer possible */
  revertWindowHours: number
}

export const DEFAULT_WORKSPACE_RESOLUTION_CONFIG: WorkspaceResolutionConfig = {
  defaultStrategy: ResolutionStrategy.INVALIDATE_OLD,
  autoResolveThreshold: 0.8,
  revertWindowHours: 24,
}

/**
 * Audit entry for contradiction resolution
 */
export interface ContradictionAuditEntry {
  id: number
  workspaceId: number
  projectId: number | null
  wikiPageId: number
  userId: number

  // The new fact that caused the contradiction
  newFactId: string
  newFact: string

  // The invalidated facts
  invalidatedFacts: Array<{
    id: string
    fact: string
  }>

  // Resolution details
  strategy: ResolutionStrategy
  confidence: number
  category: ContradictionCategory
  reasoning: string | null

  // Timestamps
  createdAt: Date
  revertedAt: Date | null
  revertedBy: number | null
  revertExpiresAt: Date

  // Computed
  canRevert: boolean
}

/**
 * Input for logging a contradiction resolution
 */
export interface LogContradictionInput {
  workspaceId: number
  projectId?: number
  wikiPageId: number
  userId: number
  newFactId: string
  newFact: string
  invalidatedFacts: Array<{
    id: string
    fact: string
  }>
  strategy: ResolutionStrategy
  confidence: number
  category: ContradictionCategory
  reasoning?: string
  revertWindowHours?: number
}

/**
 * Result of a revert operation
 */
export interface RevertResult {
  success: boolean
  auditId: number
  error?: string
  edgeIdsToRestore?: string[]
}

// =============================================================================
// Audit Service
// =============================================================================

/**
 * Contradiction Audit Service
 * Manages audit trail for wiki contradiction resolutions
 */
export class ContradictionAuditService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------

  /**
   * Log a contradiction resolution to the audit trail
   */
  async logContradictionResolution(input: LogContradictionInput): Promise<ContradictionAuditEntry> {
    const revertWindowHours = input.revertWindowHours ?? DEFAULT_WORKSPACE_RESOLUTION_CONFIG.revertWindowHours
    const revertExpiresAt = new Date(Date.now() + revertWindowHours * 60 * 60 * 1000)

    // Map TypeScript enums to Prisma enums
    const prismaStrategy = this.mapToPrismaStrategy(input.strategy)
    const prismaCategory = this.mapToPrismaCategory(input.category)

    const audit = await this.prisma.wikiContradictionAudit.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        wikiPageId: input.wikiPageId,
        userId: input.userId,
        newFactId: input.newFactId,
        newFact: input.newFact,
        invalidatedFacts: input.invalidatedFacts,
        strategy: prismaStrategy,
        confidence: input.confidence,
        category: prismaCategory,
        reasoning: input.reasoning ?? null,
        revertExpiresAt,
      },
    })

    return this.toAuditEntry(audit)
  }

  // ---------------------------------------------------------------------------
  // Querying
  // ---------------------------------------------------------------------------

  /**
   * Get audit entries for a specific wiki page
   */
  async getAuditEntriesForPage(
    wikiPageId: number,
    options?: {
      limit?: number
      offset?: number
      includeReverted?: boolean
    }
  ): Promise<ContradictionAuditEntry[]> {
    const audits = await this.prisma.wikiContradictionAudit.findMany({
      where: {
        wikiPageId,
        ...(options?.includeReverted ? {} : { revertedAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    })

    return audits.map((a) => this.toAuditEntry(a))
  }

  /**
   * Get audit entries for a workspace
   */
  async getAuditEntriesForWorkspace(
    workspaceId: number,
    options?: {
      projectId?: number
      limit?: number
      offset?: number
      includeReverted?: boolean
    }
  ): Promise<ContradictionAuditEntry[]> {
    const audits = await this.prisma.wikiContradictionAudit.findMany({
      where: {
        workspaceId,
        ...(options?.projectId ? { projectId: options.projectId } : {}),
        ...(options?.includeReverted ? {} : { revertedAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    })

    return audits.map((a) => this.toAuditEntry(a))
  }

  /**
   * Get a single audit entry by ID
   */
  async getAuditEntry(id: number): Promise<ContradictionAuditEntry | null> {
    const audit = await this.prisma.wikiContradictionAudit.findUnique({
      where: { id },
    })

    return audit ? this.toAuditEntry(audit) : null
  }

  // ---------------------------------------------------------------------------
  // Revert
  // ---------------------------------------------------------------------------

  /**
   * Check if an audit entry can be reverted
   */
  canRevertAudit(audit: ContradictionAuditEntry): { canRevert: boolean; reason?: string } {
    if (audit.revertedAt) {
      return { canRevert: false, reason: 'Already reverted' }
    }

    if (new Date() > audit.revertExpiresAt) {
      return { canRevert: false, reason: 'Revert window expired' }
    }

    return { canRevert: true }
  }

  /**
   * Revert a contradiction resolution
   *
   * This marks the audit entry as reverted and returns the edge IDs
   * that need to be restored in FalkorDB.
   *
   * Note: The actual FalkorDB restoration must be done by the caller
   * (graphitiService.restoreEdges())
   */
  async revertContradictionResolution(
    auditId: number,
    userId: number
  ): Promise<RevertResult> {
    const audit = await this.getAuditEntry(auditId)

    if (!audit) {
      return {
        success: false,
        auditId,
        error: 'Audit entry not found',
      }
    }

    const { canRevert, reason } = this.canRevertAudit(audit)
    if (!canRevert) {
      return {
        success: false,
        auditId,
        error: reason,
      }
    }

    // Mark as reverted
    await this.prisma.wikiContradictionAudit.update({
      where: { id: auditId },
      data: {
        revertedAt: new Date(),
        revertedBy: userId,
      },
    })

    // Return the edge IDs that need to be restored
    const edgeIdsToRestore = audit.invalidatedFacts.map((f) => f.id)

    return {
      success: true,
      auditId,
      edgeIdsToRestore,
    }
  }

  // ---------------------------------------------------------------------------
  // Strategy Resolution
  // ---------------------------------------------------------------------------

  /**
   * Get the resolution strategy for a contradiction based on workspace config
   */
  async getStrategyForContradiction(
    workspaceId: number,
    category: ContradictionCategory,
    confidence: number
  ): Promise<{
    strategy: ResolutionStrategy
    autoResolve: boolean
    reason: string
  }> {
    // Get workspace config from settings
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    })

    const settings = (workspace?.settings as Record<string, unknown>) || {}
    const resolutionConfig = (settings.contradictionResolution as WorkspaceResolutionConfig) ||
      DEFAULT_WORKSPACE_RESOLUTION_CONFIG

    // Get strategy for this category
    const strategy =
      resolutionConfig.categoryStrategies?.[category] ??
      DEFAULT_RESOLUTION_STRATEGIES[category] ??
      resolutionConfig.defaultStrategy

    // Determine if we should auto-resolve
    const autoResolve =
      strategy !== ResolutionStrategy.ASK_USER &&
      confidence >= resolutionConfig.autoResolveThreshold

    let reason: string
    if (strategy === ResolutionStrategy.ASK_USER) {
      reason = `Category ${category} requires user confirmation`
    } else if (confidence < resolutionConfig.autoResolveThreshold) {
      reason = `Confidence ${confidence.toFixed(2)} below threshold ${resolutionConfig.autoResolveThreshold}`
    } else {
      reason = `Auto-resolving with ${strategy} (confidence: ${confidence.toFixed(2)})`
    }

    return { strategy, autoResolve, reason }
  }

  /**
   * Update workspace resolution configuration
   */
  async updateWorkspaceResolutionConfig(
    workspaceId: number,
    config: Partial<WorkspaceResolutionConfig>
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    })

    const currentSettings = (workspace?.settings as Record<string, unknown>) || {}
    const currentConfig = (currentSettings.contradictionResolution as WorkspaceResolutionConfig) ||
      DEFAULT_WORKSPACE_RESOLUTION_CONFIG

    const newConfig: WorkspaceResolutionConfig = {
      ...currentConfig,
      ...config,
    }

    const updatedSettings = {
      ...currentSettings,
      contradictionResolution: newConfig,
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: updatedSettings as object,
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Convert Prisma model to audit entry
   */
  private toAuditEntry(audit: WikiContradictionAudit): ContradictionAuditEntry {
    const now = new Date()
    const canRevert = !audit.revertedAt && now <= audit.revertExpiresAt

    return {
      id: audit.id,
      workspaceId: audit.workspaceId,
      projectId: audit.projectId,
      wikiPageId: audit.wikiPageId,
      userId: audit.userId,
      newFactId: audit.newFactId,
      newFact: audit.newFact,
      invalidatedFacts: audit.invalidatedFacts as Array<{ id: string; fact: string }>,
      strategy: this.mapFromPrismaStrategy(audit.strategy),
      confidence: audit.confidence,
      category: this.mapFromPrismaCategory(audit.category),
      reasoning: audit.reasoning,
      createdAt: audit.createdAt,
      revertedAt: audit.revertedAt,
      revertedBy: audit.revertedBy,
      revertExpiresAt: audit.revertExpiresAt,
      canRevert,
    }
  }

  /**
   * Map TypeScript ResolutionStrategy to Prisma enum
   */
  private mapToPrismaStrategy(strategy: ResolutionStrategy): PrismaResolutionStrategy {
    return strategy as PrismaResolutionStrategy
  }

  /**
   * Map Prisma enum to TypeScript ResolutionStrategy
   */
  private mapFromPrismaStrategy(strategy: PrismaResolutionStrategy): ResolutionStrategy {
    return strategy as ResolutionStrategy
  }

  /**
   * Map TypeScript ContradictionCategory to Prisma enum
   */
  private mapToPrismaCategory(category: ContradictionCategory): PrismaContradictionCategory {
    return category as PrismaContradictionCategory
  }

  /**
   * Map Prisma enum to TypeScript ContradictionCategory
   */
  private mapFromPrismaCategory(category: PrismaContradictionCategory): ContradictionCategory {
    return category as ContradictionCategory
  }
}

// =============================================================================
// Singleton
// =============================================================================

let auditServiceInstance: ContradictionAuditService | null = null

/**
 * Get or create the ContradictionAuditService instance
 */
export function getContradictionAuditService(prisma: PrismaClient): ContradictionAuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new ContradictionAuditService(prisma)
  }
  return auditServiceInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetContradictionAuditService(): void {
  auditServiceInstance = null
}
