/*
 * Workflow Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub Actions workflow run tracking and management.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10 - CI/CD Integratie
 * =============================================================================
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
    },
    gitHubRepository: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    gitHubPullRequest: {
      findFirst: vi.fn(),
    },
    gitHubWorkflowRun: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock githubService
vi.mock('../githubService', () => ({
  getInstallationOctokit: vi.fn(),
}));

import { prisma } from '../../../lib/prisma';
import { getInstallationOctokit } from '../githubService';
import {
  upsertWorkflowRun,
  getWorkflowRuns,
  getTaskWorkflowRuns,
  getPRWorkflowRuns,
  getWorkflowRunDetails,
  rerunWorkflow,
  rerunFailedJobs,
  cancelWorkflow,
  getWorkflowJobs,
  getWorkflowStats,
  processWorkflowRunEvent,
  type WorkflowRunData,
} from '../workflowService';

// =============================================================================
// Test Data
// =============================================================================

const mockWorkflowRunData: WorkflowRunData = {
  repositoryId: 1,
  runId: BigInt(12345678),
  workflowId: BigInt(987654),
  workflowName: 'CI',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  headSha: 'abc123def456',
  headBranch: 'feature/TASK-123-new-feature',
  htmlUrl: 'https://github.com/owner/repo/actions/runs/12345678',
  runNumber: 42,
  runAttempt: 1,
  actor: 'testuser',
  startedAt: new Date('2026-01-09T10:00:00Z'),
  completedAt: new Date('2026-01-09T10:05:00Z'),
};

const mockWorkflowRun = {
  id: 1,
  repositoryId: 1,
  taskId: null,
  pullRequestId: null,
  runId: BigInt(12345678),
  workflowId: BigInt(987654),
  workflowName: 'CI',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  headSha: 'abc123def456',
  headBranch: 'feature/TASK-123-new-feature',
  htmlUrl: 'https://github.com/owner/repo/actions/runs/12345678',
  runNumber: 42,
  runAttempt: 1,
  actor: 'testuser',
  startedAt: new Date('2026-01-09T10:00:00Z'),
  completedAt: new Date('2026-01-09T10:05:00Z'),
  createdAt: new Date('2026-01-09T10:00:00Z'),
  updatedAt: new Date('2026-01-09T10:05:00Z'),
  repository: {
    id: 1,
    owner: 'testowner',
    name: 'testrepo',
    fullName: 'testowner/testrepo',
    installationId: 100,
  },
  task: null,
  pullRequest: null,
};

// =============================================================================
// Upsert Workflow Run Tests
// =============================================================================

describe('upsertWorkflowRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new workflow run', async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubWorkflowRun.upsert).mockResolvedValue({ id: 1 } as any);

    const result = await upsertWorkflowRun(mockWorkflowRunData);

    expect(result).toEqual({ id: 1 });
    expect(prisma.gitHubWorkflowRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          repositoryId_runId: {
            repositoryId: 1,
            runId: BigInt(12345678),
          },
        },
      })
    );
  });

  it('should link to task when branch matches', async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({ id: 42 } as any);
    vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubWorkflowRun.upsert).mockResolvedValue({ id: 1 } as any);

    await upsertWorkflowRun(mockWorkflowRunData);

    expect(prisma.gitHubWorkflowRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          taskId: 42,
        }),
      })
    );
  });

  it('should link to PR when branch matches', async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({ id: 1 } as any);
    vi.mocked(prisma.gitHubPullRequest.findFirst).mockResolvedValue({ id: 99 } as any);
    vi.mocked(prisma.gitHubWorkflowRun.upsert).mockResolvedValue({ id: 1 } as any);

    await upsertWorkflowRun(mockWorkflowRunData);

    expect(prisma.gitHubWorkflowRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          pullRequestId: 99,
        }),
      })
    );
  });
});

// =============================================================================
// Get Workflow Runs Tests
// =============================================================================

describe('getWorkflowRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return workflow runs with pagination', async () => {
    const mockRuns = [mockWorkflowRun, { ...mockWorkflowRun, id: 2 }];
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue(mockRuns as any);
    vi.mocked(prisma.gitHubWorkflowRun.count).mockResolvedValue(5);

    const result = await getWorkflowRuns(1, {}, 2, 0);

    expect(result.runs).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it('should apply status filter', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue([]);
    vi.mocked(prisma.gitHubWorkflowRun.count).mockResolvedValue(0);

    await getWorkflowRuns(1, { status: 'completed' });

    expect(prisma.gitHubWorkflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'completed',
        }),
      })
    );
  });

  it('should apply conclusion filter', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue([]);
    vi.mocked(prisma.gitHubWorkflowRun.count).mockResolvedValue(0);

    await getWorkflowRuns(1, { conclusion: 'failure' });

    expect(prisma.gitHubWorkflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conclusion: 'failure',
        }),
      })
    );
  });

  it('should apply branch filter', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue([]);
    vi.mocked(prisma.gitHubWorkflowRun.count).mockResolvedValue(0);

    await getWorkflowRuns(1, { branch: 'main' });

    expect(prisma.gitHubWorkflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          headBranch: 'main',
        }),
      })
    );
  });
});

// =============================================================================
// Get Task Workflow Runs Tests
// =============================================================================

describe('getTaskWorkflowRuns', () => {
  it('should return workflow runs for a task', async () => {
    const mockRuns = [mockWorkflowRun];
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue(mockRuns as any);

    const result = await getTaskWorkflowRuns(42);

    expect(result.runs).toHaveLength(1);
    expect(prisma.gitHubWorkflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: 42 },
      })
    );
  });
});

// =============================================================================
// Get PR Workflow Runs Tests
// =============================================================================

describe('getPRWorkflowRuns', () => {
  it('should return workflow runs for a PR', async () => {
    const mockRuns = [mockWorkflowRun];
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue(mockRuns as any);

    const result = await getPRWorkflowRuns(99);

    expect(result.runs).toHaveLength(1);
    expect(prisma.gitHubWorkflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pullRequestId: 99 },
      })
    );
  });
});

// =============================================================================
// Get Workflow Run Details Tests
// =============================================================================

describe('getWorkflowRunDetails', () => {
  it('should return workflow run with relations', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(mockWorkflowRun as any);

    const result = await getWorkflowRunDetails(1);

    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
    expect(prisma.gitHubWorkflowRun.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          repository: expect.any(Object),
          task: expect.any(Object),
          pullRequest: expect.any(Object),
        }),
      })
    );
  });

  it('should return null for non-existent run', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(null);

    const result = await getWorkflowRunDetails(999);

    expect(result).toBeNull();
  });
});

// =============================================================================
// Rerun Workflow Tests
// =============================================================================

describe('rerunWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if workflow run not found', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(null);

    const result = await rerunWorkflow(999);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Workflow run not found');
  });

  it('should return error if workflow not completed', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue({
      ...mockWorkflowRun,
      status: 'in_progress',
    } as any);

    const result = await rerunWorkflow(1);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Can only re-run completed workflows');
  });

  it('should successfully rerun workflow', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(mockWorkflowRun as any);
    const mockOctokit = {
      actions: {
        reRunWorkflow: vi.fn().mockResolvedValue({}),
      },
    };
    vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

    const result = await rerunWorkflow(1);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Workflow re-run initiated');
    expect(mockOctokit.actions.reRunWorkflow).toHaveBeenCalledWith({
      owner: 'testowner',
      repo: 'testrepo',
      run_id: 12345678,
    });
  });
});

// =============================================================================
// Rerun Failed Jobs Tests
// =============================================================================

describe('rerunFailedJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if workflow run not found', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(null);

    const result = await rerunFailedJobs(999);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Workflow run not found');
  });

  it('should return error if conclusion is not failure', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue({
      ...mockWorkflowRun,
      conclusion: 'success',
    } as any);

    const result = await rerunFailedJobs(1);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Can only re-run failed jobs from failed workflows');
  });

  it('should successfully rerun failed jobs', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue({
      ...mockWorkflowRun,
      conclusion: 'failure',
    } as any);
    const mockOctokit = {
      actions: {
        reRunWorkflowFailedJobs: vi.fn().mockResolvedValue({}),
      },
    };
    vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

    const result = await rerunFailedJobs(1);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Failed jobs re-run initiated');
  });
});

// =============================================================================
// Cancel Workflow Tests
// =============================================================================

describe('cancelWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if workflow run not found', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(null);

    const result = await cancelWorkflow(999);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Workflow run not found');
  });

  it('should return error if workflow already completed', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(mockWorkflowRun as any);

    const result = await cancelWorkflow(1);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Cannot cancel completed workflow');
  });

  it('should successfully cancel running workflow', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue({
      ...mockWorkflowRun,
      status: 'in_progress',
    } as any);
    const mockOctokit = {
      actions: {
        cancelWorkflowRun: vi.fn().mockResolvedValue({}),
      },
    };
    vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

    const result = await cancelWorkflow(1);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Workflow cancelled');
  });
});

// =============================================================================
// Get Workflow Jobs Tests
// =============================================================================

describe('getWorkflowJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array if workflow run not found', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(null);

    const result = await getWorkflowJobs(999);

    expect(result.jobs).toEqual([]);
  });

  it('should return jobs from GitHub API', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findUnique).mockResolvedValue(mockWorkflowRun as any);
    const mockJobs = [
      {
        id: 1001,
        name: 'build',
        status: 'completed',
        conclusion: 'success',
        started_at: '2026-01-09T10:00:00Z',
        completed_at: '2026-01-09T10:03:00Z',
        steps: [
          {
            name: 'Checkout',
            status: 'completed',
            conclusion: 'success',
            number: 1,
            started_at: '2026-01-09T10:00:00Z',
            completed_at: '2026-01-09T10:00:30Z',
          },
        ],
      },
    ];
    const mockOctokit = {
      actions: {
        listJobsForWorkflowRun: vi.fn().mockResolvedValue({ data: { jobs: mockJobs } }),
      },
    };
    vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

    const result = await getWorkflowJobs(1);

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]!.name).toBe('build');
    expect(result.jobs[0]!.steps).toHaveLength(1);
  });
});

// =============================================================================
// Get Workflow Stats Tests
// =============================================================================

describe('getWorkflowStats', () => {
  it('should return workflow statistics', async () => {
    const mockRuns = [
      {
        status: 'completed',
        conclusion: 'success',
        workflowName: 'CI',
        startedAt: new Date(),
        completedAt: new Date(Date.now() + 300000),
      },
      {
        status: 'completed',
        conclusion: 'failure',
        workflowName: 'CI',
        startedAt: new Date(),
        completedAt: new Date(Date.now() + 600000),
      },
      {
        status: 'completed',
        conclusion: 'success',
        workflowName: 'Deploy',
        startedAt: new Date(),
        completedAt: new Date(Date.now() + 120000),
      },
    ];
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue(mockRuns as any);

    const result = await getWorkflowStats(1, 30);

    expect(result.total).toBe(3);
    expect(result.byConclusion).toHaveProperty('success', 2);
    expect(result.byConclusion).toHaveProperty('failure', 1);
    expect(result.byWorkflow).toHaveProperty('CI');
    expect(result.byWorkflow['CI']!.total).toBe(2);
    expect(result.byWorkflow['CI']!.success).toBe(1);
    expect(result.byWorkflow['CI']!.failure).toBe(1);
    expect(result.successRate).toBeCloseTo(66.7, 0);
  });

  it('should return empty stats when no runs', async () => {
    vi.mocked(prisma.gitHubWorkflowRun.findMany).mockResolvedValue([]);

    const result = await getWorkflowStats(1);

    expect(result.total).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.avgDurationMinutes).toBe(0);
  });
});

// =============================================================================
// Process Workflow Run Event Tests
// =============================================================================

describe('processWorkflowRunEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process workflow_run webhook event', async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubWorkflowRun.upsert).mockResolvedValue({ id: 1 } as any);

    const webhookPayload = {
      id: 12345678,
      workflow_id: 987654,
      name: 'CI',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      head_sha: 'abc123',
      head_branch: 'main',
      html_url: 'https://github.com/owner/repo/actions/runs/12345678',
      run_number: 42,
      run_attempt: 1,
      actor: { login: 'testuser' },
      run_started_at: '2026-01-09T10:00:00Z',
      updated_at: '2026-01-09T10:05:00Z',
    };

    await processWorkflowRunEvent(1, 'completed', webhookPayload);

    expect(prisma.gitHubWorkflowRun.upsert).toHaveBeenCalled();
  });

  it('should handle completed event with completedAt', async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gitHubWorkflowRun.upsert).mockResolvedValue({ id: 1 } as any);

    const webhookPayload = {
      id: 12345678,
      workflow_id: 987654,
      name: 'CI',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      head_sha: 'abc123',
      head_branch: 'main',
      html_url: 'https://github.com/owner/repo/actions/runs/12345678',
      run_number: 42,
      run_attempt: 1,
      actor: null,
      run_started_at: '2026-01-09T10:00:00Z',
      updated_at: '2026-01-09T10:05:00Z',
    };

    await processWorkflowRunEvent(1, 'completed', webhookPayload);

    expect(prisma.gitHubWorkflowRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          completedAt: expect.any(Date),
        }),
      })
    );
  });
});
