export declare const columnRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List all columns for a project
     * Requires VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            id: number;
            title: string;
            description: string | null;
            position: number;
            taskLimit: number;
            isCollapsed: boolean;
            showClosed: boolean;
            createdAt: Date;
            taskCount: number;
            isOverLimit: boolean;
        }[];
        meta: object;
    }>;
    /**
     * Create a new column
     * Requires MANAGER or OWNER access
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            title: string;
            description?: string | undefined;
            taskLimit?: number | undefined;
            position?: number | undefined;
        };
        output: {
            id: number;
            description: string | null;
            createdAt: Date;
            title: string;
            position: number;
            taskLimit: number;
            isCollapsed: boolean;
            showClosed: boolean;
        };
        meta: object;
    }>;
    /**
     * Get column details with WIP info
     * Requires VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            columnId: number;
        };
        output: {
            taskCount: number;
            wipInfo: import("../../lib/board").WIPValidation;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            title: string;
            position: number;
            _count: {
                tasks: number;
            };
            taskLimit: number;
            isCollapsed: boolean;
            showClosed: boolean;
        };
        meta: object;
    }>;
    /**
     * Update column settings
     * Requires MANAGER or OWNER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            columnId: number;
            title?: string | undefined;
            description?: string | undefined;
            taskLimit?: number | undefined;
            isCollapsed?: boolean | undefined;
            showClosed?: boolean | undefined;
        };
        output: {
            id: number;
            description: string | null;
            updatedAt: Date;
            title: string;
            position: number;
            taskLimit: number;
            isCollapsed: boolean;
            showClosed: boolean;
        };
        meta: object;
    }>;
    /**
     * Delete a column
     * Requires MANAGER or OWNER access
     * Column must be empty (no tasks)
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            columnId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Reorder columns (drag & drop)
     * Requires MANAGER or OWNER access
     */
    reorder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            columnId: number;
            newPosition: number;
        };
        output: {
            success: boolean;
            newPositions: {
                id: number;
                position: number;
            }[];
        };
        meta: object;
    }>;
    /**
     * Check WIP limit status for a column
     * Requires VIEWER access
     */
    checkWIP: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            columnId: number;
        };
        output: import("../../lib/board").WIPValidation;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=column.d.ts.map