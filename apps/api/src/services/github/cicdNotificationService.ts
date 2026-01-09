/*
 * CI/CD Notification Service
 * Version: 1.0.0
 *
 * Service for sending notifications on CI/CD events.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10B.3 - Workflow Notifications
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'
import {
  createNotification,
  type NotificationData,
} from '../../lib/notificationService'

// =============================================================================
// Types
// =============================================================================

export type CICDNotificationType =
  | 'workflow_failed'
  | 'workflow_succeeded'
  | 'deployment_failed'
  | 'deployment_succeeded'
  | 'deployment_pending'
  | 'check_run_failed'
  | 'check_run_succeeded'

export type NotificationTrigger = 'all' | 'failures_only' | 'none'

export interface CICDNotificationSettings {
  enabled: boolean
  triggers: {
    workflow?: NotificationTrigger
    deployment?: NotificationTrigger
    checkRun?: NotificationTrigger
  }
  notifyRoles?: ('admin' | 'member')[]
  notifyPRAuthor?: boolean
  notifyTaskAssignees?: boolean
}

export interface WorkflowNotificationData {
  repositoryId: number
  workflowName: string
  workflowRunId: bigint
  branch: string
  conclusion: string
  htmlUrl?: string
  actorLogin?: string
  prNumber?: number
  taskId?: number
}

export interface DeploymentNotificationData {
  repositoryId: number
  environment: string
  status: string
  ref: string
  targetUrl?: string
  creator?: string
  taskId?: number
}

export interface CheckRunNotificationData {
  repositoryId: number
  checkName: string
  conclusion: string
  headSha: string
  outputTitle?: string
  prNumber?: number
  taskId?: number
}

// =============================================================================
// Default Settings
// =============================================================================

const DEFAULT_CICD_SETTINGS: CICDNotificationSettings = {
  enabled: true,
  triggers: {
    workflow: 'failures_only',
    deployment: 'all',
    checkRun: 'failures_only',
  },
  notifyRoles: ['admin'],
  notifyPRAuthor: true,
  notifyTaskAssignees: true,
}

// =============================================================================
// Notification Templates
// =============================================================================

const TEMPLATES: Record<CICDNotificationType, {
  title: (data: Record<string, unknown>) => string
  content?: (data: Record<string, unknown>) => string | undefined
}> = {
  workflow_failed: {
    title: (d) => `Workflow "${d.workflowName}" failed`,
    content: (d) => `Branch: ${d.branch}${d.actorLogin ? ` | Triggered by: ${d.actorLogin}` : ''}`,
  },
  workflow_succeeded: {
    title: (d) => `Workflow "${d.workflowName}" succeeded`,
    content: (d) => `Branch: ${d.branch}`,
  },
  deployment_failed: {
    title: (d) => `Deployment to ${d.environment} failed`,
    content: (d) => `Ref: ${d.ref}${d.creator ? ` | By: ${d.creator}` : ''}`,
  },
  deployment_succeeded: {
    title: (d) => `Deployment to ${d.environment} succeeded`,
    content: (d) => d.targetUrl ? `View: ${d.targetUrl}` : `Ref: ${d.ref}`,
  },
  deployment_pending: {
    title: (d) => `Deployment to ${d.environment} started`,
    content: (d) => `Ref: ${d.ref}`,
  },
  check_run_failed: {
    title: (d) => `Check "${d.checkName}" failed`,
    content: (d) => d.outputTitle as string | undefined,
  },
  check_run_succeeded: {
    title: (d) => `Check "${d.checkName}" passed`,
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get CI/CD notification settings for a repository
 */
export async function getCICDSettings(
  repositoryId: number
): Promise<CICDNotificationSettings> {
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: repositoryId },
    select: { syncSettings: true },
  })

  if (!repo?.syncSettings) {
    return DEFAULT_CICD_SETTINGS
  }

  const settings = repo.syncSettings as Record<string, unknown>
  const cicdSettings = settings.notifications as CICDNotificationSettings | undefined

  return {
    ...DEFAULT_CICD_SETTINGS,
    ...cicdSettings,
    triggers: {
      ...DEFAULT_CICD_SETTINGS.triggers,
      ...(cicdSettings?.triggers || {}),
    },
  }
}

/**
 * Update CI/CD notification settings for a repository
 */
