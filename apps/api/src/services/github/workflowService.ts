/*
 * GitHub Workflow Service
 * Version: 1.0.0
 *
 * Handles GitHub Actions workflow run tracking and management.
 * Features:
 * - Workflow run status tracking
 * - Link workflow runs to tasks/PRs
 * - Re-run and cancel workflows
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10 - CI/CD Integratie
 * =============================================================================
 */

import { prisma } from '../../lib/prisma';
import { getInstallationOctokit } from './githubService';

// =============================================================================
// Types
// =============================================================================

export interface WorkflowRunData {
  repositoryId: number;
  runId: bigint;
  workflowId: bigint;
  workflowName: string;
  event: string;
  status: string;
  conclusion: string | null;
  headSha: string;
  headBranch: string;
  htmlUrl: string;
  runNumber: number;
  runAttempt: number;
  actor: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface WorkflowRunFilters {
  status?: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  branch?: string;
  event?: string;
}

// =============================================================================
// Workflow Run Management
// =============================================================================

/**
 * Create or update a workflow run from webhook data
 */
export async function upsertWorkflowRun(data: WorkflowRunData): Promise<{ id: number }> {
  // Try to find linked task by branch name
  let taskId: number | null = null;
  let pullRequestId: number | null = null;

  // Find task by branch name
  const task = await prisma.task.findFirst({
    where: {
      githubBranch: data.headBranch,
      isActive: true,
    },
    select: { id: true },
  });
  if (task) {
    taskId = task.id;
  }

  // Find PR by branch name
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: data.repositoryId },
    select: { id: true },
  });
  if (repo) {
    const pr = await prisma.gitHubPullRequest.findFirst({
      where: {
        repositoryId: data.repositoryId,
        headBranch: data.headBranch,
        state: 'open',
      },
      select: { id: true },
    });
    if (pr) {
      pullRequestId = pr.id;
    }
  }

  const workflowRun = await prisma.gitHubWorkflowRun.upsert({
    where: {
      repositoryId_runId: {
        repositoryId: data.repositoryId,
        runId: data.runId,
      },
    },
    create: {
      repositoryId: data.repositoryId,
      taskId,
      pullRequestId,
      runId: data.runId,
      workflowId: data.workflowId,
      workflowName: data.workflowName,
      event: data.event,
      status: data.status,
      conclusion: data.conclusion,
      headSha: data.headSha,
      headBranch: data.headBranch,
      htmlUrl: data.htmlUrl,
      runNumber: data.runNumber,
      runAttempt: data.runAttempt,
      actor: data.actor,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    },
    update: {
      status: data.status,
      conclusion: data.conclusion,
      runAttempt: data.runAttempt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    },
  });

  return { id: workflowRun.id };
}

/**
 * Get workflow runs for a repository
 */
export async function getWorkflowRuns(
  repositoryId: number,
  filters: WorkflowRunFilters = {},
  limit: number = 20,
  offset: number = 0
) {
  const where: Record<string, unknown> = { repositoryId };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.conclusion) {
    where.conclusion = filters.conclusion;
  }
  if (filters.branch) {
    where.headBranch = filters.branch;
  }
  if (filters.event) {
    where.event = filters.event;
  }

  const [runs, total] = await Promise.all([
    prisma.gitHubWorkflowRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        task: {
          select: {
            id: true,
            reference: true,
            title: true,
          },
        },
        pullRequest: {
          select: {
            id: true,
            prNumber: true,
            title: true,
          },
        },
      },
    }),
    prisma.gitHubWorkflowRun.count({ where }),
  ]);

  return {
    runs,
    total,
    hasMore: offset + runs.length < total,
  };
}

/**
 * Get workflow runs for a specific task
 */
export async function getTaskWorkflowRuns(taskId: number, limit: number = 10) {
  const runs = await prisma.gitHubWorkflowRun.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { runs };
}

/**
 * Get workflow runs for a specific PR
 */
