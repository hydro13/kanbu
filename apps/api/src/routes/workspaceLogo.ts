/*
 * Workspace Logo Routes
 * Version: 1.0.0
 *
 * Serves workspace logos from database storage.
 *
 * Task: MULTI-WORKSPACE (Task 253)
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

/**
 * Register workspace logo serving routes
 */
export async function registerWorkspaceLogoRoutes(server: FastifyInstance) {
  /**
   * GET /api/workspace-logo/:workspaceId
   * Serves the logo image for a workspace
   */
  server.get<{
    Params: { workspaceId: string };
  }>('/api/workspace-logo/:workspaceId', async (request, reply) => {
    const workspaceId = parseInt(request.params.workspaceId, 10);

    if (isNaN(workspaceId)) {
      return reply.status(400).send({ error: 'Invalid workspace ID' });
    }

    const logo = await prisma.workspaceLogo.findUnique({
      where: { workspaceId },
      select: {
        data: true,
        mimeType: true,
      },
    });

    if (!logo) {
      return reply.status(404).send({ error: 'Logo not found' });
    }

    // Set caching headers (1 hour cache, revalidate after)
    reply.header('Cache-Control', 'public, max-age=3600, must-revalidate');
    reply.header('Content-Type', logo.mimeType);

    return reply.send(logo.data);
  });
}
