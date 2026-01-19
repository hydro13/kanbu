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
 *
 * Modified by:
 * Session: 9a49de0d-74ae-4a76-a6f6-53c7e3f2218b
 * Signed: 2025-12-29T16:53 CET
 * Change: Added bodyLimit 10MB for avatar uploads, registered avatar routes
 *
 * Modified by:
 * Session: websocket-collaboration
 * Signed: 2025-01-03T00:00 CET
 * Change: Added Socket.io real-time collaboration with Redis adapter
 * ═══════════════════════════════════════════════════════════════════
 */

import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import fastifyStatic from '@fastify/static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { appRouter, createContext } from './trpc';
import { registerPublicApiRoutes } from './routes/publicApi';
import { registerAvatarRoutes } from './routes/avatar';
import { registerWorkspaceLogoRoutes } from './routes/workspaceLogo';
import { registerGitHubWebhookRoutes } from './routes/webhooks/github';
import { registerGitHubImageProxyRoutes } from './routes/githubImageProxy';
import { registerBackupTriggerRoutes } from './routes/backupTrigger';
import { registerMcpRoutes } from './routes/mcp';
import {
  registerOAuthMetadataRoutes,
  registerOAuthRegisterRoutes,
  registerOAuthAuthorizeRoutes,
  registerOAuthTokenRoutes,
} from './routes/oauth';
import { internalScheduler, isInternalSchedulerEnabled } from './services/backup';
import { initializeSocketServer } from './socket';
import { isRedisHealthy } from './lib/redis';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if HTTPS certificates exist (shared with web app)
const certsPath = path.resolve(__dirname, '../../../certs');
const httpsOptions = fs.existsSync(path.join(certsPath, 'localhost+4.pem'))
  ? {
      key: fs.readFileSync(path.join(certsPath, 'localhost+4-key.pem')),
      cert: fs.readFileSync(path.join(certsPath, 'localhost+4.pem')),
    }
  : null;

export const isHttpsEnabled = !!httpsOptions;

/**
 * Create and configure Fastify server
 */
export async function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    // Increase body limit to 10MB for avatar uploads (base64 encoded images)
    bodyLimit: 10 * 1024 * 1024,
    // Increase maxParamLength for tRPC batch requests (default 100 is too low)
    // Batch requests like /trpc/proc1,proc2,proc3,... can exceed 100 chars
    maxParamLength: 5000,
    // Enable HTTPS if certificates are available
    ...(httpsOptions ? { https: httpsOptions } : {}),
  });

  // Handle CORS manually for preflight requests (before tRPC can intercept them)
  server.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin as string | undefined;

    // In development, allow all origins; in production, check against CORS_ORIGIN
    let allowedOrigin: string | null = null;
    if (origin) {
      if (process.env.CORS_ORIGIN) {
        const allowedOrigins = process.env.CORS_ORIGIN.split(',');
        if (allowedOrigins.includes(origin)) {
          allowedOrigin = origin;
        }
      } else {
        // Allow all origins in development
        allowedOrigin = origin;
      }
    }

    // Handle preflight OPTIONS requests first
    if (request.method === 'OPTIONS') {
      // Must use specific origin with credentials, not '*'
      if (allowedOrigin) {
        reply
          .header('Access-Control-Allow-Origin', allowedOrigin)
          .header('Access-Control-Allow-Credentials', 'true')
          .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
          .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, trpc-accept')
          .header('Access-Control-Max-Age', '86400')
          .status(204)
          .send();
      } else {
        // No valid origin - reject preflight
        reply.status(403).send();
      }
      return;
    }

    // Set CORS headers for all other requests with valid origin
    if (allowedOrigin) {
      reply
        .header('Access-Control-Allow-Origin', allowedOrigin)
        .header('Access-Control-Allow-Credentials', 'true');
    }
  });

  // Serve static files from uploads directory
  const uploadsPath = process.env.UPLOAD_PATH || './uploads';
  const absoluteUploadsPath = path.isAbsolute(uploadsPath)
    ? uploadsPath
    : path.join(process.cwd(), uploadsPath);

  // Ensure uploads directory exists
  if (!fs.existsSync(absoluteUploadsPath)) {
    fs.mkdirSync(absoluteUploadsPath, { recursive: true });
  }

  await server.register(fastifyStatic, {
    root: absoluteUploadsPath,
    prefix: '/uploads/',
    decorateReply: false, // Don't override reply.sendFile if already decorated
  });

  // Register tRPC
  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  // Initialize Socket.io for real-time collaboration
  const io = await initializeSocketServer(server);
  server.decorate('io', io);

  // Health check endpoint (non-tRPC for load balancers)
  server.get('/health', async () => {
    const redisStatus = await isRedisHealthy();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisStatus,
        websocket: 'active',
      },
    };
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
  await registerPublicApiRoutes(server);

  // Register avatar serving routes
  await registerAvatarRoutes(server);

  // Register workspace logo serving routes
  await registerWorkspaceLogoRoutes(server);

  // Register GitHub webhook routes
  await registerGitHubWebhookRoutes(server);

  // Register GitHub image proxy routes (for private repo images)
  await registerGitHubImageProxyRoutes(server);

  // Register backup trigger routes (for external cron jobs)
  await registerBackupTriggerRoutes(server);

  // Register MCP routes (for Claude.ai Custom Connector)
  await registerMcpRoutes(server);

  // Register OAuth 2.1 metadata discovery endpoints (Phase 19)
  await registerOAuthMetadataRoutes(server);

  // Register OAuth 2.1 Dynamic Client Registration (Phase 19.3)
  await registerOAuthRegisterRoutes(server);

  // Register OAuth 2.1 Authorization endpoint (Phase 19.4)
  await registerOAuthAuthorizeRoutes(server);

  // Register OAuth 2.1 Token endpoint (Phase 19.5)
  await registerOAuthTokenRoutes(server);

  // Start internal backup scheduler if enabled
  if (isInternalSchedulerEnabled()) {
    internalScheduler.start().catch((err) => {
      console.error('[Server] Failed to start backup scheduler:', err);
    });
  }

  return server;
}
