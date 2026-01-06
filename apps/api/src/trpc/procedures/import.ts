/*
 * Import Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for importing tasks from external sources.
 * Supports CSV and JSON with auto-detection of source format.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:58 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import {
  type ImportSource,
  type FieldMapping,
  type ImportResult,
  parseCSV,
  detectImportSource,
  generatePreview,
  transformRow,
  getFieldMappings,
  validateJSONImport,
  processBatch,
} from '../../lib/importExport'

// =============================================================================
// Input Schemas
// =============================================================================

const fieldMappingSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  transform: z
    .object({
      type: z.enum(['direct', 'date', 'priority', 'list', 'boolean', 'number', 'status']),
      mapping: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      separator: z.string().optional(),
      trueValues: z.array(z.string()).optional(),
      format: z.string().optional(),
    })
    .optional(),
  required: z.boolean().optional(),
})

const previewSchema = z.object({
  projectId: z.number(),
  content: z.string().min(1, 'File content is required'),
  fileType: z.enum(['csv', 'json']).default('csv'),
  source: z
    .enum([
      'generic',
      'trello',
      'asana',
      'jira',
      'todoist',
      'notion',
      'monday',
      'clickup',
      'basecamp',
      'wrike',
      'kanboard',
    ])
    .default('generic'),
  previewLimit: z.number().min(1).max(500).default(100),
})

const executeSchema = z.object({
  projectId: z.number(),
  content: z.string().min(1, 'File content is required'),
  fileType: z.enum(['csv', 'json']).default('csv'),
  source: z
    .enum([
      'generic',
      'trello',
      'asana',
      'jira',
      'todoist',
      'notion',
      'monday',
      'clickup',
      'basecamp',
      'wrike',
      'kanboard',
    ])
    .default('generic'),
  fieldMappings: z.array(fieldMappingSchema),
  options: z
    .object({
      skipDuplicates: z.boolean().default(true),
      createMissingColumns: z.boolean().default(true),
      createMissingTags: z.boolean().default(true),
      defaultColumn: z.string().optional(),
      batchSize: z.number().min(1).max(100).default(50),
    })
    .optional()
    .transform((opts) => ({
      skipDuplicates: opts?.skipDuplicates ?? true,
      createMissingColumns: opts?.createMissingColumns ?? true,
      createMissingTags: opts?.createMissingTags ?? true,
      defaultColumn: opts?.defaultColumn,
      batchSize: opts?.batchSize ?? 50,
    })),
})

// =============================================================================
// Import Source Information
// =============================================================================

const IMPORT_SOURCE_INFO: Record<
  ImportSource,
  { name: string; description: string; fileTypes: string[]; example: string }
> = {
  generic: {
    name: 'Generic CSV/JSON',
    description: 'Import from any CSV or JSON file with custom field mapping',
    fileTypes: ['csv', 'json'],
    example: 'title,description,priority,due_date\nTask 1,Description,high,2025-01-15',
  },
  trello: {
    name: 'Trello',
    description: 'Import from Trello export (CSV)',
    fileTypes: ['csv'],
    example:
      'Card Name,Card Description,List Name,Labels,Due Date\nTask 1,Description,To Do,feature,2025-01-15',
  },
  asana: {
    name: 'Asana',
    description: 'Import from Asana export (CSV)',
    fileTypes: ['csv'],
    example:
      'Name,Section/Column,Assignee,Due Date,Tags\nTask 1,To Do,john@example.com,2025-01-15,feature',
  },
  jira: {
    name: 'Jira',
    description: 'Import from Jira export (CSV)',
    fileTypes: ['csv'],
    example:
      'Summary,Issue key,Status,Assignee,Priority,Due date\nTask 1,PROJ-123,To Do,John,High,2025-01-15',
  },
  todoist: {
    name: 'Todoist',
    description: 'Import from Todoist export (CSV)',
    fileTypes: ['csv'],
    example: 'TYPE,CONTENT,PRIORITY,DATE,LABELS\ntask,Task 1,1,2025-01-15,feature',
  },
  notion: {
    name: 'Notion',
    description: 'Import from Notion database export (CSV)',
    fileTypes: ['csv'],
    example:
      'Name,Status,Assignee,Due,Tags,Created time\nTask 1,To Do,John,2025-01-15,feature,2025-01-01',
  },
  monday: {
    name: 'Monday.com',
    description: 'Import from Monday.com export (CSV)',
    fileTypes: ['csv'],
    example: 'Name,Group,Status,Owner,Date,Priority\nTask 1,Sprint 1,Done,John,2025-01-15,High',
  },
  clickup: {
    name: 'ClickUp',
    description: 'Import from ClickUp export (CSV)',
    fileTypes: ['csv'],
    example:
      'Task Name,Task Content,List,Status,Assignees,Due Date\nTask 1,Description,Backlog,Open,John,2025-01-15',
  },
  basecamp: {
    name: 'Basecamp',
    description: 'Import from Basecamp export (CSV)',
    fileTypes: ['csv'],
    example: 'Title,Content,Assignees,Due on,Completed\nTask 1,Description,John,2025-01-15,false',
  },
  wrike: {
    name: 'Wrike',
    description: 'Import from Wrike export (CSV)',
    fileTypes: ['csv'],
    example:
      'Title,Description,Status,Assignees,Due Date,Priority\nTask 1,Description,Active,John,2025-01-15,High',
  },
  kanboard: {
    name: 'Kanboard',
    description: 'Import from Kanboard export (legacy GENX-Planner)',
    fileTypes: ['csv', 'json'],
    example:
      'id,title,description,column_id,priority,date_due\n1,Task 1,Description,1,2,1705276800',
  },
}

// =============================================================================
// Import Router
// =============================================================================

export const importRouter = router({
  /**
   * Preview import - parse file and return field mappings and sample data
   * Use this to show users what will be imported before executing
   */
  preview: protectedProcedure.input(previewSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'OWNER')

    try {
      if (input.fileType === 'csv') {
        // Parse CSV
        const parseResult = parseCSV(input.content)

        if (!parseResult.success && parseResult.errors.some((e) => e.type === 'error')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Failed to parse CSV: ${parseResult.errors.map((e) => e.message).join(', ')}`,
          })
        }

        // Generate preview with auto-detection
        const preview = generatePreview(parseResult, input.source, undefined, input.previewLimit)

        // Get project columns for mapping suggestions
        const columns = await ctx.prisma.column.findMany({
          where: { projectId: input.projectId },
          select: { id: true, title: true },
          orderBy: { position: 'asc' },
        })

        // Get project tags
        const tags = await ctx.prisma.tag.findMany({
          where: { projectId: input.projectId },
          select: { id: true, name: true },
        })

        return {
          ...preview,
          projectColumns: columns,
          projectTags: tags,
          sourceInfo: IMPORT_SOURCE_INFO[input.source === 'generic' ? preview.detectedSource ?? 'generic' : input.source],
        }
      } else {
        // Parse JSON
        let json: unknown
        try {
          json = JSON.parse(input.content)
        } catch {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid JSON format',
          })
        }

        const validation = validateJSONImport(json)
        if (!validation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid JSON structure: ${validation.errors.map((e) => e.message).join(', ')}`,
          })
        }

        // Extract tasks from JSON
        const obj = json as Record<string, unknown>
        let tasks: Record<string, unknown>[]

        if (Array.isArray(json)) {
          tasks = json
        } else if (obj.data && typeof obj.data === 'object') {
          const data = obj.data as Record<string, unknown>
          tasks = (data.tasks ?? []) as Record<string, unknown>[]
        } else {
          tasks = []
        }

        // Generate preview rows for JSON
        const previewRows = tasks.slice(0, input.previewLimit).map((task, i) => ({
          rowNumber: i + 1,
          original: Object.fromEntries(
            Object.entries(task).map(([k, v]) => [k, String(v ?? '')])
          ),
          mapped: {
            title: task.title ?? task.name ?? task.summary ?? '',
            description: task.description ?? task.notes ?? '',
            priority: task.priority ?? 0,
            column: task.column ?? task.status ?? task.list ?? '',
            tags: task.tags ?? task.labels ?? [],
            dateDue: task.dateDue ?? task.due_date ?? task.dueDate ?? null,
          },
          errors: [],
          warnings: [],
          willImport: true,
        }))

        // Get headers from first task
        const firstTask = tasks[0]
        const headers = firstTask ? Object.keys(firstTask) : []

        return {
          source: input.source,
          detectedSource: 'kanboard' as ImportSource,
          headers,
          fieldMappings: getFieldMappings('kanboard'),
          unmappedFields: [],
          suggestedMappings: [],
          rows: previewRows,
          summary: {
            totalRows: tasks.length,
            validRows: tasks.length,
            errorRows: 0,
            warningRows: 0,
          },
          projectColumns: await ctx.prisma.column.findMany({
            where: { projectId: input.projectId },
            select: { id: true, title: true },
            orderBy: { position: 'asc' },
          }),
          projectTags: await ctx.prisma.tag.findMany({
            where: { projectId: input.projectId },
            select: { id: true, name: true },
          }),
          sourceInfo: IMPORT_SOURCE_INFO[input.source],
        }
      }
    } catch (e) {
      if (e instanceof TRPCError) throw e
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to preview import: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }),

  /**
   * Execute import - create tasks based on confirmed mappings
   */
  execute: protectedProcedure.input(executeSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'OWNER')

    // Parse file
    let rows: Record<string, string>[]
    if (input.fileType === 'csv') {
      const parseResult = parseCSV(input.content)
      if (!parseResult.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to parse CSV',
        })
      }
      rows = parseResult.rows
    } else {
      // JSON parsing
      let json: unknown
      try {
        json = JSON.parse(input.content)
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid JSON',
        })
      }

      const obj = json as Record<string, unknown>
      if (Array.isArray(json)) {
        rows = json.map((item) =>
          Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v ?? '')]))
        )
      } else if (obj.data && typeof obj.data === 'object') {
        const data = obj.data as { tasks?: unknown[] }
        rows = (data.tasks ?? []).map((item: unknown) =>
          Object.fromEntries(
            Object.entries(item as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
          )
        )
      } else {
        rows = []
      }
    }

    // Get project structure
    const [columns, tags, existingTasks] = await Promise.all([
      ctx.prisma.column.findMany({
        where: { projectId: input.projectId },
        select: { id: true, title: true, position: true },
        orderBy: { position: 'asc' },
      }),
      ctx.prisma.tag.findMany({
        where: { projectId: input.projectId },
        select: { id: true, name: true },
      }),
      ctx.prisma.task.findMany({
        where: { projectId: input.projectId },
        select: { title: true, reference: true },
      }),
    ])

    // Default to first column if not specified
    const defaultColumn =
      columns.find((c) => c.title === input.options.defaultColumn) ?? columns[0]

    if (!defaultColumn) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Project has no columns. Create at least one column before importing.',
      })
    }

    // Track created items for deduplication
    const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase()))
    const existingRefs = new Set(existingTasks.filter((t) => t.reference).map((t) => t.reference!))
    const columnMap = new Map(columns.map((c) => [c.title.toLowerCase(), c.id]))
    const tagMap = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]))

    // Convert fieldMappings from input
    const mappings: FieldMapping[] = input.fieldMappings.map((m) => ({
      sourceField: m.sourceField,
      targetField: m.targetField,
      required: m.required,
      transform: m.transform
        ? ({
            type: m.transform.type,
            ...(m.transform.mapping && { mapping: m.transform.mapping }),
            ...(m.transform.separator && { separator: m.transform.separator }),
            ...(m.transform.trueValues && { trueValues: m.transform.trueValues }),
            ...(m.transform.format && { format: m.transform.format }),
          } as FieldMapping['transform'])
        : undefined,
    }))

    // Process rows in batches
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      createdIds: [],
    }

    // Get max position for new tasks
    const maxPosition = await ctx.prisma.task.aggregate({
      where: { projectId: input.projectId, columnId: defaultColumn.id },
      _max: { position: true },
    })
    let nextPosition = (maxPosition._max.position ?? 0) + 1

    // Process each row
    const { results, errors } = await processBatch(
      rows,
      input.options.batchSize,
      async (row, index) => {
        // Transform row using mappings
        const transformedRow = transformRow(row, mappings, index + 2)

        if (!transformedRow.willImport) {
          result.skipped++
          return null
        }

        const mapped = transformedRow.mapped as Record<string, unknown>
        const title = String(mapped.title ?? '')
        const reference = mapped.reference ? String(mapped.reference) : null

        // Check for duplicates
        if (input.options.skipDuplicates) {
          if (existingTitles.has(title.toLowerCase())) {
            result.skipped++
            return null
          }
          if (reference && existingRefs.has(reference)) {
            result.skipped++
            return null
          }
        }

        // Resolve column
        let columnId = defaultColumn.id
        const columnName = mapped.column ? String(mapped.column).toLowerCase() : null
        if (columnName && columnMap.has(columnName)) {
          columnId = columnMap.get(columnName)!
        } else if (columnName && input.options.createMissingColumns) {
          // Create new column
          const newColumn = await ctx.prisma.column.create({
            data: {
              projectId: input.projectId,
              title: String(mapped.column),
              position: columns.length,
            },
          })
          columnMap.set(columnName, newColumn.id)
          columnId = newColumn.id
        }

        // Resolve tags
        const taskTags = mapped.tags as string[] | undefined
        const tagIds: number[] = []
        if (taskTags && Array.isArray(taskTags)) {
          for (const tagName of taskTags) {
            const normalized = tagName.toLowerCase()
            if (tagMap.has(normalized)) {
              tagIds.push(tagMap.get(normalized)!)
            } else if (input.options.createMissingTags) {
              const newTag = await ctx.prisma.tag.create({
                data: {
                  projectId: input.projectId,
                  name: tagName,
                  color: 'grey',
                },
              })
              tagMap.set(normalized, newTag.id)
              tagIds.push(newTag.id)
            }
          }
        }

        // Create task
        const task = await ctx.prisma.task.create({
          data: {
            projectId: input.projectId,
            columnId,
            creatorId: ctx.user.id,
            title,
            description: mapped.description ? String(mapped.description) : null,
            priority: typeof mapped.priority === 'number' ? mapped.priority : 0,
            reference,
            position: nextPosition++,
            dateDue: mapped.dateDue ? new Date(String(mapped.dateDue)) : null,
            dateStarted: mapped.dateStarted ? new Date(String(mapped.dateStarted)) : null,
            timeEstimated:
              typeof mapped.timeEstimated === 'number' ? mapped.timeEstimated : 0,
            score: typeof mapped.score === 'number' ? mapped.score : 0,
            isActive: mapped.isActive !== false,
            ...(tagIds.length > 0 && {
              tags: {
                createMany: {
                  data: tagIds.map((tagId) => ({ tagId })),
                },
              },
            }),
          },
        })

        existingTitles.add(title.toLowerCase())
        if (reference) existingRefs.add(reference)

        return task.id
      }
    )

    // Collect results
    for (const id of results) {
      if (id !== null) {
        result.imported++
        result.createdIds.push(id)
      }
    }

    for (const error of errors) {
      result.failed++
      result.errors.push({ row: error.index + 2, error: error.error })
    }

    result.success = result.failed === 0

    // Log activity
    await ctx.prisma.activity.create({
      data: {
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: 'import_tasks',
        entityType: 'project',
        entityId: input.projectId,
        changes: {
          source: input.source,
          imported: result.imported,
          skipped: result.skipped,
          failed: result.failed,
        },
      },
    })

    return result
  }),

  /**
   * Get available import sources
   */
  sources: protectedProcedure.query(() => {
    return Object.entries(IMPORT_SOURCE_INFO).map(([id, info]) => ({
      id: id as ImportSource,
      ...info,
      fieldMappings: getFieldMappings(id as ImportSource).map((m) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        required: m.required ?? false,
      })),
    }))
  }),

  /**
   * Get field mappings for a specific source
   */
  getMappings: protectedProcedure
    .input(
      z.object({
        source: z.enum([
          'generic',
          'trello',
          'asana',
          'jira',
          'todoist',
          'notion',
          'monday',
          'clickup',
          'basecamp',
          'wrike',
          'kanboard',
        ]),
      })
    )
    .query(({ input }) => {
      return getFieldMappings(input.source).map((m) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        required: m.required ?? false,
        transform: m.transform
          ? {
              type: m.transform.type,
              ...(m.transform.type === 'priority' && { mapping: m.transform.mapping }),
              ...(m.transform.type === 'list' && { separator: m.transform.separator }),
              ...(m.transform.type === 'boolean' && { trueValues: m.transform.trueValues }),
            }
          : undefined,
      }))
    }),

  /**
   * Validate file content before import
   */
  validate: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        fileType: z.enum(['csv', 'json']),
      })
    )
    .mutation(async ({ input }) => {
      if (input.fileType === 'csv') {
        const parseResult = parseCSV(input.content)
        const detectedSource = detectImportSource(parseResult.headers)

        return {
          valid: parseResult.success,
          fileType: 'csv' as const,
          detectedSource,
          headers: parseResult.headers,
          rowCount: parseResult.meta.parsedRows,
          errors: parseResult.errors,
        }
      } else {
        let json: unknown
        try {
          json = JSON.parse(input.content)
        } catch (e) {
          return {
            valid: false,
            fileType: 'json' as const,
            errors: [{ message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, type: 'error' as const }],
          }
        }

        const validation = validateJSONImport(json)

        // Count tasks
        let taskCount = 0
        if (Array.isArray(json)) {
          taskCount = json.length
        } else {
          const obj = json as Record<string, unknown>
          if (obj.data && typeof obj.data === 'object') {
            const data = obj.data as { tasks?: unknown[] }
            taskCount = data.tasks?.length ?? 0
          }
        }

        return {
          valid: validation.valid,
          fileType: 'json' as const,
          detectedSource: 'kanboard' as ImportSource,
          taskCount,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }
    }),
})
