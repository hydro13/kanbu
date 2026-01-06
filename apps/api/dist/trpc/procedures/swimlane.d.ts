export declare const swimlaneRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List all swimlanes for a project
     * Requires VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            id: number;
            name: string;
            description: string | null;
            position: number;
            isActive: boolean;
            createdAt: Date;
            taskCount: number;
        }[];
        meta: object;
    }>;
    /**
     * Create a new swimlane
     * Requires MANAGER or OWNER access
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name: string;
            description?: string | undefined;
            position?: number | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            position: number;
        };
        meta: object;
    }>;
    /**
     * Get swimlane details
     * Requires VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            swimlaneId: number;
        };
        output: {
            taskCount: number;
            name: string;
            id: number;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            position: number;
            _count: {
                tasks: number;
            };
        };
        meta: object;
    }>;
    /**
     * Update swimlane settings
     * Requires MANAGER or OWNER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            swimlaneId: number;
            name?: string | undefined;
            description?: string | undefined;
            isActive?: boolean | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            isActive: boolean;
            updatedAt: Date;
            position: number;
        };
        meta: object;
    }>;
    /**
     * Delete a swimlane
     * Requires MANAGER or OWNER access
     * Swimlane must be empty (no tasks)
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            swimlaneId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Reorder swimlanes (drag & drop)
     * Requires MANAGER or OWNER access
     */
    reorder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            swimlaneId: number;
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
     * Toggle swimlane active status
     * Soft delete alternative - hide swimlane without deleting
     * Requires MANAGER or OWNER access
     */
    toggleActive: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            swimlaneId: number;
        };
        output: {
            name: string;
            id: number;
            isActive: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=swimlane.d.ts.map