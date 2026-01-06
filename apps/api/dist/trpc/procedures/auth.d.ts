/**
 * Auth Procedures
 *
 * Authentication endpoints: register, login, logout, me
 */
export interface AuthResponse {
    user: {
        id: number;
        email: string;
        username: string;
        name: string;
        avatarUrl: string | null;
    };
    accessToken: string;
    expiresAt: string;
}
export interface UserResponse {
    id: number;
    email: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    timezone: string;
    language: string;
    emailVerified: boolean;
    createdAt: string;
}
export declare const authRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Register a new user
     */
    register: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            email: string;
            username: string;
            name: string;
            password: string;
        };
        output: AuthResponse;
        meta: object;
    }>;
    /**
     * Login with email and password
     */
    login: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            email: string;
            password: string;
        };
        output: AuthResponse;
        meta: object;
    }>;
    /**
     * Logout - invalidate token (client-side token removal)
     * Note: With stateless JWT, logout is primarily client-side.
     * For token blacklisting, use sessions table.
     */
    logout: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Get current authenticated user
     */
    me: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: UserResponse | null;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=auth.d.ts.map