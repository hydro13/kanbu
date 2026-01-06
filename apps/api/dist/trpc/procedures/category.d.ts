export declare const categoryRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List all categories for a project
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
            description: string | null;
            createdAt: Date;
            color: string;
            _count: {
                tasks: number;
            };
        }[];
        meta: object;
    }>;
    /**
     * Get a single category by ID
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            categoryId: number;
        };
        output: {
            taskCount: number;
            name: string;
            id: number;
            description: string | null;
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
     * Create a new category
     * Requires at least MEMBER access
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name: string;
            description?: string | undefined;
            color?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            color: string;
        };
        meta: object;
    }>;
    /**
     * Update a category
     * Requires at least MEMBER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            categoryId: number;
            name?: string | undefined;
            description?: string | null | undefined;
            color?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            color: string;
        };
        meta: object;
    }>;
    /**
     * Delete a category
     * Requires at least MANAGER access
     * Sets categoryId to null on all tasks using this category
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            categoryId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Set or remove a category on a task
     * Requires at least MEMBER access
     * Pass categoryId: null to remove the category from task
     */
    setForTask: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            categoryId: number | null;
        };
        output: {
            id: number;
            category: {
                name: string;
                id: number;
                description: string | null;
                createdAt: Date;
                color: string;
                projectId: number;
            } | null;
            categoryId: number | null;
        };
        meta: object;
    }>;
    /**
     * Get tasks by category
     * Requires at least VIEWER access
     */
    getTasks: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            categoryId: number;
        };
        output: {
            id: number;
            isActive: boolean;
            column: {
                id: number;
                title: string;
            };
            title: string;
            priority: number;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=category.d.ts.map