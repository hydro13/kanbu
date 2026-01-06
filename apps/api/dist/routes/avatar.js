"use strict";
/*
 * Avatar Routes
 * Version: 1.0.0
 *
 * Serves user avatars from database storage.
 *
 * Task: USER-01 (Task 247)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAvatarRoutes = registerAvatarRoutes;
const prisma_1 = require("../lib/prisma");
/**
 * Register avatar serving routes
 */
async function registerAvatarRoutes(server) {
    /**
     * GET /api/avatar/:userId
     * Serves the avatar image for a user
     */
    server.get('/api/avatar/:userId', async (request, reply) => {
        const userId = parseInt(request.params.userId, 10);
        if (isNaN(userId)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
        }
        const avatar = await prisma_1.prisma.userAvatar.findUnique({
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
//# sourceMappingURL=avatar.js.map