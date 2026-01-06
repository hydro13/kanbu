export declare const tagRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List all tags for a project
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            taskCount: number;
            name: string;
            id: number;
            createdAt: Date;
            color: string;
            _count: {
                tasks: number;
            };
        }[];
        meta: object;
    }>;
    /**
     * Get a single tag by ID
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            tagId: number;
        };
        output: {
            taskCount: number;
            name: string;
            id: number;
            createdAt: Date;
            color: string;
            projectId: number;
            _count: {
                tasks: number;
            };
        };
        meta: object;
    }>;
    /**
     * Create a new tag
     * Requires at least MEMBER access
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name: string;
            color?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            createdAt: Date;
            color: string;
        };
        meta: object;
    }>;
    /**
     * Update a tag
     * Requires at least MEMBER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tagId: number;
            name?: string | undefined;
            color?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            color: string;
        };
        meta: object;
    }>;
    /**
     * Delete a tag
     * Requires at least MANAGER access
     * Also removes all task-tag associations
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tagId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Add a tag to a task
     * Requires at least MEMBER access
     */
    addToTask: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            tagId: number;
        };
        output: {
            success: boolean;
            alreadyTagged: boolean;
        };
        meta: object;
    }>;
    /**
     * Remove a tag from a task
     * Requires at least MEMBER access
     */
    removeFromTask: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            tagId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get all tags for a specific task
     * Requires at least VIEWER access
     */
    getTaskTags: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
        };
        output: {
            name: string;
            id: number;
            color: string;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=tag.d.ts.map