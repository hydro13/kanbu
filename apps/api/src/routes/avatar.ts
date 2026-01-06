/*
 * Avatar Routes
 * Version: 1.0.0
 *
 * Serves user avatars from database storage.
 *
 * Task: USER-01 (Task 247)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 9a49de0d-74ae-4a76-a6f6-53c7e3f2218b
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T16:53 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

/**
 * Register avatar serving routes
 */
export async function registerAvatarRoutes(server: FastifyInstance) {
  /**
   * GET /api/avatar/:userId
   * Serves the avatar image for a user
   */
  server.get<{
    Params: { userId: string };
  }>('/api/avatar/:userId', async (request, reply) => {
    const userId = parseInt(request.params.userId, 10);

    if (isNaN(userId)) {
      return reply.status(400).send({ error: 'Invalid user ID' });
    }

    const avatar = await prisma.userAvatar.findUnique({
      where: { userId },
      select: {
        data: true,
        mimeType: true,
      },
    });

    if (!avatar) {
      return reply.status(404).send({ error: 'Avatar not found' });
    }

    // Set caching headers (1 hour cache, revalidate after)
    reply.header('Cache-Control', 'public, max-age=3600, must-revalidate');
    reply.header('Content-Type', avatar.mimeType);

    return reply.send(avatar.data);
  });
}
