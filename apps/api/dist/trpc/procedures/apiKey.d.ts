export declare const API_PERMISSIONS: readonly ["tasks:read", "tasks:write", "projects:read", "projects:write", "comments:read", "comments:write", "webhooks:read", "webhooks:write"];
export type ApiPermission = (typeof API_PERMISSIONS)[number];
/**
 * Hash an API key for comparison
 */
export declare function hashApiKey(key: string): string;
export declare const apiKeyRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List all API keys for the current user
     * Note: Does not return the actual key, only metadata
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            permissions: ApiPermission[];
            isExpired: boolean;
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            expiresAt: Date | null;
            keyPrefix: string;
            rateLimit: number;
            lastUsedAt: Date | null;
        }[];
        meta: object;
    }>;
    /**
     * Create a new API key
     * Returns the full key ONCE - it cannot be retrieved again
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            permissions?: ("tasks:read" | "tasks:write" | "projects:read" | "projects:write" | "comments:read" | "comments:write" | "webhooks:read" | "webhooks:write")[] | undefined;
            rateLimit?: number | undefined;
            expiresAt?: string | undefined;
        };
        output: {
            permissions: ApiPermission[];
            key: string;
            name: string;
            id: number;
            createdAt: Date;
            expiresAt: Date | null;
            keyPrefix: string;
            rateLimit: number;
        };
        meta: object;
    }>;
    /**
     * Update an API key
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            keyId: number;
            name?: string | undefined;
            permissions?: ("tasks:read" | "tasks:write" | "projects:read" | "projects:write" | "comments:read" | "comments:write" | "webhooks:read" | "webhooks:write")[] | undefined;
            rateLimit?: number | undefined;
            isActive?: boolean | undefined;
        };
        output: {
            success: boolean;
            message: string;
            key?: undefined;
        } | {
            success: boolean;
            key: {
                permissions: ApiPermission[];
                name: string;
                id: number;
                isActive: boolean;
                updatedAt: Date;
                keyPrefix: string;
                rateLimit: number;
            };
            message?: undefined;
        };
        meta: object;
    }>;
    /**
     * Revoke (delete) an API key
     */
    revoke: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            keyId: number;
        };
        output: {
            success: boolean;
            message: string;
        } | {
            success: boolean;
            message?: undefined;
        };
        meta: object;
    }>;
    /**
     * Get available permissions
     */
    getPermissions: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            value: "tasks:read" | "tasks:write" | "projects:read" | "projects:write" | "comments:read" | "comments:write" | "webhooks:read" | "webhooks:write";
            label: string;
            description: string;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=apiKey.d.ts.map