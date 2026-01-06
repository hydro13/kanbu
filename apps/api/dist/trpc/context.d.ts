/**
 * tRPC Context
 *
 * Creates the context that is passed to all tRPC procedures
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
export interface CreateContextOptions {
    req: FastifyRequest;
    res: FastifyReply;
}
export interface AuthUser {
    id: number;
    email: string;
    username: string;
}
export declare function createContext({ req, res }: CreateContextOptions): Promise<{
    req: FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
    res: FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
    user: AuthUser | null;
}>;
export type Context = Awaited<ReturnType<typeof createContext>>;
//# sourceMappingURL=context.d.ts.map