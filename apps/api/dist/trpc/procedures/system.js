"use strict";
/**
 * System Procedures
 *
 * Health check and system info endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRouter = void 0;
const zod_1 = require("zod");
const router_1 = require("../router");
exports.systemRouter = (0, router_1.router)({
    /**
     * Health check endpoint
     * Returns OK if the server is running and database is connected
     */
    health: router_1.publicProcedure.query(async ({ ctx }) => {
        // Check database connection
        let dbStatus = 'disconnected';
        try {
            await ctx.prisma.$queryRaw `SELECT 1`;
            dbStatus = 'connected';
        }
        catch {
            dbStatus = 'error';
        }
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus,
        };
    }),
    /**
     * System info endpoint
     * Returns version and environment info
     */
    info: router_1.publicProcedure.query(() => {
        return {
            name: 'Kanbu API',
            version: '0.1.0',
            environment: process.env.NODE_ENV ?? 'development',
            node: process.version,
        };
    }),
    /**
     * Echo endpoint for testing
     */
    echo: router_1.publicProcedure
        .input(zod_1.z.object({ message: zod_1.z.string() }))
        .query(({ input }) => {
        return {
            echo: input.message,
            timestamp: new Date().toISOString(),
        };
    }),
});
//# sourceMappingURL=system.js.map