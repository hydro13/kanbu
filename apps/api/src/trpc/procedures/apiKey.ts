/*
 * API Key Procedures
 * Version: 2.0.0
 *
 * tRPC procedures for API key management.
 * Supports scoped access (USER, WORKSPACE, PROJECT) and service accounts.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:07 CET
 *
 * Modified: 2026-01-09
 * Fase: 9.6 - API Keys & Service Accounts
 * Change: Added scoped access (USER/WORKSPACE/PROJECT) and service accounts
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { randomBytes, createHash } from 'crypto';
import { router, protectedProcedure } from '../router';
import { auditService, AUDIT_ACTIONS } from '../../services/auditService';
import { aclService, ACL_PERMISSIONS } from '../../services/aclService';

// =============================================================================
// Constants
// =============================================================================

const API_KEY_PREFIX = 'kb_'; // Kanbu API key prefix
const KEY_LENGTH = 32; // 32 bytes = 64 hex chars

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
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a new API key
 * Returns: { key: full key (shown once), prefix: first 8 chars, hash: for storage }
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(KEY_LENGTH).toString('hex');
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = key.substring(0, 8);
  const hash = createHash('sha256').update(key).digest('hex');

  return { key, prefix, hash };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// =============================================================================
// Input Schemas
// =============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.array(z.enum(API_PERMISSIONS)).default([]),
  rateLimit: z.number().min(10).max(10000).default(100),
  expiresAt: z.string().datetime().optional(),
  // Scope fields (Fase 9.6)
  scope: z.enum(['USER', 'WORKSPACE', 'PROJECT']).default('USER'),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
  // Service account fields (Fase 9.6)
  isServiceAccount: z.boolean().default(false),
  serviceAccountName: z.string().max(100).optional(),
});

const revokeApiKeySchema = z.object({
  keyId: z.number(),
});

const updateApiKeySchema = z.object({
  keyId: z.number(),
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.enum(API_PERMISSIONS)).optional(),
  rateLimit: z.number().min(10).max(10000).optional(),
  isActive: z.boolean().optional(),
});

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
        // Scope fields (Fase 9.6)
        scope: true,
        workspaceId: true,
        projectId: true,
        isServiceAccount: true,
        serviceAccountName: true,
        // Include related workspace/project names
        workspace: { select: { id: true, name: true, slug: true } },
        project: { select: { id: true, name: true, identifier: true } },
      },
    });

    return keys.map((key) => ({
      ...key,
      permissions: key.permissions as ApiPermission[],
      isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
    }));
  }),

  /**
   * Create a new API key
   * Returns the full key ONCE - it cannot be retrieved again
   */
  create: protectedProcedure.input(createApiKeySchema).mutation(async ({ ctx, input }) => {
    // Validate scope requirements
    if (input.scope === 'WORKSPACE' && !input.workspaceId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Workspace ID is required for WORKSPACE scope',
      });
    }
    if (input.scope === 'PROJECT' && !input.projectId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Project ID is required for PROJECT scope',
      });
    }
    if (input.isServiceAccount && !input.serviceAccountName) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Service account name is required for service accounts',
      });
    }

    // Validate user has access to workspace/project using ACL
    if (input.workspaceId) {
      const hasWorkspaceAccess = await aclService.hasPermission(
        ctx.user.id,
        'workspace',
        input.workspaceId,
        ACL_PERMISSIONS.READ
      );
      if (!hasWorkspaceAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this workspace',
        });
      }
    }
    if (input.projectId) {
      const hasProjectAccess = await aclService.hasPermission(
        ctx.user.id,
        'project',
        input.projectId,
        ACL_PERMISSIONS.READ
      );
      if (!hasProjectAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }
    }

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
        // Scope fields (Fase 9.6)
        scope: input.scope,
        workspaceId:
          input.scope === 'WORKSPACE' || input.scope === 'PROJECT' ? input.workspaceId : null,
        projectId: input.scope === 'PROJECT' ? input.projectId : null,
        isServiceAccount: input.isServiceAccount,
        serviceAccountName: input.isServiceAccount ? input.serviceAccountName : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
        scope: true,
        workspaceId: true,
        projectId: true,
        isServiceAccount: true,
        serviceAccountName: true,
      },
    });

    // Audit log: API key created
    await auditService.logApiEvent({
      action: AUDIT_ACTIONS.API_KEY_CREATED,
      resourceType: 'api_key',
      resourceId: apiKey.id,
      resourceName: apiKey.name,
      userId: ctx.user.id,
      workspaceId: apiKey.workspaceId ?? undefined,
      metadata: {
        scope: apiKey.scope,
        isServiceAccount: apiKey.isServiceAccount,
        projectId: apiKey.projectId,
      },
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });

    return {
      ...apiKey,
      permissions: apiKey.permissions as ApiPermission[],
      // This is the ONLY time the full key is returned
      key,
    };
  }),

  /**
   * Update an API key
   */
  update: protectedProcedure.input(updateApiKeySchema).mutation(async ({ ctx, input }) => {
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
        scope: true,
        workspaceId: true,
        projectId: true,
        isServiceAccount: true,
        serviceAccountName: true,
      },
    });

    // Audit log: API key updated
    await auditService.logApiEvent({
      action: AUDIT_ACTIONS.API_KEY_UPDATED,
      resourceType: 'api_key',
      resourceId: updated.id,
      resourceName: updated.name,
      userId: ctx.user.id,
      workspaceId: updated.workspaceId ?? undefined,
      changes: {
        before: {
          name: existing.name,
          permissions: existing.permissions,
          rateLimit: existing.rateLimit,
          isActive: existing.isActive,
        },
        after: {
          name: updated.name,
          permissions: updated.permissions,
          rateLimit: updated.rateLimit,
          isActive: updated.isActive,
        },
      },
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });

    return {
      success: true,
      key: {
        ...updated,
        permissions: updated.permissions as ApiPermission[],
      },
    };
  }),

  /**
   * Revoke (delete) an API key
   */
  revoke: protectedProcedure.input(revokeApiKeySchema).mutation(async ({ ctx, input }) => {
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

    // Audit log: API key revoked
    await auditService.logApiEvent({
      action: AUDIT_ACTIONS.API_KEY_REVOKED,
      resourceType: 'api_key',
      resourceId: existing.id,
      resourceName: existing.name,
      userId: ctx.user.id,
      workspaceId: existing.workspaceId ?? undefined,
      metadata: {
        scope: existing.scope,
        isServiceAccount: existing.isServiceAccount,
      },
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });

    return { success: true };
  }),

  /**
   * Get available permissions
   */
  getPermissions: protectedProcedure.query(() => {
    return API_PERMISSIONS.map((p) => ({
      value: p,
      label: p.replace(':', ' ').replace(/^\w/, (c) => c.toUpperCase()),
      description: getPermissionDescription(p),
    }));
  }),
});

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
  };
  return descriptions[permission];
}
