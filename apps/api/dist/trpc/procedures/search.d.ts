export declare const searchRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Full-text search over tasks in a project
     * Searches in title, reference, and description
     * Requires at least VIEWER access
     */
    tasks: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            query: string;
            limit?: number | undefined;
            includeCompleted?: boolean | undefined;
        };
        output: {
            assignees: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            }[];
            tags: {
                name: string;
                id: number;
                color: string;
            }[];
            id: number;
            isActive: boolean;
            column: {
                id: number;
                title: string;
            };
            title: string;
            reference: string | null;
            priority: number;
            dateDue: Date | null;
        }[];
        meta: object;
    }>;
    /**
     * Global search across multiple entity types
     * Searches tasks, comments, and wiki pages
     * Requires at least VIEWER access
     */
    global: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            query: string;
            limit?: number | undefined;
            entityTypes?: ("task" | "comment" | "wiki")[] | undefined;
        };
        output: {
            type: "task" | "comment" | "wiki";
            id: number;
            title: string;
            snippet: string;
            taskId?: number;
            taskTitle?: string;
            updatedAt: Date;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=search.d.ts.map