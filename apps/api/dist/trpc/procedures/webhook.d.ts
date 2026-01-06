import { type WebhookEventType } from '../../lib/webhookService';
export declare const webhookRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
        res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
        prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
        user: import("../context").AuthUser | null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List webhooks for a project
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            events: string[];
            status: "active" | "failing" | "disabled";
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            url: string;
            lastSuccess: Date | null;
            lastFailure: Date | null;
            failureCount: number;
        }[];
        meta: object;
    }>;
    /**
     * Get a single webhook with details
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            webhookId: number;
        };
        output: {
            events: string[];
            status: "active" | "failing" | "disabled";
            hasSecret: boolean;
            project: {
                name: string;
                id: number;
            };
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            url: string;
            secret: string;
            lastSuccess: Date | null;
            lastFailure: Date | null;
            failureCount: number;
        };
        meta: object;
    }>;
    /**
     * Create a new webhook
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name: string;
            url: string;
            events: string[];
        };
        output: {
            events: string[];
            secret: string;
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            url: string;
        };
        meta: object;
    }>;
    /**
     * Update a webhook
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            webhookId: number;
            name?: string | undefined;
            url?: string | undefined;
            events?: string[] | undefined;
            isActive?: boolean | undefined;
        };
        output: {
            success: boolean;
            webhook: {
                events: string[];
                name: string;
                id: number;
                isActive: boolean;
                updatedAt: Date;
                url: string;
            };
        };
        meta: object;
    }>;
    /**
     * Delete a webhook
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            webhookId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Regenerate webhook secret
     */
    regenerateSecret: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            webhookId: number;
        };
        output: {
            success: boolean;
            secret: string;
        };
        meta: object;
    }>;
    /**
     * Test a webhook
     */
    test: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            webhookId: number;
        };
        output: import("../../lib/webhookService").DeliveryResult;
        meta: object;
    }>;
    /**
     * Get recent deliveries for a webhook
     */
    getDeliveries: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            webhookId: number;
            limit?: number | undefined;
        };
        output: {
            id: number;
            webhookId: number;
            event: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            statusCode: number | null;
            response: string | null;
            duration: number | null;
            success: boolean;
            attempts: number;
            deliveredAt: Date;
        }[];
        meta: object;
    }>;
    /**
     * Get available event types
     */
    getEventTypes: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            value: WebhookEventType;
            label: string;
            category: string;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=webhook.d.ts.map