/*
 * AuditService - Security Event Logging
 * Version: 1.0.0
 *
 * Centralized audit logging for all security-critical events.
 * Tracks ACL changes, user management, group operations, workspace changes,
 * and system settings modifications.
 *
 * Categories:
 *   - ACL: Permission grants, denies, revocations
 *   - GROUP: Group CRUD, member add/remove
 *   - USER: User CRUD, password resets, 2FA, lockouts
 *   - WORKSPACE: Workspace CRUD, member management
 *   - SETTINGS: System setting changes, backups
 *
 * Access Control:
 *   - Domain Admins: See all audit logs
 *   - Workspace Admins: See logs scoped to their workspaces
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 9.1 - Audit Logging
 * =============================================================================
 */

import { prisma } from '../lib/prisma'
import type { Prisma } from '@prisma/client'

// =============================================================================
// Constants
// =============================================================================

export const AUDIT_CATEGORIES = {
  ACL: 'ACL',
  GROUP: 'GROUP',
  USER: 'USER',
  WORKSPACE: 'WORKSPACE',
  SETTINGS: 'SETTINGS',
} as const

export type AuditCategory = keyof typeof AUDIT_CATEGORIES

export const AUDIT_ACTIONS = {
  // ACL
  ACL_GRANTED: 'acl:granted',
  ACL_DENIED: 'acl:denied',
  ACL_REVOKED: 'acl:revoked',
  ACL_DELETED: 'acl:deleted',

  // GROUP
  GROUP_CREATED: 'group:created',
  GROUP_UPDATED: 'group:updated',
  GROUP_DELETED: 'group:deleted',
  GROUP_MEMBER_ADDED: 'group:member:added',
  GROUP_MEMBER_REMOVED: 'group:member:removed',

  // USER
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_REACTIVATED: 'user:reactivated',
  USER_PASSWORD_RESET: 'user:password:reset',
  USER_2FA_DISABLED: 'user:2fa:disabled',
  USER_SESSIONS_REVOKED: 'user:sessions:revoked',
  USER_UNLOCKED: 'user:unlocked',

  // WORKSPACE
  WORKSPACE_CREATED: 'workspace:created',
  WORKSPACE_UPDATED: 'workspace:updated',
  WORKSPACE_DELETED: 'workspace:deleted',
  WORKSPACE_MEMBER_ADDED: 'workspace:member:added',
  WORKSPACE_MEMBER_REMOVED: 'workspace:member:removed',
  WORKSPACE_MEMBER_ROLE_CHANGED: 'workspace:member:role:changed',

  // SETTINGS
  SETTING_CHANGED: 'setting:changed',
  BACKUP_CREATED: 'backup:created',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

// =============================================================================
// Types
// =============================================================================

export interface AuditLogParams {
  /** Event category */
  category: AuditCategory
  /** Specific action performed */
  action: string
  /** Type of the primary resource affected */
  resourceType: string
  /** ID of the primary resource (null for global actions) */
  resourceId?: number | null
  /** Human-readable name of the resource */
  resourceName?: string
  /** Type of secondary target (e.g., 'user' when adding user to group) */
  targetType?: string
  /** ID of the secondary target */
  targetId?: number
  /** Human-readable name of the secondary target */
  targetName?: string
  /** Before/after values for tracking changes */
  changes?: Prisma.InputJsonValue
  /** Additional metadata */
  metadata?: Prisma.InputJsonValue
  /** User who performed the action */
  userId: number
  /** Workspace ID for scope filtering (null for system-wide actions) */
  workspaceId?: number | null
  /** Client IP address */
  ipAddress?: string
  /** Client user agent */
  userAgent?: string
}

export interface AuditLogEntry {
  id: number
  category: string
  action: string
  resourceType: string
  resourceId: number | null
  resourceName: string | null
  targetType: string | null
  targetId: number | null
  targetName: string | null
  changes: Prisma.JsonValue
  metadata: Prisma.JsonValue
  userId: number
  workspaceId: number | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user?: {
    id: number
    username: string
    name: string
  }
  workspace?: {
    id: number
    name: string
    slug: string
  } | null
}

// =============================================================================
// AuditService Class
// =============================================================================

export class AuditService {
  /**
   * Log an audit event.
   *
   * @param params - Audit log parameters
   * @returns The created audit log entry ID
   */
  async log(params: AuditLogParams): Promise<{ id: number }> {
    const entry = await prisma.auditLog.create({
      data: {
        category: params.category,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        resourceName: params.resourceName ?? null,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? null,
        changes: params.changes ?? {},
        metadata: params.metadata ?? {},
        userId: params.userId,
        workspaceId: params.workspaceId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
      select: { id: true },
    })

    return entry
  }

  /**
   * Log an ACL event.
   */
  async logAclEvent(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<{ id: number }> {
    return this.log({ ...params, category: 'ACL' })
  }

  /**
   * Log a group event.
   */
  async logGroupEvent(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<{ id: number }> {
    return this.log({ ...params, category: 'GROUP' })
  }

  /**
   * Log a user management event.
   */
  async logUserEvent(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<{ id: number }> {
    return this.log({ ...params, category: 'USER' })
  }

  /**
   * Log a workspace event.
   */
  async logWorkspaceEvent(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<{ id: number }> {
    return this.log({ ...params, category: 'WORKSPACE' })
  }

  /**
   * Log a settings/system event.
   */
  async logSettingsEvent(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<{ id: number }> {
    return this.log({ ...params, category: 'SETTINGS' })
  }

  /**
   * Get a single audit log entry by ID.
   *
   * @param id - Audit log entry ID
   * @returns The audit log entry or null
   */
  async getById(id: number): Promise<AuditLogEntry | null> {
    const entry = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!entry) return null

    return {
      ...entry,
      changes: entry.changes,
      metadata: entry.metadata,
    }
  }

  /**
   * List audit log entries with filtering and pagination.
   *
   * @param params - Query parameters
   * @returns Paginated list of audit log entries
   */
  async list(params: {
    category?: AuditCategory
    action?: string
    resourceType?: string
    resourceId?: number
    targetType?: string
    targetId?: number
    userId?: number
    workspaceId?: number
    workspaceIds?: number[]
    dateFrom?: Date
    dateTo?: Date
    search?: string
    limit?: number
    offset?: number
    sortOrder?: 'asc' | 'desc'
  }): Promise<{
    entries: AuditLogEntry[]
    total: number
  }> {
    const {
      category,
      action,
      resourceType,
      resourceId,
      targetType,
      targetId,
      userId,
      workspaceId,
      workspaceIds,
      dateFrom,
      dateTo,
      search,
      limit = 50,
      offset = 0,
      sortOrder = 'desc',
    } = params

    // Build where clause
    const where: Record<string, unknown> = {}

    if (category) where.category = category
    if (action) where.action = action
    if (resourceType) where.resourceType = resourceType
    if (resourceId !== undefined) where.resourceId = resourceId
    if (targetType) where.targetType = targetType
    if (targetId !== undefined) where.targetId = targetId
    if (userId) where.userId = userId

    // Workspace scope filtering
    if (workspaceId !== undefined) {
      where.workspaceId = workspaceId
    } else if (workspaceIds && workspaceIds.length > 0) {
      // For workspace admins - can only see logs from their workspaces
      where.workspaceId = { in: workspaceIds }
    }

    // Date range
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = dateFrom
      if (dateTo) (where.createdAt as Record<string, Date>).lte = dateTo
    }

    // Search in resourceName, targetName, action
    if (search) {
      where.OR = [
        { resourceName: { contains: search, mode: 'insensitive' } },
        { targetName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
          workspace: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      entries: entries.map((entry) => ({
        ...entry,
        changes: entry.changes,
        metadata: entry.metadata,
      })),
      total,
    }
  }

  /**
   * Get audit statistics for dashboards.
   *
   * @param params - Query parameters
   * @returns Statistics grouped by category and action
   */
  async getStats(params: {
    workspaceIds?: number[]
    dateFrom?: Date
    dateTo?: Date
  }): Promise<{
    byCategory: { category: string; count: number }[]
    byAction: { action: string; count: number }[]
    total: number
  }> {
    const { workspaceIds, dateFrom, dateTo } = params

    const where: Record<string, unknown> = {}

    if (workspaceIds && workspaceIds.length > 0) {
      where.workspaceId = { in: workspaceIds }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = dateFrom
      if (dateTo) (where.createdAt as Record<string, Date>).lte = dateTo
    }

    const [byCategory, byAction, total] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      byAction: byAction.map((a) => ({
        action: a.action,
        count: a._count.id,
      })),
      total,
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const auditService = new AuditService()
