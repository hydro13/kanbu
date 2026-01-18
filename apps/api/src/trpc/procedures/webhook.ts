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

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';
import {
  generateWebhookSecret,
  testWebhook,
  getRecentDeliveries,
  WEBHOOK_EVENTS,
  type WebhookEventType,
} from '../../lib/webhookService';

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
});

const webhookIdSchema = z.object({
  webhookId: z.number(),
});

const createWebhookSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  url: z.string().url().max(500),
  events: z.array(z.string()).min(1),
});

const updateWebhookSchema = z.object({
  webhookId: z.number(),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(500).optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const getDeliveriesSchema = z.object({
  webhookId: z.number(),
  limit: z.number().min(1).max(100).default(20),
});

// =============================================================================
// Webhook Router
// =============================================================================

export const webhookRouter = router({
  /**
   * List webhooks for a project
   */
  list: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER');

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
      events: w.events as string[],
      status: getWebhookStatus(w),
    }));
  }),

  /**
   * Get a single webhook with details
   */
  get: protectedProcedure.input(webhookIdSchema).query(async ({ ctx, input }) => {
    const webhook = await ctx.prisma.webhook.findUnique({
      where: { id: input.webhookId },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!webhook) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, webhook.projectId, 'MEMBER');

    return {
      ...webhook,
      events: webhook.events as string[],
      status: getWebhookStatus(webhook),
      // Don't expose the full secret, just indicate it exists
      hasSecret: !!webhook.secret,
    };
  }),

  /**
   * Create a new webhook
   */
  create: protectedProcedure.input(createWebhookSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER');

    // Validate events
    const validEvents = input.events.filter(
      (e) => e === '*' || WEBHOOK_EVENTS.includes(e as WebhookEventType)
    );

    if (validEvents.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'At least one valid event type is required',
      });
    }

    const secret = generateWebhookSecret();

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
      events: webhook.events as string[],
      // Return secret ONCE on creation
      secret,
    };
  }),

  /**
   * Update a webhook
   */
  update: protectedProcedure.input(updateWebhookSchema).mutation(async ({ ctx, input }) => {
    const webhook = await ctx.prisma.webhook.findUnique({
      where: { id: input.webhookId },
    });

    if (!webhook) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, webhook.projectId, 'MANAGER');

    // Validate events if provided
    let validEvents: string[] | undefined;
    if (input.events) {
      validEvents = input.events.filter(
        (e) => e === '*' || WEBHOOK_EVENTS.includes(e as WebhookEventType)
      );
      if (validEvents.length === 0) {
        throw new TRPCError({
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
        events: updated.events as string[],
      },
    };
  }),

  /**
   * Delete a webhook
   */
  delete: protectedProcedure.input(webhookIdSchema).mutation(async ({ ctx, input }) => {
    const webhook = await ctx.prisma.webhook.findUnique({
      where: { id: input.webhookId },
    });

    if (!webhook) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, webhook.projectId, 'MANAGER');

    await ctx.prisma.webhook.delete({
      where: { id: input.webhookId },
    });

    return { success: true };
  }),

  /**
   * Regenerate webhook secret
   */
  regenerateSecret: protectedProcedure.input(webhookIdSchema).mutation(async ({ ctx, input }) => {
    const webhook = await ctx.prisma.webhook.findUnique({
      where: { id: input.webhookId },
    });

    if (!webhook) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, webhook.projectId, 'MANAGER');

    const newSecret = generateWebhookSecret();

    await ctx.prisma.webhook.update({
      where: { id: input.webhookId },
      data: { secret: newSecret },
    });

    return { success: true, secret: newSecret };
  }),

  /**
   * Test a webhook
   */
  test: protectedProcedure.input(webhookIdSchema).mutation(async ({ ctx, input }) => {
    const webhook = await ctx.prisma.webhook.findUnique({
      where: { id: input.webhookId },
    });

    if (!webhook) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, webhook.projectId, 'MEMBER');

    const result = await testWebhook(ctx.prisma, input.webhookId);

    return result;
  }),

  /**
   * Get recent deliveries for a webhook
   */
  getDeliveries: protectedProcedure.input(getDeliveriesSchema).query(async ({ ctx, input }) => {
    const webhook = await ctx.prisma.webhook.findUnique({
      where: { id: input.webhookId },
    });

    if (!webhook) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, webhook.projectId, 'MEMBER');

    const deliveries = await getRecentDeliveries(ctx.prisma, input.webhookId, input.limit);

    return deliveries;
  }),

  /**
   * Get available event types
   */
  getEventTypes: protectedProcedure.query(() => {
    return WEBHOOK_EVENTS.map((event) => ({
      value: event,
      label: formatEventLabel(event),
      category: event.split('.')[0] ?? 'other',
    }));
  }),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getWebhookStatus(webhook: {
  isActive: boolean;
  failureCount: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}): 'active' | 'failing' | 'disabled' {
  if (!webhook.isActive) return 'disabled';
  if (webhook.failureCount >= 5) return 'failing';
  return 'active';
}

function formatEventLabel(event: string): string {
  return event
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
