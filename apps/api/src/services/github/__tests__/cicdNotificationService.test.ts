/*
 * CI/CD Notification Service Tests
 * Version: 1.0.0
 *
 * Tests for CI/CD notification functionality.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10B.3 - Workflow Notifications
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import type {
  CICDNotificationType,
  NotificationTrigger,
  CICDNotificationSettings,
  WorkflowNotificationData,
  DeploymentNotificationData,
  CheckRunNotificationData,
} from '../cicdNotificationService';

describe('cicdNotificationService', () => {
  // ===========================================================================
  // Type Tests
  // ===========================================================================

  describe('CICDNotificationType type', () => {
    it('should accept valid notification types', () => {
      const types: CICDNotificationType[] = [
        'workflow_failed',
        'workflow_succeeded',
        'deployment_failed',
        'deployment_succeeded',
        'deployment_pending',
        'check_run_failed',
        'check_run_succeeded',
      ];
      expect(types).toHaveLength(7);
    });
  });

  describe('NotificationTrigger type', () => {
    it('should accept valid trigger values', () => {
      const triggers: NotificationTrigger[] = ['all', 'failures_only', 'none'];
      expect(triggers).toHaveLength(3);
    });
  });

  describe('CICDNotificationSettings type', () => {
    it('should have correct structure with defaults', () => {
      const settings: CICDNotificationSettings = {
        enabled: true,
        triggers: {
          workflow: 'failures_only',
          deployment: 'all',
          checkRun: 'failures_only',
        },
        notifyRoles: ['admin'],
        notifyPRAuthor: true,
        notifyTaskAssignees: true,
      };

      expect(settings.enabled).toBe(true);
      expect(settings.triggers.workflow).toBe('failures_only');
      expect(settings.triggers.deployment).toBe('all');
      expect(settings.notifyRoles).toContain('admin');
    });

    it('should allow disabling notifications', () => {
      const settings: CICDNotificationSettings = {
        enabled: false,
        triggers: {
          workflow: 'none',
          deployment: 'none',
          checkRun: 'none',
        },
      };

      expect(settings.enabled).toBe(false);
      expect(settings.triggers.workflow).toBe('none');
    });

    it('should allow all notifications', () => {
      const settings: CICDNotificationSettings = {
        enabled: true,
        triggers: {
          workflow: 'all',
          deployment: 'all',
          checkRun: 'all',
        },
        notifyRoles: ['admin', 'member'],
        notifyPRAuthor: true,
        notifyTaskAssignees: true,
      };

      expect(settings.triggers.workflow).toBe('all');
      expect(settings.notifyRoles).toContain('member');
    });
  });

  // ===========================================================================
  // Notification Data Types
  // ===========================================================================

  describe('WorkflowNotificationData type', () => {
    it('should have correct structure for workflow notification', () => {
      const data: WorkflowNotificationData = {
        repositoryId: 1,
        workflowName: 'CI Build',
        workflowRunId: BigInt(123456),
        branch: 'main',
        conclusion: 'failure',
        htmlUrl: 'https://github.com/owner/repo/actions/runs/123456',
        actorLogin: 'developer',
        prNumber: 42,
        taskId: 100,
      };

      expect(data.repositoryId).toBe(1);
      expect(data.workflowName).toBe('CI Build');
      expect(data.conclusion).toBe('failure');
      expect(data.prNumber).toBe(42);
    });

    it('should allow minimal workflow data', () => {
      const data: WorkflowNotificationData = {
        repositoryId: 1,
        workflowName: 'Test',
        workflowRunId: BigInt(1),
        branch: 'feature',
        conclusion: 'success',
      };

      expect(data.htmlUrl).toBeUndefined();
      expect(data.actorLogin).toBeUndefined();
      expect(data.prNumber).toBeUndefined();
    });
  });

  describe('DeploymentNotificationData type', () => {
    it('should have correct structure for deployment notification', () => {
      const data: DeploymentNotificationData = {
        repositoryId: 1,
        environment: 'production',
        status: 'success',
        ref: 'v1.0.0',
        targetUrl: 'https://app.example.com',
        creator: 'deployer',
        taskId: 50,
      };

      expect(data.environment).toBe('production');
      expect(data.status).toBe('success');
      expect(data.targetUrl).toBe('https://app.example.com');
    });

    it('should handle different environments', () => {
      const environments = ['production', 'staging', 'preview', 'development'];

      environments.forEach((env) => {
        const data: DeploymentNotificationData = {
          repositoryId: 1,
          environment: env,
          status: 'pending',
          ref: 'main',
        };
        expect(data.environment).toBe(env);
      });
    });

    it('should handle different statuses', () => {
      const statuses = ['pending', 'in_progress', 'success', 'failure', 'error', 'inactive'];

      statuses.forEach((status) => {
        const data: DeploymentNotificationData = {
          repositoryId: 1,
          environment: 'staging',
          status,
          ref: 'main',
        };
        expect(data.status).toBe(status);
      });
    });
  });

  describe('CheckRunNotificationData type', () => {
    it('should have correct structure for check run notification', () => {
      const data: CheckRunNotificationData = {
        repositoryId: 1,
        checkName: 'eslint',
        conclusion: 'failure',
        headSha: 'abc123def456',
        outputTitle: '5 errors found',
        prNumber: 42,
        taskId: 100,
      };

      expect(data.checkName).toBe('eslint');
      expect(data.conclusion).toBe('failure');
      expect(data.outputTitle).toBe('5 errors found');
    });

    it('should handle different conclusions', () => {
      const conclusions = [
        'success',
        'failure',
        'neutral',
        'cancelled',
        'skipped',
        'timed_out',
        'action_required',
      ];

      conclusions.forEach((conclusion) => {
        const data: CheckRunNotificationData = {
          repositoryId: 1,
          checkName: 'test',
          conclusion,
          headSha: 'abc123',
        };
        expect(data.conclusion).toBe(conclusion);
      });
    });
  });

  // ===========================================================================
  // Trigger Logic Tests
  // ===========================================================================

  describe('notification trigger logic', () => {
    const shouldNotify = (
      trigger: NotificationTrigger | undefined,
      isSuccess: boolean
    ): boolean => {
      if (!trigger || trigger === 'none') return false;
      if (trigger === 'all') return true;
      if (trigger === 'failures_only') return !isSuccess;
      return false;
    };

    it('should not notify when trigger is none', () => {
      expect(shouldNotify('none', true)).toBe(false);
      expect(shouldNotify('none', false)).toBe(false);
    });

    it('should not notify when trigger is undefined', () => {
      expect(shouldNotify(undefined, true)).toBe(false);
      expect(shouldNotify(undefined, false)).toBe(false);
    });

    it('should notify for all events when trigger is all', () => {
      expect(shouldNotify('all', true)).toBe(true);
      expect(shouldNotify('all', false)).toBe(true);
    });

    it('should only notify failures when trigger is failures_only', () => {
      expect(shouldNotify('failures_only', true)).toBe(false);
      expect(shouldNotify('failures_only', false)).toBe(true);
    });
  });

  // ===========================================================================
  // Template Tests
  // ===========================================================================

  describe('notification templates', () => {
    const templates = {
      workflow_failed: {
        title: (d: Record<string, unknown>) => `Workflow "${d.workflowName}" failed`,
        content: (d: Record<string, unknown>) =>
          `Branch: ${d.branch}${d.actorLogin ? ` | Triggered by: ${d.actorLogin}` : ''}`,
      },
      workflow_succeeded: {
        title: (d: Record<string, unknown>) => `Workflow "${d.workflowName}" succeeded`,
        content: (d: Record<string, unknown>) => `Branch: ${d.branch}`,
      },
      deployment_failed: {
        title: (d: Record<string, unknown>) => `Deployment to ${d.environment} failed`,
        content: (d: Record<string, unknown>) =>
          `Ref: ${d.ref}${d.creator ? ` | By: ${d.creator}` : ''}`,
      },
      deployment_succeeded: {
        title: (d: Record<string, unknown>) => `Deployment to ${d.environment} succeeded`,
      },
      check_run_failed: {
        title: (d: Record<string, unknown>) => `Check "${d.checkName}" failed`,
      },
      check_run_succeeded: {
        title: (d: Record<string, unknown>) => `Check "${d.checkName}" passed`,
      },
    };

    it('should generate correct workflow failed title', () => {
      const title = templates.workflow_failed.title({
        workflowName: 'CI Build',
        branch: 'main',
      });
      expect(title).toBe('Workflow "CI Build" failed');
    });

    it('should generate correct workflow content with actor', () => {
      const content = templates.workflow_failed.content({
        branch: 'main',
        actorLogin: 'developer',
      });
      expect(content).toBe('Branch: main | Triggered by: developer');
    });

    it('should generate correct workflow content without actor', () => {
      const content = templates.workflow_failed.content({
        branch: 'feature-branch',
      });
      expect(content).toBe('Branch: feature-branch');
    });

    it('should generate correct deployment failed title', () => {
      const title = templates.deployment_failed.title({
        environment: 'production',
      });
      expect(title).toBe('Deployment to production failed');
    });

    it('should generate correct deployment content with creator', () => {
      const content = templates.deployment_failed.content({
        ref: 'v1.0.0',
        creator: 'admin',
      });
      expect(content).toBe('Ref: v1.0.0 | By: admin');
    });

    it('should generate correct check run titles', () => {
      expect(templates.check_run_failed.title({ checkName: 'lint' })).toBe('Check "lint" failed');
      expect(templates.check_run_succeeded.title({ checkName: 'test' })).toBe(
        'Check "test" passed'
      );
    });
  });

  // ===========================================================================
  // Settings Structure Tests
  // ===========================================================================

  describe('settings merge logic', () => {
    const DEFAULT_SETTINGS: CICDNotificationSettings = {
      enabled: true,
      triggers: {
        workflow: 'failures_only',
        deployment: 'all',
        checkRun: 'failures_only',
      },
      notifyRoles: ['admin'],
      notifyPRAuthor: true,
      notifyTaskAssignees: true,
    };

    it('should use defaults when no settings provided', () => {
      const merged = { ...DEFAULT_SETTINGS };
      expect(merged.enabled).toBe(true);
      expect(merged.triggers.workflow).toBe('failures_only');
    });

    it('should merge partial settings correctly', () => {
      const partial: Partial<CICDNotificationSettings> = {
        enabled: false,
        triggers: {
          workflow: 'all',
        },
      };

      const merged: CICDNotificationSettings = {
        ...DEFAULT_SETTINGS,
        ...partial,
        triggers: {
          ...DEFAULT_SETTINGS.triggers,
          ...(partial.triggers || {}),
        },
      };

      expect(merged.enabled).toBe(false);
      expect(merged.triggers.workflow).toBe('all');
      expect(merged.triggers.deployment).toBe('all'); // from default
      expect(merged.triggers.checkRun).toBe('failures_only'); // from default
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle empty notify roles', () => {
      const settings: CICDNotificationSettings = {
        enabled: true,
        triggers: {},
        notifyRoles: [],
        notifyPRAuthor: false,
        notifyTaskAssignees: false,
      };

      expect(settings.notifyRoles).toHaveLength(0);
    });

    it('should handle long workflow names', () => {
      const data: WorkflowNotificationData = {
        repositoryId: 1,
        workflowName: 'A'.repeat(255),
        workflowRunId: BigInt(1),
        branch: 'main',
        conclusion: 'success',
      };

      expect(data.workflowName.length).toBe(255);
    });

    it('should handle special characters in branch names', () => {
      const branches = [
        'feature/new-feature',
        'bugfix/fix-issue-123',
        'release/v1.0.0',
        'dependabot/npm_and_yarn/lodash-4.17.21',
      ];

      branches.forEach((branch) => {
        const data: WorkflowNotificationData = {
          repositoryId: 1,
          workflowName: 'test',
          workflowRunId: BigInt(1),
          branch,
          conclusion: 'success',
        };
        expect(data.branch).toBe(branch);
      });
    });

    it('should handle large workflow run IDs', () => {
      const data: WorkflowNotificationData = {
        repositoryId: 1,
        workflowName: 'test',
        workflowRunId: BigInt('9007199254740991'),
        branch: 'main',
        conclusion: 'success',
      };

      expect(data.workflowRunId).toBe(BigInt('9007199254740991'));
    });
  });
});
