/*
 * Export Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for exporting tasks and projects.
 * Supports multiple formats: CSV, JSON, Trello-compatible.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:55 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import {
  type TaskExportData,
  type ProjectExportData,
  type ExportFormat,
  exportTasksToCSV,
  exportTasksToTrelloCSV,
  exportTasksToJSON,
  exportProjectToJSON,
  getPriorityName,
} from '../../lib/importExport'

// =============================================================================
// Input Schemas
// =============================================================================

const exportTasksSchema = z.object({
  projectId: z.number(),
  format: z.enum(['csv', 'json', 'trello']).default('csv'),
  includeClosedTasks: z.boolean().default(false),
  columnIds: z.array(z.number()).optional(), // Filter by columns
  tagIds: z.array(z.number()).optional(), // Filter by tags
  assigneeIds: z.array(z.number()).optional(), // Filter by assignees
})

const exportProjectSchema = z.object({
  projectId: z.number(),
  format: z.enum(['json']).default('json'), // Full project only in JSON
  includeClosedTasks: z.boolean().default(false),
})

// =============================================================================
// Export Router
// =============================================================================

export const exportRouter = router({
  /**
   * Export tasks from a project
   * Returns data in requested format (CSV, JSON, or Trello-compatible)
   */
  tasks: protectedProcedure
    .input(exportTasksSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      // Build filter conditions
      const where: Record<string, unknown> = {
        projectId: input.projectId,
      }

      if (!input.includeClosedTasks) {
        where.isActive = true
      }

      if (input.columnIds && input.columnIds.length > 0) {
        where.columnId = { in: input.columnIds }
      }

      if (input.tagIds && input.tagIds.length > 0) {
        where.tags = { some: { tagId: { in: input.tagIds } } }
      }

      if (input.assigneeIds && input.assigneeIds.length > 0) {
        where.assignees = { some: { userId: { in: input.assigneeIds } } }
      }

      // Fetch tasks with relations
      const tasks = await ctx.prisma.task.findMany({
        where,
        include: {
          column: { select: { id: true, title: true } },
          swimlane: { select: { id: true, name: true } },
          tags: { include: { tag: { select: { name: true } } } },
          assignees: { include: { user: { select: { username: true, name: true } } } },
          category: { select: { name: true } },
          milestone: { select: { name: true } },
          sprint: { select: { name: true } },
          module: { select: { name: true } },
        },
        orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
      })

      // Get project info
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, name: true },
      })

      // Transform to export format
      const exportData: TaskExportData[] = tasks.map((task) => ({
        id: task.id,
        reference: task.reference,
        title: task.title,
        description: task.description,
        priority: task.priority,
        priorityName: getPriorityName(task.priority),
        isActive: task.isActive,
        status: task.isActive ? 'open' : 'closed',
        column: task.column.title,
        columnId: task.column.id,
        swimlane: task.swimlane?.name ?? null,
        swimlaneId: task.swimlane?.id ?? null,
        dateDue: task.dateDue?.toISOString() ?? null,
        dateStarted: task.dateStarted?.toISOString() ?? null,
        dateCompleted: task.dateCompleted?.toISOString() ?? null,
        timeEstimated: task.timeEstimated,
        timeSpent: task.timeSpent,
        progress: task.progress,
        score: task.score,
        tags: task.tags.map((t) => t.tag.name),
        assignees: task.assignees.map((a) => a.user.name || a.user.username),
        category: task.category?.name ?? null,
        milestone: task.milestone?.name ?? null,
        sprint: task.sprint?.name ?? null,
        module: task.module?.name ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }))

      // Generate output based on format
      let content: string
      let filename: string
      let mimeType: string

      switch (input.format) {
        case 'csv':
          content = exportTasksToCSV(exportData)
          filename = `${project?.name ?? 'tasks'}-export.csv`
          mimeType = 'text/csv'
          break

        case 'trello':
          content = exportTasksToTrelloCSV(exportData)
          filename = `${project?.name ?? 'tasks'}-trello-export.csv`
          mimeType = 'text/csv'
          break

        case 'json':
        default:
          content = exportTasksToJSON(exportData, project?.id, project?.name ?? undefined)
          filename = `${project?.name ?? 'tasks'}-export.json`
          mimeType = 'application/json'
          break
      }

      return {
        content,
        filename,
        mimeType,
        taskCount: exportData.length,
        format: input.format,
      }
    }),

  /**
   * Export entire project with structure
   * Includes columns, swimlanes, tags, categories, and all tasks
   */
  project: protectedProcedure
    .input(exportProjectSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      // Fetch project with all structure
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          columns: {
            select: { id: true, title: true, position: true },
            orderBy: { position: 'asc' },
          },
          swimlanes: {
            select: { id: true, name: true, position: true },
            orderBy: { position: 'asc' },
          },
          tags: {
            select: { id: true, name: true, color: true },
          },
          categories: {
            select: { id: true, name: true, color: true },
          },
          _count: {
            select: { tasks: true },
          },
        },
      })

      if (!project) {
        throw new Error('Project not found')
      }

      // Get member count from ACL entries
      const memberCount = await ctx.prisma.aclEntry.count({
        where: {
          resourceType: 'project',
          resourceId: input.projectId,
          principalType: 'user',
          deny: false,
        },
      })

      // Fetch tasks
      const tasks = await ctx.prisma.task.findMany({
        where: {
          projectId: input.projectId,
          ...(input.includeClosedTasks ? {} : { isActive: true }),
        },
        include: {
          column: { select: { id: true, title: true } },
          swimlane: { select: { id: true, name: true } },
          tags: { include: { tag: { select: { name: true } } } },
          assignees: { include: { user: { select: { username: true, name: true } } } },
          category: { select: { name: true } },
          milestone: { select: { name: true } },
          sprint: { select: { name: true } },
          module: { select: { name: true } },
        },
        orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
      })

      // Transform project data
      const projectData: ProjectExportData = {
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        description: project.description,
        startDate: project.startDate?.toISOString() ?? null,
        endDate: project.endDate?.toISOString() ?? null,
        isActive: project.isActive,
        isPublic: project.isPublic,
        columns: project.columns.map((c: { title: string }) => c.title),
        swimlanes: project.swimlanes.map((s: { name: string }) => s.name),
        tags: project.tags.map((t: { name: string }) => t.name),
        categories: project.categories.map((c: { name: string }) => c.name),
        taskCount: project._count.tasks,
        memberCount,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      }

      // Transform tasks
      const taskData: TaskExportData[] = tasks.map((task) => ({
        id: task.id,
        reference: task.reference,
        title: task.title,
        description: task.description,
        priority: task.priority,
        priorityName: getPriorityName(task.priority),
        isActive: task.isActive,
        status: task.isActive ? 'open' : 'closed',
        column: task.column.title,
        columnId: task.column.id,
        swimlane: task.swimlane?.name ?? null,
        swimlaneId: task.swimlane?.id ?? null,
        dateDue: task.dateDue?.toISOString() ?? null,
        dateStarted: task.dateStarted?.toISOString() ?? null,
        dateCompleted: task.dateCompleted?.toISOString() ?? null,
        timeEstimated: task.timeEstimated,
        timeSpent: task.timeSpent,
        progress: task.progress,
        score: task.score,
        tags: task.tags.map((t) => t.tag.name),
        assignees: task.assignees.map((a) => a.user.name || a.user.username),
        category: task.category?.name ?? null,
        milestone: task.milestone?.name ?? null,
        sprint: task.sprint?.name ?? null,
        module: task.module?.name ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }))

      // Generate JSON export
      const content = exportProjectToJSON(
        projectData,
        taskData,
        project.columns,
        project.swimlanes,
        project.tags,
        project.categories
      )

      return {
        content,
        filename: `${project.name}-full-export.json`,
        mimeType: 'application/json',
        taskCount: taskData.length,
        format: 'json' as ExportFormat,
      }
    }),

  /**
   * Get available export formats
   * Informational endpoint for UI
   */
  formats: protectedProcedure.query(() => {
    return [
      {
        id: 'csv',
        name: 'CSV',
        description: 'Comma-separated values, compatible with Excel and Google Sheets',
        extension: '.csv',
        mimeType: 'text/csv',
      },
      {
        id: 'json',
        name: 'JSON',
        description: 'Full data export with all fields, ideal for backup or migration',
        extension: '.json',
        mimeType: 'application/json',
      },
      {
        id: 'trello',
        name: 'Trello CSV',
        description: 'CSV format compatible with Trello import',
        extension: '.csv',
        mimeType: 'text/csv',
      },
    ]
  }),
})