export async function updateCICDSettings(
  repositoryId: number,
  settings: Partial<CICDNotificationSettings>
): Promise<CICDNotificationSettings> {
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: repositoryId },
    select: { syncSettings: true },
  })

  const currentSettings = (repo?.syncSettings as Record<string, unknown>) || {}
  const currentCICD = (currentSettings.notifications as CICDNotificationSettings) || DEFAULT_CICD_SETTINGS

  const newCICDSettings: CICDNotificationSettings = {
    ...currentCICD,
    ...settings,
    triggers: {
      ...currentCICD.triggers,
      ...(settings.triggers || {}),
    },
  }

  await prisma.gitHubRepository.update({
    where: { id: repositoryId },
    data: {
      syncSettings: {
        ...currentSettings,
        notifications: newCICDSettings,
      },
    },
  })

  return newCICDSettings
}

/**
 * Get users to notify for a repository
 */
async function getUsersToNotify(
  repositoryId: number,
  settings: CICDNotificationSettings,
  context?: {
    prAuthorLogin?: string
    taskId?: number
  }
): Promise<number[]> {
  const userIds = new Set<number>()

  // Get repository with project info
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: repositoryId },
    include: {
      project: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!repo?.project) {
    return []
  }

  const projectId = repo.project.id
  const workspaceId = repo.project.workspaceId

  // Get project members based on roles
  if (settings.notifyRoles && settings.notifyRoles.length > 0) {
    // Get workspace members who have access to this project
    // For simplicity, we get users with ACL access to the project
    const projectAcls = await prisma.acl.findMany({
      where: {
        resourceType: 'project',
        resourceId: projectId,
        principalType: 'user',
        permissions: { gte: 1 }, // At least read permission
      },
      select: { principalId: true },
    })

    for (const acl of projectAcls) {
      userIds.add(acl.principalId)
    }

    // Also get workspace admins if 'admin' is in notifyRoles
    if (settings.notifyRoles.includes('admin')) {
      const workspaceAdminGroup = await prisma.group.findFirst({
        where: {
          workspaceId,
          type: 'WORKSPACE_ADMIN',
        },
        include: {
          members: {
            select: { userId: true },
          },
        },
      })

      if (workspaceAdminGroup) {
        for (const member of workspaceAdminGroup.members) {
          userIds.add(member.userId)
        }
      }
    }
  }

  // Notify PR author
  if (settings.notifyPRAuthor && context?.prAuthorLogin) {
    const userMapping = await prisma.gitHubUserMapping.findFirst({
      where: {
        workspaceId,
        githubLogin: context.prAuthorLogin,
      },
      select: { userId: true },
    })

    if (userMapping) {
      userIds.add(userMapping.userId)
    }
  }

  // Notify task assignees
  if (settings.notifyTaskAssignees && context?.taskId) {
    const taskAssignees = await prisma.taskAssignee.findMany({
      where: { taskId: context.taskId },
      select: { userId: true },
    })

    for (const assignee of taskAssignees) {
      userIds.add(assignee.userId)
    }
  }

  // Filter out users who have disabled this notification type
  const enabledUserIds: number[] = []
  for (const userId of userIds) {
    const setting = await prisma.userNotificationSetting.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType: 'cicd',
        },
      },
    })

    // If no setting exists or isEnabled is true, include the user
    if (!setting || setting.isEnabled) {
      enabledUserIds.push(userId)
    }
  }

  return enabledUserIds
}

/**
 * Check if notification should be sent based on trigger settings
 */
function shouldNotify(
  trigger: NotificationTrigger | undefined,
  isSuccess: boolean
): boolean {
  if (!trigger || trigger === 'none') return false
  if (trigger === 'all') return true
  if (trigger === 'failures_only') return !isSuccess
  return false
}

// =============================================================================
// Notification Functions
// =============================================================================

/**
 * Send workflow run notification
 */
export async function notifyWorkflowRun(
  data: WorkflowNotificationData
): Promise<number> {
  const settings = await getCICDSettings(data.repositoryId)

  if (!settings.enabled) return 0

  const isSuccess = data.conclusion === 'success'
  if (!shouldNotify(settings.triggers.workflow, isSuccess)) return 0

  const type: CICDNotificationType = isSuccess ? 'workflow_succeeded' : 'workflow_failed'
  const template = TEMPLATES[type]

  // Get PR author if we have a PR number
  let prAuthorLogin: string | undefined
  if (data.prNumber) {
    const pr = await prisma.gitHubPullRequest.findFirst({
      where: {
        repositoryId: data.repositoryId,
        prNumber: data.prNumber,
      },
      select: { authorLogin: true },
    })
    prAuthorLogin = pr?.authorLogin
  }

  const userIds = await getUsersToNotify(data.repositoryId, settings, {
    prAuthorLogin,
    taskId: data.taskId,
  })

  if (userIds.length === 0) return 0

  // Get project info for link
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: data.repositoryId },
    select: { projectId: true },
  })

  const notificationData: NotificationData = {
    projectId: repo?.projectId,
    link: data.htmlUrl || (repo?.projectId ? `/projects/${repo.projectId}/cicd` : undefined),
    workflowName: data.workflowName,
    branch: data.branch,
    conclusion: data.conclusion,
  }

  // Create notifications for all users
  let count = 0
  for (const userId of userIds) {
    await createNotification(prisma, {
      userId,
      type: type,
      title: template.title(data as unknown as Record<string, unknown>),
      content: template.content?.(data as unknown as Record<string, unknown>),
      data: notificationData,
    })
    count++
  }

  return count
}

