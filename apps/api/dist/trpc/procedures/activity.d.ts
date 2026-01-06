export declare const activityRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List activities for a project
     * Can filter by entity type, entity ID, or event type
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            entityType?: "project" | "column" | "swimlane" | "task" | "subtask" | "comment" | undefined;
            entityId?: number | undefined;
            eventType?: string | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            activities: {
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                } | null;
                eventType: string;
                entityType: string;
                entityId: number;
                changes: import("@prisma/client/runtime/library").JsonValue;
            }[];
            total: number;
            hasMore: boolean;
        };
        meta: object;
    }>;
    /**
     * Get activities for a specific task
     * Includes task-related activities and subtask/comment activities
     * Requires at least VIEWER access to the project
     */
    forTask: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            activities: {
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                } | null;
                eventType: string;
                entityType: string;
                entityId: number;
                changes: import("@prisma/client/runtime/library").JsonValue;
            }[];
            total: number;
            hasMore: boolean;
        };
        meta: object;
    }>;
    /**
     * Get recent project activity
     * Returns the most recent activities across the project
     * Requires at least VIEWER access
     */
    getRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            limit?: number | undefined;
        };
        output: {
            activities: {
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                } | null;
                eventType: string;
                entityType: string;
                entityId: number;
                changes: import("@prisma/client/runtime/library").JsonValue;
            }[];
        };
        meta: object;
    }>;
    /**
     * Get activity statistics for a project
     * Returns counts by event type for the last 30 days
     * Requires at least VIEWER access
     */
    getStats: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            byEventType: {
                eventType: string;
                count: number;
            }[];
            total: number;
            periodDays: number;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=activity.d.ts.map