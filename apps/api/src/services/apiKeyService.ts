/*
 * API Key Service - Authentication & Scoped Access Control
 * Version: 1.0.0
 *
 * Centralized service for API key authentication and scoped permission checks.
 * Integrates with ACL system for permission validation.
 *
 * Features:
 *   - API key authentication with SHA256 hash verification
 *   - Scoped access (USER, WORKSPACE, PROJECT)
 *   - ACL integration for permission checks
 *   - Audit logging of API key usage
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.6 - API Keys & Service Accounts
 * =============================================================================
 */

import { createHash } from 'crypto'
import { prisma } from '../lib/prisma'
import { aclService, ACL_PERMISSIONS } from './aclService'
import { auditService, AUDIT_ACTIONS } from './auditService'
import type { ApiKeyScope } from '@prisma/client'

// =============================================================================
// Types
// =============================================================================

export interface ApiKeyContext {
  /** User ID that owns this API key */
  userId: number
  /** API Key ID */
  keyId: number
  /** API Key name (for display) */
  keyName: string
  /** Scope level: USER, WORKSPACE, or PROJECT */
  scope: ApiKeyScope
  /** Workspace ID if scope is WORKSPACE */
  workspaceId: number | null
  /** Project ID if scope is PROJECT */
  projectId: number | null
  /** Whether this is a service account key */
  isServiceAccount: boolean
  /** Service account name if applicable */
  serviceAccountName: string | null
  /** Rate limit (requests per minute) */
  rateLimit: number
}

export interface ApiKeyUsageParams {
  /** API key context */
  keyContext: ApiKeyContext
  /** Endpoint that was called */
  endpoint: string
  /** Resource type accessed */
  resourceType: string
  /** Resource ID accessed (if applicable) */
  resourceId?: number
  /** Whether the request was successful */
  success: boolean
  /** Client IP address */
  ipAddress?: string
  /** User agent string */
  userAgent?: string
  /** Error message if request failed */
  errorMessage?: string
}

// =============================================================================
// API Key Service
// =============================================================================