export async function getPRWorkflowRuns(pullRequestId: number, limit: number = 10) {
  const runs = await prisma.gitHubWorkflowRun.findMany({
    where: { pullRequestId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { runs };
}

/**
 * Get a single workflow run with details
 */
export async function getWorkflowRunDetails(workflowRunId: number) {
  const run = await prisma.gitHubWorkflowRun.findUnique({
    where: { id: workflowRunId },
    include: {
      repository: {
        select: {
          id: true,
          owner: true,
          name: true,
          fullName: true,
          installationId: true,
        },
      },
      task: {
        select: {
          id: true,
          reference: true,
          title: true,
        },
      },
      pullRequest: {
        select: {
          id: true,
          prNumber: true,
          title: true,
        },
      },
    },
  });

  return run;
}

// =============================================================================
// Workflow Actions (via GitHub API)
// =============================================================================

/**
 * Re-run a failed workflow
 */
export async function rerunWorkflow(
  workflowRunId: number
): Promise<{ success: boolean; message: string }> {
  const run = await prisma.gitHubWorkflowRun.findUnique({
    where: { id: workflowRunId },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
          installationId: true,
        },
      },
    },
  });

  if (!run) {
    return { success: false, message: 'Workflow run not found' };
  }

  if (run.status !== 'completed') {
    return { success: false, message: 'Can only re-run completed workflows' };
  }

  const octokit = await getInstallationOctokit(run.repository.installationId);

  try {
    await octokit.actions.reRunWorkflow({
      owner: run.repository.owner,
      repo: run.repository.name,
      run_id: Number(run.runId),
    });

    return { success: true, message: 'Workflow re-run initiated' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed to re-run workflow: ${message}` };
  }
}

/**
 * Re-run only failed jobs in a workflow
 */
export async function rerunFailedJobs(
  workflowRunId: number
): Promise<{ success: boolean; message: string }> {
  const run = await prisma.gitHubWorkflowRun.findUnique({
    where: { id: workflowRunId },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
          installationId: true,
        },
      },
    },
  });

  if (!run) {
    return { success: false, message: 'Workflow run not found' };
  }

  if (run.conclusion !== 'failure') {
    return { success: false, message: 'Can only re-run failed jobs from failed workflows' };
  }

  const octokit = await getInstallationOctokit(run.repository.installationId);

  try {
    await octokit.actions.reRunWorkflowFailedJobs({
      owner: run.repository.owner,
      repo: run.repository.name,
      run_id: Number(run.runId),
    });

    return { success: true, message: 'Failed jobs re-run initiated' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed to re-run failed jobs: ${message}` };
  }
}

/**
 * Cancel a running workflow
 */
