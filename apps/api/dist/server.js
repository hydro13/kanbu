"use strict";
/**
 * Fastify Server Setup
 *
 * Main server configuration with tRPC integration and public API routes.
 *
 * ═══════════════════════════════════════════════════════════════════
 * Modified by:
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Signed: 2025-12-29T00:15 CET
 * Change: Added public API routes (EXT-14)
 * ═══════════════════════════════════════════════════════════════════
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify_2 = require("@trpc/server/adapters/fastify");
const trpc_1 = require("./trpc");
const publicApi_1 = require("./routes/publicApi");
const avatar_1 = require("./routes/avatar");
/**
 * Create and configure Fastify server
 */
async function createServer() {
    const server = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL ?? 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname',
                    },
                }
                : undefined,
        },
    });
    // Register CORS - allow both localhost and linux-dev for Tailscale access
    await server.register(cors_1.default, {
        origin: process.env.CORS_ORIGIN?.split(',') ?? [
            'http://localhost:5173',
            'http://linux-dev:5173',
        ],
        credentials: true,
    });
    // Register tRPC
    await server.register(fastify_2.fastifyTRPCPlugin, {
        prefix: '/trpc',
        trpcOptions: {
            router: trpc_1.appRouter,
            createContext: trpc_1.createContext,
        },
    });
    // Health check endpoint (non-tRPC for load balancers)
    server.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // Root endpoint
    server.get('/', async () => {
        return {
            name: 'Kanbu API',
            version: '0.1.0',
            docs: '/trpc',
            publicApi: '/api/v1',
        };
    });
    // Register public API routes (REST endpoints with API key auth)
    await (0, publicApi_1.registerPublicApiRoutes)(server);
    // Register avatar serving routes
    await (0, avatar_1.registerAvatarRoutes)(server);
    return server;
}
//# sourceMappingURL=server.js.map