import type { PrismaClient, Prisma } from '@prisma/client';
export type WebhookEventType = 'task.created' | 'task.updated' | 'task.deleted' | 'task.moved' | 'task.completed' | 'task.reopened' | 'task.assigned' | 'comment.created' | 'comment.updated' | 'comment.deleted' | 'subtask.created' | 'subtask.completed' | 'project.updated' | 'column.created' | 'column.updated' | 'sprint.started' | 'sprint.completed' | 'milestone.completed';
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
/**
 * Generate a random webhook secret
 */
export declare function generateWebhookSecret(): string;
/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export declare function generateSignature(payload: string, secret: string): string;
/**
 * Verify webhook signature
 */
export declare function verifySignature(payload: string, signature: string, secret: string): boolean;
/**
 * Dispatch webhooks for an event
 * Finds all active webhooks for the project that subscribe to this event
 * and delivers the payload to each one (with retry logic)
 */
export declare function dispatchWebhooks(prisma: PrismaClient, projectId: number, event: WebhookEventType, data: Record<string, unknown>): Promise<void>;
/**
 * Test a webhook by sending a test payload
 */
export declare function testWebhook(prisma: PrismaClient, webhookId: number): Promise<DeliveryResult>;
/**
 * Get recent deliveries for a webhook
 */
export declare function getRecentDeliveries(prisma: PrismaClient, webhookId: number, limit?: number): Promise<{
    id: number;
    webhookId: number;
    event: string;
    payload: Prisma.JsonValue;
    statusCode: number | null;
    response: string | null;
    duration: number | null;
    success: boolean;
    attempts: number;
    deliveredAt: Date;
}[]>;
/**
 * All available webhook event types
 */
export declare const WEBHOOK_EVENTS: WebhookEventType[];
//# sourceMappingURL=webhookService.d.ts.map