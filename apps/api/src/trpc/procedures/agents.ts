/**
 * Agents tRPC Procedures
 *
 * Endpoints for managing AI agents and dispatching tasks via OpenClaw.
 *
 * Procedures:
 *   agent.isEnabled  — check if OpenClaw gateway is configured
 *   agent.list       — list active agents for a project's workspace
 *   agent.create     — create a new agent (derives workspaceId from projectId)
 *   agent.dispatch   — dispatch a task to an agent (fire-and-forget)
 *   agent.listRuns   — list runs for a task
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { getOpenClawClient, isOpenClawEnabled } from '../../services/openclawService';
import { buildTaskMessage } from '@kanbu/openclaw-bridge';

// =============================================================================
// Schemas
// =============================================================================

const listAgentsSchema = z.object({
  projectId: z.number(),
});

const createAgentSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  role: z.string().max(100).optional(),
  systemPrompt: z.string().optional(),
  workspacePath: z.string().max(500).optional(),
});

const dispatchSchema = z.object({
  taskId: z.number(),
  agentId: z.number(),
  customInstructions: z.string().optional(),
});

const listRunsSchema = z.object({
  taskId: z.number(),
});

// =============================================================================
// Router
// =============================================================================

export const agentsRouter = router({
  /**
   * Check if the OpenClaw gateway is configured on the server.
   * Used by the frontend to show/hide the dispatch button.
   */
  isEnabled: protectedProcedure.query(() => {
    return { enabled: isOpenClawEnabled() };
  }),

  /**
   * List active agents for a project's workspace.
   */
  list: protectedProcedure.input(listAgentsSchema).query(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (!project) return [];

    return ctx.prisma.agent.findMany({
      where: { workspaceId: project.workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /**
   * Create a new agent (workspaceId derived from projectId).
   */
  create: protectedProcedure.input(createAgentSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (!project) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    return ctx.prisma.agent.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: input.projectId,
        name: input.name,
        role: input.role ?? null,
        systemPrompt: input.systemPrompt ?? null,
        workspacePath: input.workspacePath ?? null,
      },
    });
  }),

  /**
   * Dispatch a task to an agent via the OpenClaw gateway.
   *
   * Creates an AgentRun record immediately and fires the HTTP request
   * to OpenClaw in the background. The run status is updated async.
   * Returns { runId, sessionKey, status: 'running' } immediately.
   */
  dispatch: protectedProcedure.input(dispatchSchema).mutation(async ({ ctx, input }) => {
    const client = getOpenClawClient();
    if (!client) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'OpenClaw gateway is not configured. Set OPENCLAW_GATEWAY_URL in your environment.',
      });
    }

    // Load task with its project and workspace
    const task = await ctx.prisma.task.findUnique({
      where: { id: input.taskId },
      include: {
        project: {
          include: { workspace: true },
        },
      },
    });
    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
    }

    // Load agent
    const agent = await ctx.prisma.agent.findUnique({
      where: { id: input.agentId },
    });
    if (!agent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
    }

    // Unique session key for this dispatch
    const sessionKey = `kanbu:task-${task.id}:agent-${agent.id}:${Date.now()}`;

    // Create AgentRun record (status: running)
    const run = await ctx.prisma.agentRun.create({
      data: {
        agentId: agent.id,
        taskId: task.id,
        sessionKey,
        status: 'running',
      },
    });

    // Build structured prompt
    const taskContext = buildTaskMessage({
      taskId: String(task.id),
      taskTitle: task.title,
      taskDescription: task.description ?? undefined,
      projectName: task.project.name,
      workspaceName: task.project.workspace.name,
      assignedAgentRole: agent.role ?? undefined,
      customInstructions: input.customInstructions,
    });

    // Fire-and-forget: dispatch to OpenClaw, update run status on completion
    const prisma = ctx.prisma;
    const runId = run.id;

    setImmediate(async () => {
      try {
        await client.send(taskContext, sessionKey);
        await prisma.agentRun.update({
          where: { id: runId },
          data: { status: 'completed', endedAt: new Date() },
        });
      } catch {
        await prisma.agentRun.update({
          where: { id: runId },
          data: { status: 'failed', endedAt: new Date() },
        });
      }
    });

    return { runId: run.id, sessionKey, status: 'running' as const };
  }),

  /**
   * List all agent runs for a task, newest first.
   */
  listRuns: protectedProcedure.input(listRunsSchema).query(async ({ ctx, input }) => {
    return ctx.prisma.agentRun.findMany({
      where: { taskId: input.taskId },
      include: {
        agent: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }),
});
