/*
 * Public API Routes
 * Version: 1.0.0
 *
 * REST API endpoints authenticated with API keys.
 * Rate limited per API key settings.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:12 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { hashApiKey, type ApiPermission } from '../trpc/procedures/apiKey';
import { permissionService } from '../services/permissions';
import { scopeService } from '../services/scopeService';

// =============================================================================
// Types
// =============================================================================

interface ApiKeyContext {
  userId: number;
  keyId: number;
  permissions: ApiPermission[];
  rateLimit: number;
}

// =============================================================================
// Rate Limiting
// =============================================================================

import { rateLimitService } from '../services/rateLimitService';

// Helper wrappers to match existing internal API signature if needed,
// or we can replace calls directly.
// Replacing direct implementation with service calls.

// =============================================================================
// API Key Authentication
// =============================================================================

async function authenticateApiKey(request: FastifyRequest): Promise<ApiKeyContext | null> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const key = authHeader.substring(7);

  if (!key.startsWith('kb_')) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
    include: {
      user: { select: { id: true, isActive: true } },
    },
  });

  if (!apiKey || !apiKey.user.isActive) {
    return null;
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors
    });

  return {
    userId: apiKey.userId,
    keyId: apiKey.id,
    permissions: apiKey.permissions as ApiPermission[],
    rateLimit: apiKey.rateLimit,
  };
}

function hasPermission(context: ApiKeyContext, required: ApiPermission): boolean {
  return context.permissions.includes(required);
}

// =============================================================================
// Route Handlers
// =============================================================================

export async function registerPublicApiRoutes(server: FastifyInstance): Promise<void> {
  // Middleware to authenticate API key and check rate limit
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only apply to /api/v1 routes
    if (!request.url.startsWith('/api/v1')) {
      return;
    }

    const context = await authenticateApiKey(request);

    if (!context) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      });
      return;
    }

    // Check rate limit
    // Key format: "apikey:123" to distinguish from other types
    const rateLimitKey = `apikey:${context.keyId}`;

    if (!rateLimitService.check(rateLimitKey, context.rateLimit)) {
      const headers = rateLimitService.getHeaders(rateLimitKey, context.rateLimit);
      reply
        .status(429)
        .headers(headers)
        .send({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${headers['X-RateLimit-Reset']} seconds.`,
        });
      return;
    }

    // Add rate limit headers to response
    const headers = rateLimitService.getHeaders(rateLimitKey, context.rateLimit);
    reply.headers(headers);

    // Store context for route handlers
    (request as unknown as { apiContext: ApiKeyContext }).apiContext = context;
  });

  // ==========================================================================
  // API Info
  // ==========================================================================

  server.get('/api/v1', async () => {
    return {
      name: 'Kanbu Public API',
      version: 'v1',
      documentation: 'https://docs.kanbu.be/api',
      endpoints: [
        'GET /api/v1/projects',
        'GET /api/v1/projects/:projectId',
        'GET /api/v1/projects/:projectId/tasks',
        'GET /api/v1/tasks/:taskId',
        'POST /api/v1/tasks',
        'PATCH /api/v1/tasks/:taskId',
        'DELETE /api/v1/tasks/:taskId',
        'GET /api/v1/tasks/:taskId/comments',
        'POST /api/v1/tasks/:taskId/comments',
      ],
    };
  });

  // ==========================================================================
  // Projects
  // ==========================================================================

  server.get('/api/v1/projects', async (request) => {
    const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;

    if (!hasPermission(ctx, 'projects:read')) {
      return { error: 'Forbidden', message: 'Missing projects:read permission' };
    }

    // Get accessible project IDs via ACL/scope system
    const scope = await scopeService.getUserScope(ctx.userId);
    const projects = await prisma.project.findMany({
      where: {
        id: { in: scope.projectIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        identifier: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
      },
    });

    return { projects };
  });

  server.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId',
    async (request, reply) => {
      const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
      const projectId = parseInt(request.params.projectId, 10);

      if (!hasPermission(ctx, 'projects:read')) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Missing projects:read permission',
        });
      }

      // Check access via ACL system
      const hasAccess = await permissionService.canAccessProject(ctx.userId, projectId);
      if (!hasAccess) {
        return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          columns: { orderBy: { position: 'asc' } },
          swimlanes: { orderBy: { position: 'asc' } },
          _count: { select: { tasks: true } },
        },
      });

      if (!project) {
        return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
      }

      return { project };
    }
  );

  // ==========================================================================
  // Tasks
  // ==========================================================================

  server.get<{ Params: { projectId: string }; Querystring: { status?: string } }>(
    '/api/v1/projects/:projectId/tasks',
    async (request, reply) => {
      const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
      const projectId = parseInt(request.params.projectId, 10);
      const status = request.query.status;

      if (!hasPermission(ctx, 'tasks:read')) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Missing tasks:read permission' });
      }

      // Verify project access via ACL system
      const hasAccess = await permissionService.canAccessProject(ctx.userId, projectId);
      if (!hasAccess) {
        return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
      }

      const tasks = await prisma.task.findMany({
        where: {
          projectId,
          ...(status === 'open' && { isActive: true }),
          ...(status === 'closed' && { isActive: false }),
        },
        include: {
          column: { select: { id: true, title: true } },
          assignees: {
            include: { user: { select: { id: true, username: true, name: true } } },
          },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { tasks };
    }
  );

  server.get<{ Params: { taskId: string } }>('/api/v1/tasks/:taskId', async (request, reply) => {
    const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
    const taskId = parseInt(request.params.taskId, 10);

    if (!hasPermission(ctx, 'tasks:read')) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Missing tasks:read permission' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        column: { select: { id: true, title: true } },
        swimlane: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, name: true } },
        assignees: {
          include: { user: { select: { id: true, username: true, name: true } } },
        },
        subtasks: true,
        tags: { include: { tag: true } },
      },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
    }

    // Verify project access via ACL system
    const hasAccess = await permissionService.canAccessProject(ctx.userId, task.projectId);
    if (!hasAccess) {
      return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
    }

    return { task };
  });

  server.post<{
    Body: {
      projectId: number;
      title: string;
      description?: string;
      columnId?: number;
      priority?: number;
    };
  }>('/api/v1/tasks', async (request, reply) => {
    const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
    const { projectId, title, description, columnId, priority } = request.body;

    if (!hasPermission(ctx, 'tasks:write')) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Missing tasks:write permission' });
    }

    // Verify project access via ACL system
    const hasAccess = await permissionService.canAccessProject(ctx.userId, projectId);
    if (!hasAccess) {
      return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
    }

    // Get default column if not specified
    let targetColumnId = columnId;
    if (!targetColumnId) {
      const firstColumn = await prisma.column.findFirst({
        where: { projectId },
        orderBy: { position: 'asc' },
      });
      targetColumnId = firstColumn?.id;
    }

    if (!targetColumnId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'No column available' });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: targetColumnId,
        creatorId: ctx.userId,
        title,
        description,
        priority: priority ?? 0,
      },
      include: {
        column: { select: { id: true, title: true } },
      },
    });

    return reply.status(201).send({ task });
  });

  server.patch<{
    Params: { taskId: string };
    Body: {
      title?: string;
      description?: string;
      columnId?: number;
      priority?: number;
      isActive?: boolean;
    };
  }>('/api/v1/tasks/:taskId', async (request, reply) => {
    const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
    const taskId = parseInt(request.params.taskId, 10);
    const updates = request.body;

    if (!hasPermission(ctx, 'tasks:write')) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Missing tasks:write permission' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
    }

    // Verify project access via ACL system
    const hasAccess = await permissionService.canAccessProject(ctx.userId, task.projectId);
    if (!hasAccess) {
      return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
        ...(updates.columnId && { columnId: updates.columnId }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.isActive !== undefined && {
          isActive: updates.isActive,
          ...(updates.isActive === false && { dateCompleted: new Date() }),
        }),
      },
      include: {
        column: { select: { id: true, title: true } },
      },
    });

    return { task: updated };
  });

  server.delete<{ Params: { taskId: string } }>('/api/v1/tasks/:taskId', async (request, reply) => {
    const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
    const taskId = parseInt(request.params.taskId, 10);

    if (!hasPermission(ctx, 'tasks:write')) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Missing tasks:write permission' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
    }

    // Verify project access via ACL system
    const hasAccess = await permissionService.canAccessProject(ctx.userId, task.projectId);
    if (!hasAccess) {
      return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    return reply.status(204).send();
  });

  // ==========================================================================
  // Comments
  // ==========================================================================

  server.get<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/comments',
    async (request, reply) => {
      const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
      const taskId = parseInt(request.params.taskId, 10);

      if (!hasPermission(ctx, 'comments:read')) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Missing comments:read permission',
        });
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
      }

      // Verify project access via ACL system
      const hasAccess = await permissionService.canAccessProject(ctx.userId, task.projectId);
      if (!hasAccess) {
        return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
      }

      const comments = await prisma.comment.findMany({
        where: { taskId },
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      return { comments };
    }
  );

  server.post<{ Params: { taskId: string }; Body: { content: string } }>(
    '/api/v1/tasks/:taskId/comments',
    async (request, reply) => {
      const ctx = (request as unknown as { apiContext: ApiKeyContext }).apiContext;
      const taskId = parseInt(request.params.taskId, 10);
      const { content } = request.body;

      if (!hasPermission(ctx, 'comments:write')) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Missing comments:write permission',
        });
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
      }

      // Verify project access via ACL system
      const hasAccess = await permissionService.canAccessProject(ctx.userId, task.projectId);
      if (!hasAccess) {
        return reply.status(404).send({ error: 'Not Found', message: 'Task not found' });
      }

      const comment = await prisma.comment.create({
        data: {
          taskId,
          userId: ctx.userId,
          content,
        },
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
      });

      return reply.status(201).send({ comment });
    }
  );
}
