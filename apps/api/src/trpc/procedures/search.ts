/*
 * Search Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for full-text search across tasks, comments, and wiki pages.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const searchTasksSchema = z.object({
  projectId: z.number(),
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(50).default(20),
  includeCompleted: z.boolean().default(false),
})

const searchTasksInWorkspaceSchema = z.object({
  workspaceId: z.number(),
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(50).default(20),
  includeCompleted: z.boolean().default(false),
})

const globalSearchSchema = z.object({
  projectId: z.number(),
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(50).default(20),
  entityTypes: z.array(z.enum(['task', 'comment', 'wiki'])).default(['task', 'comment', 'wiki']),
})

// =============================================================================
// Search Router
// =============================================================================

export const searchRouter = router({
  /**
   * Full-text search over tasks in a project
   * Searches in title, reference, and description
   * Requires at least VIEWER access
   */
  tasks: protectedProcedure
    .input(searchTasksSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const tasks = await ctx.prisma.task.findMany({
        where: {
          projectId: input.projectId,
          ...(input.includeCompleted ? {} : { isActive: true }),
          OR: [
            { title: { contains: input.query, mode: 'insensitive' } },
            { reference: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          reference: true,
          priority: true,
          isActive: true,
          dateDue: true,
          column: {
            select: { id: true, title: true },
          },
          assignees: {
            select: {
              user: {
                select: { id: true, username: true, name: true, avatarUrl: true },
              },
            },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [
          { isActive: 'desc' }, // Active tasks first
          { updatedAt: 'desc' }, // Most recently updated first
        ],
        take: input.limit,
      })

      return tasks.map((t) => ({
        ...t,
        assignees: t.assignees.map((a) => a.user),
        tags: t.tags.map((tt) => tt.tag),
      }))
    }),

  /**
   * Full-text search over tasks across ALL projects in a workspace
   * Searches in title, reference, and description
   * Requires at least VIEWER access to the workspace
   * Used by workspace wiki for #task-ref autocomplete
   */
  tasksInWorkspace: protectedProcedure
    .input(searchTasksInWorkspaceSchema)
    .query(async ({ ctx, input }) => {
      // Check workspace access
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      // Get all projects the user has access to in this workspace
      const projects = await ctx.prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          isActive: true,
        },
        select: { id: true },
      })

      const projectIds = projects.map((p) => p.id)

      if (projectIds.length === 0) {
        return []
      }

      // Search tasks across all projects in the workspace
      const tasks = await ctx.prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          ...(input.includeCompleted ? {} : { isActive: true }),
          OR: [
            { title: { contains: input.query, mode: 'insensitive' } },
            { reference: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        include: {
          column: {
            select: { id: true, title: true },
          },
          project: {
            select: { id: true, name: true, identifier: true },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: input.limit,
      })

      // Map and sort results: reference starts with query first, then contains
      const queryUpper = input.query.toUpperCase()
      const results = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        reference: t.reference ?? '',
        priority: t.priority,
        isActive: t.isActive,
        column: t.column ? { title: t.column.title } : null,
        projectName: t.project.name,
      }))

      // Sort: reference starts with query > reference contains query > title match
      results.sort((a, b) => {
        const aRefStartsWith = a.reference.toUpperCase().startsWith(queryUpper)
        const bRefStartsWith = b.reference.toUpperCase().startsWith(queryUpper)
        const aRefContains = a.reference.toUpperCase().includes(queryUpper)
        const bRefContains = b.reference.toUpperCase().includes(queryUpper)

        // Priority: startsWith > contains > other
        if (aRefStartsWith && !bRefStartsWith) return -1
        if (!aRefStartsWith && bRefStartsWith) return 1
        if (aRefContains && !bRefContains) return -1
        if (!aRefContains && bRefContains) return 1

        // Same priority - sort by reference alphabetically
        return a.reference.localeCompare(b.reference)
      })

      return results
    }),

  /**
   * Global search across multiple entity types
   * Searches tasks, comments, and wiki pages
   * Requires at least VIEWER access
   */
  global: protectedProcedure
    .input(globalSearchSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const results: Array<{
        type: 'task' | 'comment' | 'wiki'
        id: number
        title: string
        snippet: string
        taskId?: number
        taskTitle?: string
        updatedAt: Date
      }> = []

      // Search tasks
      if (input.entityTypes.includes('task')) {
        const tasks = await ctx.prisma.task.findMany({
          where: {
            projectId: input.projectId,
            OR: [
              { title: { contains: input.query, mode: 'insensitive' } },
              { reference: { contains: input.query, mode: 'insensitive' } },
              { description: { contains: input.query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            reference: true,
            description: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
        })

        tasks.forEach((task) => {
          // Create snippet from description if it matches, otherwise use title
          let snippet = task.title
          if (task.description && task.description.toLowerCase().includes(input.query.toLowerCase())) {
            const idx = task.description.toLowerCase().indexOf(input.query.toLowerCase())
            const start = Math.max(0, idx - 50)
            const end = Math.min(task.description.length, idx + input.query.length + 50)
            snippet = (start > 0 ? '...' : '') + task.description.slice(start, end) + (end < task.description.length ? '...' : '')
          }

          results.push({
            type: 'task',
            id: task.id,
            title: task.reference ? `${task.reference}: ${task.title}` : task.title,
            snippet,
            updatedAt: task.updatedAt,
          })
        })
      }

      // Search comments
      if (input.entityTypes.includes('comment')) {
        const comments = await ctx.prisma.comment.findMany({
          where: {
            task: { projectId: input.projectId },
            content: { contains: input.query, mode: 'insensitive' },
          },
          select: {
            id: true,
            content: true,
            updatedAt: true,
            task: {
              select: { id: true, title: true, reference: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
        })

        comments.forEach((comment) => {
          // Create snippet from comment content
          const idx = comment.content.toLowerCase().indexOf(input.query.toLowerCase())
          const start = Math.max(0, idx - 50)
          const end = Math.min(comment.content.length, idx + input.query.length + 50)
          const snippet = (start > 0 ? '...' : '') + comment.content.slice(start, end) + (end < comment.content.length ? '...' : '')

          results.push({
            type: 'comment',
            id: comment.id,
            title: `Comment on ${comment.task.reference || comment.task.title}`,
            snippet,
            taskId: comment.task.id,
            taskTitle: comment.task.title,
            updatedAt: comment.updatedAt,
          })
        })
      }

      // Search wiki pages
      if (input.entityTypes.includes('wiki')) {
        const wikiPages = await ctx.prisma.wikiPage.findMany({
          where: {
            projectId: input.projectId,
            OR: [
              { title: { contains: input.query, mode: 'insensitive' } },
              { content: { contains: input.query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            content: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
        })

        wikiPages.forEach((page) => {
          // Create snippet from content if it matches
          let snippet = page.title
          if (page.content.toLowerCase().includes(input.query.toLowerCase())) {
            const idx = page.content.toLowerCase().indexOf(input.query.toLowerCase())
            const start = Math.max(0, idx - 50)
            const end = Math.min(page.content.length, idx + input.query.length + 50)
            snippet = (start > 0 ? '...' : '') + page.content.slice(start, end) + (end < page.content.length ? '...' : '')
          }

          results.push({
            type: 'wiki',
            id: page.id,
            title: page.title,
            snippet,
            updatedAt: page.updatedAt,
          })
        })
      }

      // Sort all results by updatedAt
      results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      // Return limited results
      return results.slice(0, input.limit)
    }),
})
