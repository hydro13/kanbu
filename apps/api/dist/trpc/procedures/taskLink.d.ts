export declare const taskLinkRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List all links for a task
     * Returns both outgoing and incoming links
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
        };
        output: {
            outgoing: {
                id: number;
                direction: "outgoing";
                linkType: import("@prisma/client").$Enums.TaskLinkType;
                linkedTask: {
                    id: number;
                    title: string;
                    reference: string | null;
                    isActive: boolean;
                    columnTitle: string;
                };
                createdAt: Date;
            }[];
            incoming: {
                id: number;
                direction: "incoming";
                linkType: string;
                originalLinkType: import("@prisma/client").$Enums.TaskLinkType;
                linkedTask: {
                    id: number;
                    title: string;
                    reference: string | null;
                    isActive: boolean;
                    columnTitle: string;
                };
                createdAt: Date;
            }[];
            all: ({
                id: number;
                direction: "outgoing";
                linkType: import("@prisma/client").$Enums.TaskLinkType;
                linkedTask: {
                    id: number;
                    title: string;
                    reference: string | null;
                    isActive: boolean;
                    columnTitle: string;
                };
                createdAt: Date;
            } | {
                id: number;
                direction: "incoming";
                linkType: string;
                originalLinkType: import("@prisma/client").$Enums.TaskLinkType;
                linkedTask: {
                    id: number;
                    title: string;
                    reference: string | null;
                    isActive: boolean;
                    columnTitle: string;
                };
                createdAt: Date;
            })[];
        };
        meta: object;
    }>;
    /**
     * Create a new link between two tasks
     * Requires at least MEMBER access
     * Prevents circular dependencies for blocking links
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            oppositeTaskId: number;
            linkType: "RELATES_TO" | "BLOCKS" | "IS_BLOCKED_BY" | "DUPLICATES" | "IS_DUPLICATED_BY" | "IS_CHILD_OF" | "IS_PARENT_OF" | "FOLLOWS" | "IS_FOLLOWED_BY" | "FIXES" | "IS_FIXED_BY";
        };
        output: {
            id: number;
            createdAt: Date;
            linkType: import("@prisma/client").$Enums.TaskLinkType;
            oppositeTask: {
                id: number;
                title: string;
                reference: string | null;
            };
        };
        meta: object;
    }>;
    /**
     * Delete a link
     * Requires at least MEMBER access
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            linkId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get blocking information for a task
     * Returns tasks that block this task and tasks blocked by this task
     * Requires at least VIEWER access
     */
    getBlocking: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
        };
        output: {
            isBlocked: boolean;
            blockingTasks: {
                id: number;
                title: string;
                reference: string | null;
                isActive: boolean;
                columnTitle: string;
            }[];
            blockedTasks: {
                id: number;
                title: string;
                reference: string | null;
                isActive: boolean;
                columnTitle: string;
            }[];
            blockingCount: number;
            blockedCount: number;
        };
        meta: object;
    }>;
    /**
     * Get available link types
     * Returns all link types with their labels and descriptions
     */
    getLinkTypes: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            type: string;
            label: string;
            description: string;
        }[];
        meta: object;
    }>;
    /**
     * Search tasks for linking
     * Returns tasks that can be linked to the given task
     * Requires at least VIEWER access
     */
    searchTasks: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
            query: string;
            limit?: number | undefined;
        };
        output: {
            id: number;
            title: string;
            reference: string | null;
            isActive: boolean;
            columnTitle: string;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=taskLink.d.ts.map