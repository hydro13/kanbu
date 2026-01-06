"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const zod_1 = require("zod");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
// =============================================================================
// Input Schemas
// =============================================================================
const searchTasksSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    query: zod_1.z.string().min(1).max(200),
    limit: zod_1.z.number().min(1).max(50).default(20),
    includeCompleted: zod_1.z.boolean().default(false),
});
const globalSearchSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    query: zod_1.z.string().min(1).max(200),
    limit: zod_1.z.number().min(1).max(50).default(20),
    entityTypes: zod_1.z.array(zod_1.z.enum(['task', 'comment', 'wiki'])).default(['task', 'comment', 'wiki']),
});
// =============================================================================
// Search Router
// =============================================================================
exports.searchRouter = (0, router_1.router)({
    /**
     * Full-text search over tasks in a project
     * Searches in title, reference, and description
     * Requires at least VIEWER access
     */
    tasks: router_1.protectedProcedure
        .input(searchTasksSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
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
        });
        return tasks.map((t) => ({
            ...t,
            assignees: t.assignees.map((a) => a.user),
            tags: t.tags.map((tt) => tt.tag),
        }));
    }),
    /**
     * Global search across multiple entity types
     * Searches tasks, comments, and wiki pages
     * Requires at least VIEWER access
     */
    global: router_1.protectedProcedure
        .input(globalSearchSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const results = [];
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
            });
            tasks.forEach((task) => {
                // Create snippet from description if it matches, otherwise use title
                let snippet = task.title;
                if (task.description && task.description.toLowerCase().includes(input.query.toLowerCase())) {
                    const idx = task.description.toLowerCase().indexOf(input.query.toLowerCase());
                    const start = Math.max(0, idx - 50);
                    const end = Math.min(task.description.length, idx + input.query.length + 50);
                    snippet = (start > 0 ? '...' : '') + task.description.slice(start, end) + (end < task.description.length ? '...' : '');
                }
                results.push({
                    type: 'task',
                    id: task.id,
                    title: task.reference ? `${task.reference}: ${task.title}` : task.title,
                    snippet,
                    updatedAt: task.updatedAt,
                });
            });
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
            });
            comments.forEach((comment) => {
                // Create snippet from comment content
                const idx = comment.content.toLowerCase().indexOf(input.query.toLowerCase());
                const start = Math.max(0, idx - 50);
                const end = Math.min(comment.content.length, idx + input.query.length + 50);
                const snippet = (start > 0 ? '...' : '') + comment.content.slice(start, end) + (end < comment.content.length ? '...' : '');
                results.push({
                    type: 'comment',
                    id: comment.id,
                    title: `Comment on ${comment.task.reference || comment.task.title}`,
                    snippet,
                    taskId: comment.task.id,
                    taskTitle: comment.task.title,
                    updatedAt: comment.updatedAt,
                });
            });
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
            });
            wikiPages.forEach((page) => {
                // Create snippet from content if it matches
                let snippet = page.title;
                if (page.content.toLowerCase().includes(input.query.toLowerCase())) {
                    const idx = page.content.toLowerCase().indexOf(input.query.toLowerCase());
                    const start = Math.max(0, idx - 50);
                    const end = Math.min(page.content.length, idx + input.query.length + 50);
                    snippet = (start > 0 ? '...' : '') + page.content.slice(start, end) + (end < page.content.length ? '...' : '');
                }
                results.push({
                    type: 'wiki',
                    id: page.id,
                    title: page.title,
                    snippet,
                    updatedAt: page.updatedAt,
                });
            });
        }
        // Sort all results by updatedAt
        results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        // Return limited results
        return results.slice(0, input.limit);
    }),
});
//# sourceMappingURL=search.js.map