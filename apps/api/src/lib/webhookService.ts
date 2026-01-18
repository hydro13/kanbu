/*
 * Webhook Service
 * Version: 1.0.0
 *
 * Handles webhook dispatch, retry logic, and HMAC signature generation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:05 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { createHmac, randomBytes } from 'crypto';
import type { PrismaClient, Webhook, Prisma } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export type WebhookEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.moved'
  | 'task.completed'
  | 'task.reopened'
  | 'task.assigned'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'subtask.created'
  | 'subtask.completed'
  | 'project.updated'
  | 'column.created'
  | 'column.updated'
  | 'sprint.started'
  | 'sprint.completed'
  | 'milestone.completed';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  projectId: number;
  data: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  duration?: number;
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RESPONSE_SIZE = 10000; // 10KB max response to store

// =============================================================================
// Signature Generation
// =============================================================================

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = generateSignature(payload, secret);
  // Timing-safe comparison
  if (signature.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// =============================================================================
// Webhook Delivery
// =============================================================================

/**
 * Deliver a webhook to a single endpoint
 */
async function deliverToEndpoint(
  webhook: Webhook,
  payload: WebhookPayload
): Promise<DeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kanbu-Signature': signature,
        'X-Kanbu-Event': payload.event,
        'X-Kanbu-Timestamp': payload.timestamp,
        'X-Kanbu-Delivery': Date.now().toString(),
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // Read response body (limited size)
    let responseText = '';
    try {
      responseText = await response.text();
      if (responseText.length > MAX_RESPONSE_SIZE) {
        responseText = responseText.substring(0, MAX_RESPONSE_SIZE) + '...[truncated]';
      }
    } catch {
      responseText = '[Unable to read response]';
    }

    return {
      success: response.ok,
      statusCode: response.status,
      response: responseText,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Deliver webhook with retry logic
 */
async function deliverWithRetry(
  webhook: Webhook,
  payload: WebhookPayload,
  prisma: PrismaClient
): Promise<void> {
  let lastResult: DeliveryResult | null = null;
  let attempts = 0;

  for (let i = 0; i <= MAX_RETRIES; i++) {
    attempts = i + 1;
    lastResult = await deliverToEndpoint(webhook, payload);

    if (lastResult.success) {
      // Success - log delivery and update webhook
      await prisma.$transaction([
        prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event: payload.event,
            payload: payload as unknown as Prisma.InputJsonValue,
            statusCode: lastResult.statusCode,
            response: lastResult.response,
            duration: lastResult.duration,
            success: true,
            attempts,
          },
        }),
        prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastSuccess: new Date(),
            failureCount: 0,
          },
        }),
      ]);
      return;
    }

    // Wait before retry (except on last attempt)
    if (i < MAX_RETRIES) {
      const delay = RETRY_DELAYS[i] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted - log failure
  await prisma.$transaction([
    prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload: payload as unknown as Prisma.InputJsonValue,
        statusCode: lastResult?.statusCode,
        response: lastResult?.response ?? lastResult?.error,
        duration: lastResult?.duration,
        success: false,
        attempts,
      },
    }),
    prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastFailure: new Date(),
        failureCount: { increment: 1 },
      },
    }),
  ]);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Dispatch webhooks for an event
 * Finds all active webhooks for the project that subscribe to this event
 * and delivers the payload to each one (with retry logic)
 */
export async function dispatchWebhooks(
  prisma: PrismaClient,
  projectId: number,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  // Find all active webhooks for this project that subscribe to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId,
      isActive: true,
    },
  });

  // Filter webhooks that subscribe to this event
  const matchingWebhooks = webhooks.filter((webhook) => {
    const events = webhook.events as string[];
    return events.includes(event) || events.includes('*');
  });

  if (matchingWebhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    projectId,
    data,
  };

  // Dispatch to all matching webhooks in parallel (fire and forget)
  // We don't await here to not block the main request
  Promise.all(
    matchingWebhooks.map((webhook) =>
      deliverWithRetry(webhook, payload, prisma).catch((error) => {
        console.error(`Webhook delivery failed for ${webhook.id}:`, error);
      })
    )
  );
}

/**
 * Test a webhook by sending a test payload
 */
export async function testWebhook(
  prisma: PrismaClient,
  webhookId: number
): Promise<DeliveryResult> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  const testPayload: WebhookPayload = {
    event: 'task.created',
    timestamp: new Date().toISOString(),
    projectId: webhook.projectId,
    data: {
      test: true,
      message: 'This is a test webhook delivery from Kanbu',
    },
  };

  const result = await deliverToEndpoint(webhook, testPayload);

  // Log the test delivery
  await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event: 'test',
      payload: testPayload as unknown as Prisma.InputJsonValue,
      statusCode: result.statusCode,
      response: result.response ?? result.error,
      duration: result.duration,
      success: result.success,
      attempts: 1,
    },
  });

  return result;
}

/**
 * Get recent deliveries for a webhook
 */
export async function getRecentDeliveries(prisma: PrismaClient, webhookId: number, limit = 20) {
  return prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { deliveredAt: 'desc' },
    take: limit,
  });
}

/**
 * All available webhook event types
 */
export const WEBHOOK_EVENTS: WebhookEventType[] = [
  'task.created',
  'task.updated',
  'task.deleted',
  'task.moved',
  'task.completed',
  'task.reopened',
  'task.assigned',
  'comment.created',
  'comment.updated',
  'comment.deleted',
  'subtask.created',
  'subtask.completed',
  'project.updated',
  'column.created',
  'column.updated',
  'sprint.started',
  'sprint.completed',
  'milestone.completed',
];
