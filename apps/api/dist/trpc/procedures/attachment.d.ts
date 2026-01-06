export declare const attachmentRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List attachments for a task
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
        };
        output: {
            url: string;
            name: string;
            id: number;
            createdAt: Date;
            user: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            };
            path: string;
            mimeType: string | null;
            size: number;
            isImage: boolean;
        }[];
        meta: object;
    }>;
    /**
     * Get file size limits configuration
     * Useful for frontend validation
     */
    getLimits: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            limits: Record<string, number>;
            maxSizeMB: number;
        };
        meta: object;
    }>;
    /**
     * Upload a new attachment
     * Requires at least MEMBER access
     */
    upload: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            filename: string;
            mimeType: string;
            data: string;
        };
        output: {
            url: string;
            name: string;
            id: number;
            createdAt: Date;
            user: {
                name: string;
                id: number;
                username: string;
            };
            path: string;
            mimeType: string | null;
            size: number;
            isImage: boolean;
        };
        meta: object;
    }>;
    /**
     * Get a single attachment
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            attachmentId: number;
        };
        output: {
            url: string;
            name: string;
            id: number;
            createdAt: Date;
            user: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            };
            taskId: number;
            path: string;
            mimeType: string | null;
            size: number;
            isImage: boolean;
        };
        meta: object;
    }>;
    /**
     * Delete an attachment
     * Author can delete their own attachment
     * MANAGER+ can delete any attachment
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            attachmentId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get file size limit for a specific MIME type
     * Useful for frontend preview of limits
     */
    getSizeLimit: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            mimeType: string;
        };
        output: {
            mimeType: string;
            maxBytes: number;
            maxMB: number;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=attachment.d.ts.map