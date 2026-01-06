"use strict";
/**
 * Kanbu API - Entry Point
 *
 * Fastify + tRPC Backend Server
 *
 * @see SETUP-02 voor database schema
 * @see SETUP-03 voor backend boilerplate
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const server_1 = require("./server");
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
async function main() {
    const server = await (0, server_1.createServer)();
    try {
        await server.listen({ port: PORT, host: HOST });
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     Kanbu API Server                         ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    Running                                          ║
║  URL:       http://${HOST}:${PORT}                              ║
║  Health:    http://${HOST}:${PORT}/health                       ║
║  tRPC:      http://${HOST}:${PORT}/trpc                         ║
║  Env:       ${(process.env.NODE_ENV ?? 'development').padEnd(48)}║
╚══════════════════════════════════════════════════════════════╝
    `);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map