class ApiKeyService {
  /**
   * Hash an API key for storage/comparison
   */
  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex')
  }

  /**
   * Authenticate an API key and return the context.
   * Returns null if key is invalid, expired, or inactive.
   */
  async authenticate(apiKey: string): Promise<ApiKeyContext | null> {
    // Validate key format
    if (!apiKey || !apiKey.startsWith('kb_')) {
      return null
    }

    // Hash the key for lookup
    const keyHash = this.hashKey(apiKey)

    // Find the key in database
    const key = await prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
      include: {
        user: { select: { id: true, isActive: true } },
      },
    })

    // Key not found or user inactive
    if (!key || !key.user.isActive) {
      return null
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore errors - this is non-critical
      })

    return {
      userId: key.userId,
      keyId: key.id,
      keyName: key.name,
      scope: key.scope,
      workspaceId: key.workspaceId,
      projectId: key.projectId,
      isServiceAccount: key.isServiceAccount,
      serviceAccountName: key.serviceAccountName,
      rateLimit: key.rateLimit,
    }
  }

  /**
   * Check if API key has permission for a resource.
   * Combines scope restrictions with user's ACL permissions.
   *
   * @param keyContext - API key context from authenticate()
   * @param resourceType - Type of resource ('workspace' or 'project')
   * @param resourceId - ID of the resource
   * @param requiredPermission - ACL permission bitmask (e.g., ACL_PERMISSIONS.READ)
   */
  async hasPermission(
    keyContext: ApiKeyContext,
    resourceType: 'workspace' | 'project',
    resourceId: number,
    requiredPermission: number
  ): Promise<boolean> {
    // Step 1: Check scope restrictions
    if (!this.isInScope(keyContext, resourceType, resourceId)) {
      return false
    }

    // Step 2: If project-scoped, verify project belongs to allowed workspace
    if (keyContext.scope === 'WORKSPACE' && resourceType === 'project') {
      const project = await prisma.project.findUnique({
        where: { id: resourceId },
        select: { workspaceId: true },
      })

      if (!project || project.workspaceId !== keyContext.workspaceId) {
        return false
      }
    }

    // Step 3: Check user's ACL permissions (deny-first)
    return aclService.hasPermission(
      keyContext.userId,
      resourceType,
      resourceId,
      requiredPermission
    )
  }

  /**
   * Check if a resource is within the API key's scope.
   */
  private isInScope(
    keyContext: ApiKeyContext,
    resourceType: 'workspace' | 'project',
    resourceId: number
  ): boolean {
    switch (keyContext.scope) {
      case 'USER':
        // No scope restriction - use full user permissions
        return true

      case 'WORKSPACE':
        if (resourceType === 'workspace') {
          return keyContext.workspaceId === resourceId
        }
        // For projects, we'll check workspace membership in hasPermission
        return true

      case 'PROJECT':
        if (resourceType === 'project') {
          return keyContext.projectId === resourceId
        }
        // Workspace-level operations not allowed with project-scoped key
        return false

      default:
        return false
    }
  }

  /**
   * Require permission or throw an error.
   * Use this in tRPC procedures for access control.
   */
  async requirePermission(
    keyContext: ApiKeyContext,
    resourceType: 'workspace' | 'project',
    resourceId: number,
    requiredPermission: number,
    errorMessage?: string
  ): Promise<void> {
    const hasAccess = await this.hasPermission(
      keyContext,
      resourceType,
      resourceId,
      requiredPermission
    )

    if (!hasAccess) {
      throw new Error(
        errorMessage || `API key does not have access to ${resourceType} ${resourceId}`
      )
    }
  }

  /**
   * Log API key usage to the audit log.
   */
  async logUsage(params: ApiKeyUsageParams): Promise<void> {
    const action = params.success
      ? AUDIT_ACTIONS.API_KEY_USED
      : AUDIT_ACTIONS.API_REQUEST_DENIED

    await auditService.logApiEvent({
      action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      resourceName: params.keyContext.keyName,
      userId: params.keyContext.userId,
      workspaceId: params.keyContext.workspaceId ?? undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        endpoint: params.endpoint,
        keyId: params.keyContext.keyId,
        scope: params.keyContext.scope,
        isServiceAccount: params.keyContext.isServiceAccount,
        ...(params.errorMessage && { error: params.errorMessage }),
      },
    })
  }

  /**
   * Get workspace IDs that an API key can access.
   * For USER scope, returns null (all user's workspaces).
   * For WORKSPACE scope, returns the specific workspace.
   * For PROJECT scope, returns the project's workspace.
   */
  async getAccessibleWorkspaceIds(keyContext: ApiKeyContext): Promise<number[] | null> {
    switch (keyContext.scope) {
      case 'USER':
        // Full user access - return null to indicate no restriction
        return null

      case 'WORKSPACE':
        return keyContext.workspaceId ? [keyContext.workspaceId] : []

      case 'PROJECT':
        if (!keyContext.projectId) {
          return []
        }
        // Get the project's workspace
        const project = await prisma.project.findUnique({
          where: { id: keyContext.projectId },
          select: { workspaceId: true },
        })
        return project ? [project.workspaceId] : []

      default:
        return []
    }
  }

  /**
   * Get project IDs that an API key can access.
   * For USER scope, returns null (all user's projects).
   * For WORKSPACE scope, returns null (all projects in workspace, filtered by ACL).
   * For PROJECT scope, returns the specific project.
   */
  async getAccessibleProjectIds(keyContext: ApiKeyContext): Promise<number[] | null> {
    switch (keyContext.scope) {
      case 'USER':
        return null

      case 'WORKSPACE':
        return null // ACL will filter to workspace's projects

      case 'PROJECT':
        return keyContext.projectId ? [keyContext.projectId] : []

      default:
        return []
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService()

// Re-export for convenience
export { ACL_PERMISSIONS }
