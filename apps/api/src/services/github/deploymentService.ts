/*
 * Deployment Service
 * Version: 1.0.0
 *
 * Service for tracking and managing GitHub deployments.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10B - Extended CI/CD
 * =============================================================================
 */

import { prisma } from '../../lib/prisma';

// =============================================================================
// Types
// =============================================================================

export type DeploymentStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'success'
  | 'failure'
  | 'error'
  | 'inactive';

export interface DeploymentData {
  repositoryId: number;
  deploymentId: bigint;
  environment: string;
  ref: string;
  sha: string;
  task?: string | null;
  description?: string | null;
  creator?: string | null;
  status: DeploymentStatus;
  targetUrl?: string | null;
}

export interface DeploymentInfo {
  id: number;
  repositoryId: number;
  deploymentId: bigint;
  environment: string;
  ref: string;
  sha: string;
  task: string | null;
  description: string | null;
  creator: string | null;
  status: string;
  targetUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentStats {
  total: number;
  byEnvironment: Record<string, number>;
  byStatus: Record<string, number>;
  recentDeployments: number;
  successRate: number;
}

// =============================================================================
// Deployment CRUD
// =============================================================================

/**
 * Create or update a deployment
 */
export async function upsertDeployment(data: DeploymentData): Promise<DeploymentInfo> {
  const deployment = await prisma.gitHubDeployment.upsert({
    where: {
      repositoryId_deploymentId: {
        repositoryId: data.repositoryId,
        deploymentId: data.deploymentId,
      },
    },
    create: {
      repositoryId: data.repositoryId,
      deploymentId: data.deploymentId,
      environment: data.environment,
      ref: data.ref,
      sha: data.sha,
      task: data.task,
      description: data.description,
      creator: data.creator,
      status: data.status,
      targetUrl: data.targetUrl,
    },
    update: {
      environment: data.environment,
      ref: data.ref,
      sha: data.sha,
      task: data.task,
      description: data.description,
      creator: data.creator,
      status: data.status,
      targetUrl: data.targetUrl,
    },
  });

  return deployment;
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(
  repositoryId: number,
  deploymentId: bigint,
  status: DeploymentStatus,
  targetUrl?: string | null
): Promise<DeploymentInfo | null> {
  try {
    const deployment = await prisma.gitHubDeployment.update({
      where: {
        repositoryId_deploymentId: {
          repositoryId,
          deploymentId,
        },
      },
      data: {
        status,
        targetUrl: targetUrl ?? undefined,
      },
    });
    return deployment;
  } catch {
    return null;
  }
}

/**
 * Get deployment by ID
 */
export async function getDeployment(
  repositoryId: number,
  deploymentId: bigint
): Promise<DeploymentInfo | null> {
  return prisma.gitHubDeployment.findUnique({
    where: {
      repositoryId_deploymentId: {
        repositoryId,
        deploymentId,
      },
    },
  });
}

/**
 * Get deployments for a repository
 */
export async function getRepositoryDeployments(
  repositoryId: number,
  options?: {
    environment?: string;
    status?: DeploymentStatus;
    limit?: number;
    offset?: number;
  }
): Promise<DeploymentInfo[]> {
  const { environment, status, limit = 50, offset = 0 } = options || {};

  return prisma.gitHubDeployment.findMany({
    where: {
      repositoryId,
      ...(environment && { environment }),
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get latest deployment per environment
 */
export async function getLatestDeployments(repositoryId: number): Promise<DeploymentInfo[]> {
  // Get distinct environments
  const environments = await prisma.gitHubDeployment.findMany({
    where: { repositoryId },
    select: { environment: true },
    distinct: ['environment'],
  });

  // Get latest deployment for each environment
  const deployments = await Promise.all(
    environments.map(async ({ environment }) => {
      return prisma.gitHubDeployment.findFirst({
        where: { repositoryId, environment },
        orderBy: { createdAt: 'desc' },
      });
    })
  );

  return deployments.filter((d): d is DeploymentInfo => d !== null);
}

/**
 * Get deployment history for an environment
 */
export async function getEnvironmentHistory(
  repositoryId: number,
  environment: string,
  limit = 20
): Promise<DeploymentInfo[]> {
  return prisma.gitHubDeployment.findMany({
    where: { repositoryId, environment },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get deployment statistics for a repository
 */
export async function getDeploymentStats(repositoryId: number): Promise<DeploymentStats> {
  const deployments = await prisma.gitHubDeployment.findMany({
    where: { repositoryId },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentDeployments = deployments.filter((d) => d.createdAt >= thirtyDaysAgo);

  const byEnvironment: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const deployment of deployments) {
    byEnvironment[deployment.environment] = (byEnvironment[deployment.environment] || 0) + 1;
    byStatus[deployment.status] = (byStatus[deployment.status] || 0) + 1;
  }

  const successCount = recentDeployments.filter((d) => d.status === 'success').length;
  const completedCount = recentDeployments.filter((d) =>
    ['success', 'failure', 'error'].includes(d.status)
  ).length;

  return {
    total: deployments.length,
    byEnvironment,
    byStatus,
    recentDeployments: recentDeployments.length,
    successRate: completedCount > 0 ? (successCount / completedCount) * 100 : 0,
  };
}

// =============================================================================
// Webhook Processing
// =============================================================================

export interface DeploymentWebhookPayload {
  deployment: {
    id: number;
    sha: string;
    ref: string;
    task: string | null;
    environment: string;
    description: string | null;
    creator: {
      login: string;
    } | null;
  };
  repository: {
    id: number;
    full_name: string;
  };
}

export interface DeploymentStatusWebhookPayload {
  deployment: {
    id: number;
  };
  deployment_status: {
    state: DeploymentStatus;
    target_url: string | null;
    description: string | null;
  };
  repository: {
    id: number;
    full_name: string;
  };
}

/**
 * Process deployment webhook event
 */
export async function processDeploymentWebhook(
  payload: DeploymentWebhookPayload
): Promise<DeploymentInfo | null> {
  // Find repository by GitHub repo ID
  const repo = await prisma.gitHubRepository.findFirst({
    where: { repoId: BigInt(payload.repository.id) },
  });

  if (!repo) {
    return null;
  }

  return upsertDeployment({
    repositoryId: repo.id,
    deploymentId: BigInt(payload.deployment.id),
    environment: payload.deployment.environment,
    ref: payload.deployment.ref,
    sha: payload.deployment.sha,
    task: payload.deployment.task,
    description: payload.deployment.description,
    creator: payload.deployment.creator?.login,
    status: 'pending',
  });
}

/**
 * Process deployment_status webhook event
 */
export async function processDeploymentStatusWebhook(
  payload: DeploymentStatusWebhookPayload
): Promise<DeploymentInfo | null> {
  // Find repository by GitHub repo ID
  const repo = await prisma.gitHubRepository.findFirst({
    where: { repoId: BigInt(payload.repository.id) },
  });

  if (!repo) {
    return null;
  }

  return updateDeploymentStatus(
    repo.id,
    BigInt(payload.deployment.id),
    payload.deployment_status.state,
    payload.deployment_status.target_url
  );
}

// =============================================================================
// Service Export
// =============================================================================

export const deploymentService = {
  upsertDeployment,
  updateDeploymentStatus,
  getDeployment,
  getRepositoryDeployments,
  getLatestDeployments,
  getEnvironmentHistory,
  getDeploymentStats,
  processDeploymentWebhook,
  processDeploymentStatusWebhook,
};

export default deploymentService;
