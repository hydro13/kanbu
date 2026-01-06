import { type ExportFormat } from '../../lib/importExport';
export declare const exportRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Export tasks from a project
     * Returns data in requested format (CSV, JSON, or Trello-compatible)
     */
    tasks: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            format?: "trello" | "csv" | "json" | undefined;
            includeClosedTasks?: boolean | undefined;
            columnIds?: number[] | undefined;
            tagIds?: number[] | undefined;
            assigneeIds?: number[] | undefined;
        };
        output: {
            content: string;
            filename: string;
            mimeType: string;
            taskCount: number;
            format: "trello" | "csv" | "json";
        };
        meta: object;
    }>;
    /**
     * Export entire project with structure
     * Includes columns, swimlanes, tags, categories, and all tasks
     */
    project: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            format?: "json" | undefined;
            includeClosedTasks?: boolean | undefined;
        };
        output: {
            content: string;
            filename: string;
            mimeType: string;
            taskCount: number;
            format: ExportFormat;
        };
        meta: object;
    }>;
    /**
     * Get available export formats
     * Informational endpoint for UI
     */
    formats: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            description: string;
            extension: string;
            mimeType: string;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=export.d.ts.map