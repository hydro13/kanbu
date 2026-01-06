/**
 * System Procedures
 *
 * Health check and system info endpoints
 */
export declare const systemRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Health check endpoint
     * Returns OK if the server is running and database is connected
     */
    health: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            status: string;
            timestamp: string;
            database: string;
        };
        meta: object;
    }>;
    /**
     * System info endpoint
     * Returns version and environment info
     */
    info: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            name: string;
            version: string;
            environment: string;
            node: string;
        };
        meta: object;
    }>;
    /**
     * Echo endpoint for testing
     */
    echo: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            message: string;
        };
        output: {
            echo: string;
            timestamp: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=system.d.ts.map