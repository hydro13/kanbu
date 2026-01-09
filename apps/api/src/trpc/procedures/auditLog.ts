/*
 * Audit Log Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for querying and exporting audit logs.
 * Provides scoped access: Domain Admins see all, Workspace Admins see their workspace.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 259 - Audit Logging Implementation
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../router'
import { scopeService, AUDIT_CATEGORIES } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const listAuditLogsSchema = z.object({
  category: z.enum(['ACL', 'GROUP', 'USER', 'WORKSPACE', 'SETTINGS', 'PROJECT', 'TASK', 'SUBTASK', 'COMMENT']).optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.number().optional(),
  userId: z.number().optional(),
  workspaceId: z.number().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
  mcpOnly: z.boolean().optional(), // Fase 16: Filter for Claude Code/MCP actions only
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const getAuditLogSchema = z.object({
  id: z.number(),
})

const getAuditStatsSchema = z.object({
  workspaceId: z.number().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
})

const exportAuditLogsSchema = z.object({
  category: z.enum(['ACL', 'GROUP', 'USER', 'WORKSPACE', 'SETTINGS', 'PROJECT', 'TASK', 'SUBTASK', 'COMMENT']).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  workspaceId: z.number().optional(),
  mcpOnly: z.boolean().optional(), // Fase 16: Filter for Claude Code/MCP actions only
  format: z.enum(['csv', 'json']).default('csv'),
})

// =============================================================================
// Audit Log Router
// =============================================================================

export const auditLogRouter = router({
  /**
   * List audit logs with filtering and pagination.
   * Results are scoped based on user's admin level:
   * - Domain Admins: See all logs
   * - Workspace Admins: See only logs for their workspace(s)
   */
  list: adminProcedure
    .input(listAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const { category, action, resourceType, resourceId, userId, workspaceId, dateFrom, dateTo, search, mcpOnly, limit, offset, sortOrder } = input

      // Get user's scope to determine what they can see
      const userScope = await scopeService.getUserScope(ctx.user!.id)

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {}

      // Scope filtering: non-Domain Admins can only see their workspace logs
      if (!userScope.isDomainAdmin) {
        if (userScope.workspaceIds.length === 0) {
          // No workspace access, return empty
          return { logs: [], total: 0, limit, offset, hasMore: false }
        }
        where.OR = [
          { workspaceId: { in: userScope.workspaceIds } },
          { workspaceId: null }, // System-level events if they have admin access
        ]
      }

      // Apply filters
      if (category) {
        where.category = category
      }

      if (action) {
        where.action = { contains: action, mode: 'insensitive' }
      }

      if (resourceType) {
        where.resourceType = resourceType
      }

      if (resourceId) {
        where.resourceId = resourceId
      }

      if (userId) {
        where.userId = userId
      }

      if (workspaceId) {
        // If specific workspace requested, verify user can access it
        if (!userScope.isDomainAdmin && !userScope.workspaceIds.includes(workspaceId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to audit logs for this workspace',
          })
        }
        where.workspaceId = workspaceId
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) {
          where.createdAt.gte = dateFrom
        }
        if (dateTo) {
          where.createdAt.lte = dateTo
        }
      }

      if (search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { resourceName: { contains: search, mode: 'insensitive' } },
              { targetName: { contains: search, mode: 'insensitive' } },
              { action: { contains: search, mode: 'insensitive' } },
            ],
          },
        ]
      }

      // Fase 16: MCP/Claude Code only filter
      if (mcpOnly) {
        where.AND = [
          ...(where.AND || []),
          {
            metadata: {
              path: ['via'],
              equals: 'assistant',
            },
          },
        ]
      }

      const [logs, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          select: {
            id: true,
            category: true,
            action: true,
            resourceType: true,
            resourceId: true,
            resourceName: true,
            targetType: true,
            targetId: true,
            targetName: true,
            changes: true,
            metadata: true,
            userId: true,
            workspaceId: true,
            ipAddress: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: sortOrder },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.auditLog.count({ where }),
      ])

      return {
        logs,
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      }
    }),

  /**
   * Get a single audit log entry by ID.
   * Checks if user has access to the log based on scope.
   */
  get: adminProcedure
    .input(getAuditLogSchema)
    .query(async ({ ctx, input }) => {
      const userScope = await scopeService.getUserScope(ctx.user!.id)

      const log = await ctx.prisma.auditLog.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      })

      if (!log) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audit log entry not found',
        })
      }

      // Check scope access
      if (!userScope.isDomainAdmin) {
        if (log.workspaceId && !userScope.workspaceIds.includes(log.workspaceId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this audit log entry',
          })
        }
      }

      return log
    }),

  /**
   * Get audit log statistics for dashboard.
   * Returns counts by category, action trends, etc.
   */
  getStats: adminProcedure
    .input(getAuditStatsSchema)
    .query(async ({ ctx, input }) => {
      const { workspaceId, dateFrom, dateTo } = input
      const userScope = await scopeService.getUserScope(ctx.user!.id)

      // Build base where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {}

      // Scope filtering
      if (!userScope.isDomainAdmin) {
        if (userScope.workspaceIds.length === 0) {
          return {
            totalLogs: 0,
            byCategory: {},
            recentActions: [],
            topActors: [],
          }
        }
        where.OR = [
          { workspaceId: { in: userScope.workspaceIds } },
          { workspaceId: null },
        ]
      }

      if (workspaceId) {
        if (!userScope.isDomainAdmin && !userScope.workspaceIds.includes(workspaceId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to audit logs for this workspace',
          })
        }
        where.workspaceId = workspaceId
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      // Get counts by category
      const categoryStats = await ctx.prisma.auditLog.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      })

      const byCategory: Record<string, number> = {}
      for (const stat of categoryStats) {
        byCategory[stat.category] = stat._count.id
      }

      // Get total count
      const totalLogs = Object.values(byCategory).reduce((sum, count) => sum + count, 0)

      // Get most recent actions
      const recentActions = await ctx.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          resourceName: true,
          createdAt: true,
          user: {
            select: { name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      // Get top actors (users with most actions)
      const topActorsData = await ctx.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      })

      const topActorUserIds = topActorsData.map(a => a.userId)
      const topActorUsers = await ctx.prisma.user.findMany({
        where: { id: { in: topActorUserIds } },
        select: { id: true, name: true, username: true, avatarUrl: true },
      })
      const userMap = new Map(topActorUsers.map(u => [u.id, u]))

      const topActors = topActorsData.map(a => ({
        user: userMap.get(a.userId),
        count: a._count.id,
      }))

      return {
        totalLogs,
        byCategory,
        recentActions,
        topActors,
      }
    }),

  /**
   * Export audit logs to CSV or JSON format.
   * Returns the data as a string that can be downloaded.
   */
  export: adminProcedure
    .input(exportAuditLogsSchema)
    .mutation(async ({ ctx, input }) => {
      const { category, dateFrom, dateTo, workspaceId, format } = input
      const userScope = await scopeService.getUserScope(ctx.user!.id)

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {}

      // Scope filtering
      if (!userScope.isDomainAdmin) {
        if (userScope.workspaceIds.length === 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to export audit logs',
          })
        }
        where.OR = [
          { workspaceId: { in: userScope.workspaceIds } },
          { workspaceId: null },
        ]
      }

      if (category) where.category = category
      if (workspaceId) {
        if (!userScope.isDomainAdmin && !userScope.workspaceIds.includes(workspaceId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to audit logs for this workspace',
          })
        }
        where.workspaceId = workspaceId
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      // Fetch logs (limit to 10000 for export)
      const logs = await ctx.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          category: true,
          action: true,
          resourceType: true,
          resourceId: true,
          resourceName: true,
          targetType: true,
          targetId: true,
          targetName: true,
          changes: true,
          metadata: true,
          userId: true,
          workspaceId: true,
          ipAddress: true,
          createdAt: true,
          user: {
            select: { name: true, username: true, email: true },
          },
          workspace: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      })

      if (format === 'json') {
        return {
          data: JSON.stringify(logs, null, 2),
          filename: `audit_logs_${new Date().toISOString().slice(0, 10)}.json`,
          mimeType: 'application/json',
          count: logs.length,
        }
      }

      // CSV format
      const headers = [
        'ID',
        'Timestamp',
        'Category',
        'Action',
        'Resource Type',
        'Resource ID',
        'Resource Name',
        'Target Type',
        'Target ID',
        'Target Name',
        'Actor',
        'Actor Email',
        'Workspace',
        'IP Address',
        'Changes',
      ]

      const rows = logs.map(log => [
        log.id,
        log.createdAt.toISOString(),
        log.category,
        log.action,
        log.resourceType,
        log.resourceId ?? '',
        log.resourceName ?? '',
        log.targetType ?? '',
        log.targetId ?? '',
        log.targetName ?? '',
        log.user?.name || log.user?.username || '',
        log.user?.email || '',
        log.workspace?.name ?? 'System',
        log.ipAddress ?? '',
        JSON.stringify(log.changes),
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            const str = String(cell)
            // Escape quotes and wrap in quotes if contains comma or newline
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          }).join(',')
        ),
      ].join('\n')

      return {
        data: csvContent,
        filename: `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
        mimeType: 'text/csv',
        count: logs.length,
      }
    }),

  /**
   * Get available categories for filtering
   */
  getCategories: adminProcedure
    .query(() => {
      return Object.values(AUDIT_CATEGORIES)
    }),
})
