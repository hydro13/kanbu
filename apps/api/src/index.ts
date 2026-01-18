/**
 * Kanbu API - Entry Point
 *
 * Fastify + tRPC Backend Server
 *
 * @see SETUP-02 voor database schema
 * @see SETUP-03 voor backend boilerplate
 */

import 'dotenv/config';
import { createServer, isHttpsEnabled } from './server';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const server = await createServer();
  const protocol = isHttpsEnabled ? 'https' : 'http';

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     Kanbu API Server                         ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    Running                                          ║
║  Protocol:  ${(isHttpsEnabled ? 'HTTPS (TLS enabled)' : 'HTTP').padEnd(48)}║
║  URL:       ${protocol}://${HOST}:${PORT}                              ║
║  Health:    ${protocol}://${HOST}:${PORT}/health                       ║
║  tRPC:      ${protocol}://${HOST}:${PORT}/trpc                         ║
║  Env:       ${(process.env.NODE_ENV ?? 'development').padEnd(48)}║
╚══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
