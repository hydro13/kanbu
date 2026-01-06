"use strict";
/*
 * Webhook Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for webhook management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:09 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const webhookService_1 = require("../../lib/webhookService");
// =============================================================================
// Helper: Check project access
// =============================================================================
async function requireProjectAccess(prisma, userId, projectId, requiredRole = 'MEMBER') {
    const member = await prisma.projectMember.findFirst({
        where: { projectId, userId },
    });
    if (!member) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
        });
    }
    const roleHierarchy = ['VIEWER', 'MEMBER', 'MANAGER', 'OWNER'];
    const userLevel = roleHierarchy.indexOf(member.role);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    if (userLevel < requiredLevel) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: `This action requires ${requiredRole} role or higher`,
        });
    }
    return member;
}
// =============================================================================
// Input Schemas
// =============================================================================
const projectIdSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
});
const webhookIdSchema = zod_1.z.object({
    webhookId: zod_1.z.number(),
});
const createWebhookSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255),
    url: zod_1.z.string().url().max(500),
    events: zod_1.z.array(zod_1.z.string()).min(1),
});
const updateWebhookSchema = zod_1.z.object({
    webhookId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255).optional(),
    url: zod_1.z.string().url().max(500).optional(),
    events: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
const getDeliveriesSchema = zod_1.z.object({
    webhookId: zod_1.z.number(),
    limit: zod_1.z.number().min(1).max(100).default(20),
});
// =============================================================================
// Webhook Router
// =============================================================================
exports.webhookRouter = (0, router_1.router)({
    /**
     * List webhooks for a project
     */
    list: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        await requireProjectAccess(ctx.prisma, ctx.user.id, input.projectId);
        const webhooks = await ctx.prisma.webhook.findMany({
            where: { projectId: input.projectId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                url: true,
                events: true,
                isActive: true,
                lastSuccess: true,
                lastFailure: true,
                failureCount: true,
                createdAt: true,
            },
        });
        return webhooks.map((w) => ({
            ...w,
            events: w.events,
            status: getWebhookStatus(w),
        }));
    }),
    /**
     * Get a single webhook with details
     */
    get: router_1.protectedProcedure
        .input(webhookIdSchema)
        .query(async ({ ctx, input }) => {
        const webhook = await ctx.prisma.webhook.findUnique({
            where: { id: input.webhookId },
            include: {
                project: { select: { id: true, name: true } },
            },
        });
        if (!webhook) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Webhook not found',
            });
        }
        await requireProjectAccess(ctx.prisma, ctx.user.id, webhook.projectId);
        return {
            ...webhook,
            events: webhook.events,
            status: getWebhookStatus(webhook),
            // Don't expose the full secret, just indicate it exists
            hasSecret: !!webhook.secret,
        };
    }),
    /**
     * Create a new webhook
     */
    create: router_1.protectedProcedure
        .input(createWebhookSchema)
        .mutation(async ({ ctx, input }) => {
        await requireProjectAccess(ctx.prisma, ctx.user.id, input.projectId, 'MANAGER');
        // Validate events
        const validEvents = input.events.filter((e) => e === '*' || webhookService_1.WEBHOOK_EVENTS.includes(e));
        if (validEvents.length === 0) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'At least one valid event type is required',
            });
        }
        const secret = (0, webhookService_1.generateWebhookSecret)();
        const webhook = await ctx.prisma.webhook.create({
            data: {
                projectId: input.projectId,
                name: input.name,
                url: input.url,
                secret,
                events: validEvents,
            },
            select: {
                id: true,
                name: true,
                url: true,
                events: true,
                isActive: true,
                createdAt: true,
            },
        });
        return {
            ...webhook,
            events: webhook.events,
            // Return secret ONCE on creation
            secret,
        };
    }),
    /**
     * Update a webhook
     */
    update: router_1.protectedProcedure
        .input(updateWebhookSchema)
        .mutation(async ({ ctx, input }) => {
        const webhook = await ctx.prisma.webhook.findUnique({
            where: { id: input.webhookId },
        });
        if (!webhook) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Webhook not found',
            });
        }
        await requireProjectAccess(ctx.prisma, ctx.user.id, webhook.projectId, 'MANAGER');
        // Validate events if provided
        let validEvents;
        if (input.events) {
            validEvents = input.events.filter((e) => e === '*' || webhookService_1.WEBHOOK_EVENTS.includes(e));
            if (validEvents.length === 0) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'At least one valid event type is required',
                });
            }
        }
        const updated = await ctx.prisma.webhook.update({
            where: { id: input.webhookId },
            data: {
                ...(input.name && { name: input.name }),
                ...(input.url && { url: input.url }),
                ...(validEvents && { events: validEvents }),
                ...(input.isActive !== undefined && { isActive: input.isActive }),
            },
            select: {
                id: true,
                name: true,
                url: true,
                events: true,
                isActive: true,
                updatedAt: true,
            },
        });
        return {
            success: true,
            webhook: {
                ...updated,
                events: updated.events,
            },
        };
    }),
    /**
     * Delete a webhook
     */
    delete: router_1.protectedProcedure
        .input(webhookIdSchema)
        .mutation(async ({ ctx, input }) => {
        const webhook = await ctx.prisma.webhook.findUnique({
            where: { id: input.webhookId },
        });
        if (!webhook) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Webhook not found',
            });
        }
        await requireProjectAccess(ctx.prisma, ctx.user.id, webhook.projectId, 'MANAGER');
        await ctx.prisma.webhook.delete({
            where: { id: input.webhookId },
        });
        return { success: true };
    }),
    /**
     * Regenerate webhook secret
     */
    regenerateSecret: router_1.protectedProcedure
        .input(webhookIdSchema)
        .mutation(async ({ ctx, input }) => {
        const webhook = await ctx.prisma.webhook.findUnique({
            where: { id: input.webhookId },
        });
        if (!webhook) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Webhook not found',
            });
        }
        await requireProjectAccess(ctx.prisma, ctx.user.id, webhook.projectId, 'MANAGER');
        const newSecret = (0, webhookService_1.generateWebhookSecret)();
        await ctx.prisma.webhook.update({
            where: { id: input.webhookId },
            data: { secret: newSecret },
        });
        return { success: true, secret: newSecret };
    }),
    /**
     * Test a webhook
     */
    test: router_1.protectedProcedure
        .input(webhookIdSchema)
        .mutation(async ({ ctx, input }) => {
        const webhook = await ctx.prisma.webhook.findUnique({
            where: { id: input.webhookId },
        });
        if (!webhook) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Webhook not found',
            });
        }
        await requireProjectAccess(ctx.prisma, ctx.user.id, webhook.projectId);
        const result = await (0, webhookService_1.testWebhook)(ctx.prisma, input.webhookId);
        return result;
    }),
    /**
     * Get recent deliveries for a webhook
     */
    getDeliveries: router_1.protectedProcedure
        .input(getDeliveriesSchema)
        .query(async ({ ctx, input }) => {
        const webhook = await ctx.prisma.webhook.findUnique({
            where: { id: input.webhookId },
        });
        if (!webhook) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Webhook not found',
            });
        }
        await requireProjectAccess(ctx.prisma, ctx.user.id, webhook.projectId);
        const deliveries = await (0, webhookService_1.getRecentDeliveries)(ctx.prisma, input.webhookId, input.limit);
        return deliveries;
    }),
    /**
     * Get available event types
     */
    getEventTypes: router_1.protectedProcedure.query(() => {
        return webhookService_1.WEBHOOK_EVENTS.map((event) => ({
            value: event,
            label: formatEventLabel(event),
            category: event.split('.')[0] ?? 'other',
        }));
    }),
});
// =============================================================================
// Helper Functions
// =============================================================================
function getWebhookStatus(webhook) {
    if (!webhook.isActive)
        return 'disabled';
    if (webhook.failureCount >= 5)
        return 'failing';
    return 'active';
}
function formatEventLabel(event) {
    return event
        .split('.')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
//# sourceMappingURL=webhook.js.map