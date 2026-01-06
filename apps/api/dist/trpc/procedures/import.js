"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
const importExport_1 = require("../../lib/importExport");
// =============================================================================
// Input Schemas
// =============================================================================
const fieldMappingSchema = zod_1.z.object({
    sourceField: zod_1.z.string(),
    targetField: zod_1.z.string(),
    transform: zod_1.z
        .object({
        type: zod_1.z.enum(['direct', 'date', 'priority', 'list', 'boolean', 'number', 'status']),
        mapping: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number()])).optional(),
        separator: zod_1.z.string().optional(),
        trueValues: zod_1.z.array(zod_1.z.string()).optional(),
        format: zod_1.z.string().optional(),
    })
        .optional(),
    required: zod_1.z.boolean().optional(),
});
const previewSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    content: zod_1.z.string().min(1, 'File content is required'),
    fileType: zod_1.z.enum(['csv', 'json']).default('csv'),
    source: zod_1.z
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
    previewLimit: zod_1.z.number().min(1).max(500).default(100),
});
const executeSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    content: zod_1.z.string().min(1, 'File content is required'),
    fileType: zod_1.z.enum(['csv', 'json']).default('csv'),
    source: zod_1.z
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
    fieldMappings: zod_1.z.array(fieldMappingSchema),
    options: zod_1.z
        .object({
        skipDuplicates: zod_1.z.boolean().default(true),
        createMissingColumns: zod_1.z.boolean().default(true),
        createMissingTags: zod_1.z.boolean().default(true),
        defaultColumn: zod_1.z.string().optional(),
        batchSize: zod_1.z.number().min(1).max(100).default(50),
    })
        .optional()
        .transform((opts) => ({
        skipDuplicates: opts?.skipDuplicates ?? true,
        createMissingColumns: opts?.createMissingColumns ?? true,
        createMissingTags: opts?.createMissingTags ?? true,
        defaultColumn: opts?.defaultColumn,
        batchSize: opts?.batchSize ?? 50,
    })),
});
// =============================================================================
// Import Source Information
// =============================================================================
const IMPORT_SOURCE_INFO = {
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
        example: 'Card Name,Card Description,List Name,Labels,Due Date\nTask 1,Description,To Do,feature,2025-01-15',
    },
    asana: {
        name: 'Asana',
        description: 'Import from Asana export (CSV)',
        fileTypes: ['csv'],
        example: 'Name,Section/Column,Assignee,Due Date,Tags\nTask 1,To Do,john@example.com,2025-01-15,feature',
    },
    jira: {
        name: 'Jira',
        description: 'Import from Jira export (CSV)',
        fileTypes: ['csv'],
        example: 'Summary,Issue key,Status,Assignee,Priority,Due date\nTask 1,PROJ-123,To Do,John,High,2025-01-15',
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
        example: 'Name,Status,Assignee,Due,Tags,Created time\nTask 1,To Do,John,2025-01-15,feature,2025-01-01',
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
        example: 'Task Name,Task Content,List,Status,Assignees,Due Date\nTask 1,Description,Backlog,Open,John,2025-01-15',
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
        example: 'Title,Description,Status,Assignees,Due Date,Priority\nTask 1,Description,Active,John,2025-01-15,High',
    },
    kanboard: {
        name: 'Kanboard',
        description: 'Import from Kanboard export (legacy GENX-Planner)',
        fileTypes: ['csv', 'json'],
        example: 'id,title,description,column_id,priority,date_due\n1,Task 1,Description,1,2,1705276800',
    },
};
// =============================================================================
// Import Router
// =============================================================================
exports.importRouter = (0, router_1.router)({
    /**
     * Preview import - parse file and return field mappings and sample data
     * Use this to show users what will be imported before executing
     */
    preview: router_1.protectedProcedure.input(previewSchema).mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'OWNER');
        try {
            if (input.fileType === 'csv') {
                // Parse CSV
                const parseResult = (0, importExport_1.parseCSV)(input.content);
                if (!parseResult.success && parseResult.errors.some((e) => e.type === 'error')) {
                    throw new server_1.TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Failed to parse CSV: ${parseResult.errors.map((e) => e.message).join(', ')}`,
                    });
                }
                // Generate preview with auto-detection
                const preview = (0, importExport_1.generatePreview)(parseResult, input.source, undefined, input.previewLimit);
                // Get project columns for mapping suggestions
                const columns = await ctx.prisma.column.findMany({
                    where: { projectId: input.projectId },
                    select: { id: true, title: true },
                    orderBy: { position: 'asc' },
                });
                // Get project tags
                const tags = await ctx.prisma.tag.findMany({
                    where: { projectId: input.projectId },
                    select: { id: true, name: true },
                });
                return {
                    ...preview,
                    projectColumns: columns,
                    projectTags: tags,
                    sourceInfo: IMPORT_SOURCE_INFO[input.source === 'generic' ? preview.detectedSource ?? 'generic' : input.source],
                };
            }
            else {
                // Parse JSON
                let json;
                try {
                    json = JSON.parse(input.content);
                }
                catch {
                    throw new server_1.TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Invalid JSON format',
                    });
                }
                const validation = (0, importExport_1.validateJSONImport)(json);
                if (!validation.valid) {
                    throw new server_1.TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Invalid JSON structure: ${validation.errors.map((e) => e.message).join(', ')}`,
                    });
                }
                // Extract tasks from JSON
                const obj = json;
                let tasks;
                if (Array.isArray(json)) {
                    tasks = json;
                }
                else if (obj.data && typeof obj.data === 'object') {
                    const data = obj.data;
                    tasks = (data.tasks ?? []);
                }
                else {
                    tasks = [];
                }
                // Generate preview rows for JSON
                const previewRows = tasks.slice(0, input.previewLimit).map((task, i) => ({
                    rowNumber: i + 1,
                    original: Object.fromEntries(Object.entries(task).map(([k, v]) => [k, String(v ?? '')])),
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
                }));
                // Get headers from first task
                const firstTask = tasks[0];
                const headers = firstTask ? Object.keys(firstTask) : [];
                return {
                    source: input.source,
                    detectedSource: 'kanboard',
                    headers,
                    fieldMappings: (0, importExport_1.getFieldMappings)('kanboard'),
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
                };
            }
        }
        catch (e) {
            if (e instanceof server_1.TRPCError)
                throw e;
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to preview import: ${e instanceof Error ? e.message : String(e)}`,
            });
        }
    }),
    /**
     * Execute import - create tasks based on confirmed mappings
     */
    execute: router_1.protectedProcedure.input(executeSchema).mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'OWNER');
        // Parse file
        let rows;
        if (input.fileType === 'csv') {
            const parseResult = (0, importExport_1.parseCSV)(input.content);
            if (!parseResult.success) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Failed to parse CSV',
                });
            }
            rows = parseResult.rows;
        }
        else {
            // JSON parsing
            let json;
            try {
                json = JSON.parse(input.content);
            }
            catch {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid JSON',
                });
            }
            const obj = json;
            if (Array.isArray(json)) {
                rows = json.map((item) => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v ?? '')])));
            }
            else if (obj.data && typeof obj.data === 'object') {
                const data = obj.data;
                rows = (data.tasks ?? []).map((item) => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v ?? '')])));
            }
            else {
                rows = [];
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
        ]);
        // Default to first column if not specified
        const defaultColumn = columns.find((c) => c.title === input.options.defaultColumn) ?? columns[0];
        if (!defaultColumn) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Project has no columns. Create at least one column before importing.',
            });
        }
        // Track created items for deduplication
        const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase()));
        const existingRefs = new Set(existingTasks.filter((t) => t.reference).map((t) => t.reference));
        const columnMap = new Map(columns.map((c) => [c.title.toLowerCase(), c.id]));
        const tagMap = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]));
        // Convert fieldMappings from input
        const mappings = input.fieldMappings.map((m) => ({
            sourceField: m.sourceField,
            targetField: m.targetField,
            required: m.required,
            transform: m.transform
                ? {
                    type: m.transform.type,
                    ...(m.transform.mapping && { mapping: m.transform.mapping }),
                    ...(m.transform.separator && { separator: m.transform.separator }),
                    ...(m.transform.trueValues && { trueValues: m.transform.trueValues }),
                    ...(m.transform.format && { format: m.transform.format }),
                }
                : undefined,
        }));
        // Process rows in batches
        const result = {
            success: true,
            imported: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            createdIds: [],
        };
        // Get max position for new tasks
        const maxPosition = await ctx.prisma.task.aggregate({
            where: { projectId: input.projectId, columnId: defaultColumn.id },
            _max: { position: true },
        });
        let nextPosition = (maxPosition._max.position ?? 0) + 1;
        // Process each row
        const { results, errors } = await (0, importExport_1.processBatch)(rows, input.options.batchSize, async (row, index) => {
            // Transform row using mappings
            const transformedRow = (0, importExport_1.transformRow)(row, mappings, index + 2);
            if (!transformedRow.willImport) {
                result.skipped++;
                return null;
            }
            const mapped = transformedRow.mapped;
            const title = String(mapped.title ?? '');
            const reference = mapped.reference ? String(mapped.reference) : null;
            // Check for duplicates
            if (input.options.skipDuplicates) {
                if (existingTitles.has(title.toLowerCase())) {
                    result.skipped++;
                    return null;
                }
                if (reference && existingRefs.has(reference)) {
                    result.skipped++;
                    return null;
                }
            }
            // Resolve column
            let columnId = defaultColumn.id;
            const columnName = mapped.column ? String(mapped.column).toLowerCase() : null;
            if (columnName && columnMap.has(columnName)) {
                columnId = columnMap.get(columnName);
            }
            else if (columnName && input.options.createMissingColumns) {
                // Create new column
                const newColumn = await ctx.prisma.column.create({
                    data: {
                        projectId: input.projectId,
                        title: String(mapped.column),
                        position: columns.length,
                    },
                });
                columnMap.set(columnName, newColumn.id);
                columnId = newColumn.id;
            }
            // Resolve tags
            const taskTags = mapped.tags;
            const tagIds = [];
            if (taskTags && Array.isArray(taskTags)) {
                for (const tagName of taskTags) {
                    const normalized = tagName.toLowerCase();
                    if (tagMap.has(normalized)) {
                        tagIds.push(tagMap.get(normalized));
                    }
                    else if (input.options.createMissingTags) {
                        const newTag = await ctx.prisma.tag.create({
                            data: {
                                projectId: input.projectId,
                                name: tagName,
                                color: 'grey',
                            },
                        });
                        tagMap.set(normalized, newTag.id);
                        tagIds.push(newTag.id);
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
                    timeEstimated: typeof mapped.timeEstimated === 'number' ? mapped.timeEstimated : 0,
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
            });
            existingTitles.add(title.toLowerCase());
            if (reference)
                existingRefs.add(reference);
            return task.id;
        });
        // Collect results
        for (const id of results) {
            if (id !== null) {
                result.imported++;
                result.createdIds.push(id);
            }
        }
        for (const error of errors) {
            result.failed++;
            result.errors.push({ row: error.index + 2, error: error.error });
        }
        result.success = result.failed === 0;
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
        });
        return result;
    }),
    /**
     * Get available import sources
     */
    sources: router_1.protectedProcedure.query(() => {
        return Object.entries(IMPORT_SOURCE_INFO).map(([id, info]) => ({
            id: id,
            ...info,
            fieldMappings: (0, importExport_1.getFieldMappings)(id).map((m) => ({
                sourceField: m.sourceField,
                targetField: m.targetField,
                required: m.required ?? false,
            })),
        }));
    }),
    /**
     * Get field mappings for a specific source
     */
    getMappings: router_1.protectedProcedure
        .input(zod_1.z.object({
        source: zod_1.z.enum([
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
    }))
        .query(({ input }) => {
        return (0, importExport_1.getFieldMappings)(input.source).map((m) => ({
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
        }));
    }),
    /**
     * Validate file content before import
     */
    validate: router_1.protectedProcedure
        .input(zod_1.z.object({
        content: zod_1.z.string().min(1),
        fileType: zod_1.z.enum(['csv', 'json']),
    }))
        .mutation(async ({ input }) => {
        if (input.fileType === 'csv') {
            const parseResult = (0, importExport_1.parseCSV)(input.content);
            const detectedSource = (0, importExport_1.detectImportSource)(parseResult.headers);
            return {
                valid: parseResult.success,
                fileType: 'csv',
                detectedSource,
                headers: parseResult.headers,
                rowCount: parseResult.meta.parsedRows,
                errors: parseResult.errors,
            };
        }
        else {
            let json;
            try {
                json = JSON.parse(input.content);
            }
            catch (e) {
                return {
                    valid: false,
                    fileType: 'json',
                    errors: [{ message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, type: 'error' }],
                };
            }
            const validation = (0, importExport_1.validateJSONImport)(json);
            // Count tasks
            let taskCount = 0;
            if (Array.isArray(json)) {
                taskCount = json.length;
            }
            else {
                const obj = json;
                if (obj.data && typeof obj.data === 'object') {
                    const data = obj.data;
                    taskCount = data.tasks?.length ?? 0;
                }
            }
            return {
                valid: validation.valid,
                fileType: 'json',
                detectedSource: 'kanboard',
                taskCount,
                errors: validation.errors,
                warnings: validation.warnings,
            };
        }
    }),
});
//# sourceMappingURL=import.js.map