/**
 * Send deployment notification
 */
export async function notifyDeployment(
  data: DeploymentNotificationData
): Promise<number> {
  const settings = await getCICDSettings(data.repositoryId)

  if (!settings.enabled) return 0

  const isSuccess = data.status === 'success'
  const isPending = data.status === 'pending' || data.status === 'in_progress'
  const isFailed = ['failure', 'error'].includes(data.status)

  // Determine notification type
  let type: CICDNotificationType
  if (isSuccess) {
    type = 'deployment_succeeded'
  } else if (isFailed) {
    type = 'deployment_failed'
  } else if (isPending) {
    type = 'deployment_pending'
  } else {
    return 0 // Unknown status, don't notify
  }

  // Check if we should notify based on trigger settings
  if (!shouldNotify(settings.triggers.deployment, isSuccess)) {
    // Exception: always notify on pending if 'all' is set
    if (!(isPending && settings.triggers.deployment === 'all')) {
      return 0
    }
  }

  const template = TEMPLATES[type]

  const userIds = await getUsersToNotify(data.repositoryId, settings, {
    taskId: data.taskId,
  })

  if (userIds.length === 0) return 0

  // Get project info for link
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: data.repositoryId },
    select: { projectId: true },
  })

  const notificationData: NotificationData = {
    projectId: repo?.projectId,
    link: data.targetUrl || (repo?.projectId ? `/projects/${repo.projectId}/cicd` : undefined),
    environment: data.environment,
    status: data.status,
  }

  // Create notifications for all users
  let count = 0
  for (const userId of userIds) {
    await createNotification(prisma, {
      userId,
      type: type,
      title: template.title(data as unknown as Record<string, unknown>),
      content: template.content?.(data as unknown as Record<string, unknown>),
      data: notificationData,
    })
    count++
  }

  return count
}

/**
 * Send check run notification
 */
export async function notifyCheckRun(
  data: CheckRunNotificationData
): Promise<number> {
  const settings = await getCICDSettings(data.repositoryId)

  if (!settings.enabled) return 0

  const isSuccess = data.conclusion === 'success'
  if (!shouldNotify(settings.triggers.checkRun, isSuccess)) return 0

  const type: CICDNotificationType = isSuccess ? 'check_run_succeeded' : 'check_run_failed'
  const template = TEMPLATES[type]

  // Get PR author if we have a PR number
  let prAuthorLogin: string | undefined
  if (data.prNumber) {
    const pr = await prisma.gitHubPullRequest.findFirst({
      where: {
        repositoryId: data.repositoryId,
        prNumber: data.prNumber,
      },
      select: { authorLogin: true },
    })
    prAuthorLogin = pr?.authorLogin
  }

  const userIds = await getUsersToNotify(data.repositoryId, settings, {
    prAuthorLogin,
    taskId: data.taskId,
  })

  if (userIds.length === 0) return 0

  // Get project info for link
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: data.repositoryId },
    select: { projectId: true },
  })

  const notificationData: NotificationData = {
    projectId: repo?.projectId,
    link: repo?.projectId ? `/projects/${repo.projectId}/cicd` : undefined,
    checkName: data.checkName,
    conclusion: data.conclusion,
  }

  // Create notifications for all users
  let count = 0
  for (const userId of userIds) {
    await createNotification(prisma, {
      userId,
      type: type,
      title: template.title(data as unknown as Record<string, unknown>),
      content: template.content?.(data as unknown as Record<string, unknown>),
      data: notificationData,
    })
    count++
  }

  return count
}

// =============================================================================
// Service Export
// =============================================================================

export const cicdNotificationService = {
  getCICDSettings,
  updateCICDSettings,
  notifyWorkflowRun,
  notifyDeployment,
  notifyCheckRun,
}

export default cicdNotificationService