export async function cancelWorkflow(
  workflowRunId: number
): Promise<{ success: boolean; message: string }> {
  const run = await prisma.gitHubWorkflowRun.findUnique({
    where: { id: workflowRunId },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
          installationId: true,
        },
      },
    },
  });

  if (!run) {
    return { success: false, message: 'Workflow run not found' };
  }

  if (run.status === 'completed') {
    return { success: false, message: 'Cannot cancel completed workflow' };
  }

  const octokit = await getInstallationOctokit(run.repository.installationId);

  try {
    await octokit.actions.cancelWorkflowRun({
      owner: run.repository.owner,
      repo: run.repository.name,
      run_id: Number(run.runId),
    });

    return { success: true, message: 'Workflow cancelled' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed to cancel workflow: ${message}` };
  }
}

// =============================================================================
// Workflow Job Details (fetched on-demand from GitHub API)
// =============================================================================

export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

/**
 * Get jobs for a workflow run (fetched from GitHub API)
 */
export async function getWorkflowJobs(workflowRunId: number): Promise<{ jobs: WorkflowJob[] }> {
  const run = await prisma.gitHubWorkflowRun.findUnique({
    where: { id: workflowRunId },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
          installationId: true,
        },
      },
    },
  });

  if (!run) {
    return { jobs: [] };
  }

  const octokit = await getInstallationOctokit(run.repository.installationId);

  try {
    const response = await octokit.actions.listJobsForWorkflowRun({
      owner: run.repository.owner,
      repo: run.repository.name,
      run_id: Number(run.runId),
    });

    const jobs: WorkflowJob[] = response.data.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      steps: (job.steps || []).map((step) => ({
        name: step.name,
        status: step.status,
        conclusion: step.conclusion || null,
        number: step.number,
        startedAt: step.started_at || null,
        completedAt: step.completed_at || null,
      })),
    }));

    return { jobs };
  } catch (error) {
    console.error('Failed to fetch workflow jobs:', error);
    return { jobs: [] };
  }
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get workflow run statistics for a repository
 */
export async function getWorkflowStats(repositoryId: number, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const runs = await prisma.gitHubWorkflowRun.findMany({
    where: {
      repositoryId,
      createdAt: { gte: since },
    },
    select: {
      status: true,
      conclusion: true,
      workflowName: true,
      startedAt: true,
      completedAt: true,
    },
  });

  // Calculate statistics
  const total = runs.length;
  const byConclusion: Record<string, number> = {};
  const byWorkflow: Record<string, { total: number; success: number; failure: number }> = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const run of runs) {
    // Count by conclusion
    const conclusion = run.conclusion || 'pending';
    byConclusion[conclusion] = (byConclusion[conclusion] || 0) + 1;

    // Count by workflow
    if (!byWorkflow[run.workflowName]) {
      byWorkflow[run.workflowName] = { total: 0, success: 0, failure: 0 };
    }
    const workflowStats = byWorkflow[run.workflowName]!;
    workflowStats.total++;
    if (run.conclusion === 'success') {
      workflowStats.success++;
    } else if (run.conclusion === 'failure') {
      workflowStats.failure++;
    }

    // Calculate duration
    if (run.startedAt && run.completedAt) {
      totalDuration += run.completedAt.getTime() - run.startedAt.getTime();
      durationCount++;
    }
  }

  const successRate = total > 0 ? ((byConclusion['success'] || 0) / total) * 100 : 0;
  const avgDurationMs = durationCount > 0 ? totalDuration / durationCount : 0;

  return {
    total,
    byConclusion,
    byWorkflow,
    successRate: Math.round(successRate * 10) / 10,
    avgDurationMinutes: Math.round((avgDurationMs / 60000) * 10) / 10,
    period: { days, since },
  };
}

// =============================================================================
// Webhook Event Handler Helper
// =============================================================================

/**
 * Process a workflow_run webhook event
 */
export async function processWorkflowRunEvent(
  repositoryId: number,
  action: string,
  workflowRun: {
    id: number;
    workflow_id: number;
    name: string;
    event: string;
    status: string;
    conclusion: string | null;
    head_sha: string;
    head_branch: string;
    html_url: string;
    run_number: number;
    run_attempt: number;
    actor: { login: string } | null;
    run_started_at: string | null;
    updated_at: string | null;
  }
): Promise<void> {
  const data: WorkflowRunData = {
    repositoryId,
    runId: BigInt(workflowRun.id),
    workflowId: BigInt(workflowRun.workflow_id),
    workflowName: workflowRun.name,
    event: workflowRun.event,
    status: workflowRun.status,
    conclusion: workflowRun.conclusion,
    headSha: workflowRun.head_sha,
    headBranch: workflowRun.head_branch,
    htmlUrl: workflowRun.html_url,
    runNumber: workflowRun.run_number,
    runAttempt: workflowRun.run_attempt,
    actor: workflowRun.actor?.login || null,
    startedAt: workflowRun.run_started_at ? new Date(workflowRun.run_started_at) : null,
    completedAt:
      action === 'completed' && workflowRun.updated_at ? new Date(workflowRun.updated_at) : null,
  };

  await upsertWorkflowRun(data);

  console.log(
    `[WorkflowService] Processed workflow_run ${action}: ${workflowRun.name} #${workflowRun.run_number}`
  );
}
