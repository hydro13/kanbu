export declare const commentRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List comments for a task
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            comments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                };
                content: string;
            }[];
            total: number;
            hasMore: boolean;
        };
        meta: object;
    }>;
    /**
     * Create a new comment
     * Requires at least MEMBER access
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            content: string;
        };
        output: {
            id: number;
            createdAt: Date;
            user: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            };
            content: string;
        };
        meta: object;
    }>;
    /**
     * Get a single comment
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            commentId: number;
        };
        output: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            user: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            };
            taskId: number;
            content: string;
        } | null;
        meta: object;
    }>;
    /**
     * Update a comment
     * Only the author can update their comment
     * Requires at least MEMBER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            commentId: number;
            content: string;
        };
        output: {
            id: number;
            updatedAt: Date;
            content: string;
        };
        meta: object;
    }>;
    /**
     * Delete a comment
     * Author can delete their own comment
     * MANAGER+ can delete any comment
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            commentId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=comment.d.ts.map