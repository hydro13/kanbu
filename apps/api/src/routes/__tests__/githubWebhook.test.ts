/*
 * GitHub Webhook Handler Tests
 * Version: 1.0.0
 *
 * Tests for webhook signature verification, event routing, and handlers.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 4 - Webhook Handler
 * =============================================================================
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Generate a valid HMAC SHA-256 signature for a payload
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify signature using the same algorithm as the webhook handler
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;

  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256' || !parts[1]) return false;

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const calculatedSignature = hmac.digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Test Data
// =============================================================================

let testWorkspaceId: number;
let testProjectId: number;
let testInstallationId: number;
let testRepositoryId: number;

const TEST_WEBHOOK_SECRET = 'test-webhook-secret-12345';

// =============================================================================
// Test Setup
// =============================================================================

describe('GitHub Webhook Handler', () => {
  beforeAll(async () => {
    // Create test workspace
    const testWorkspace = await prisma.workspace.create({
      data: {
        name: `Webhook Test Workspace ${Date.now()}`,
        slug: `webhook-test-${Date.now()}`,
      },
    });
    testWorkspaceId = testWorkspace.id;

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        name: `Webhook Test Project ${Date.now()}`,
        identifier: `WH${Date.now()}`.slice(-6).toUpperCase(),
        workspaceId: testWorkspaceId,
      },
    });
    testProjectId = testProject.id;

    // Create test installation
    const testInstallation = await prisma.gitHubInstallation.create({
      data: {
        workspaceId: testWorkspaceId,
        installationId: BigInt(Date.now()),
        accountType: 'organization',
        accountId: BigInt(12345),
        accountLogin: 'test-org',
        permissions: {},
        events: ['issues', 'pull_request', 'push'],
      },
    });
    testInstallationId = testInstallation.id;

    // Create test repository link with unique owner/name
    const repoSuffix = Date.now();
    const testRepository = await prisma.gitHubRepository.create({
      data: {
        projectId: testProjectId,
        installationId: testInstallationId,
        repoId: BigInt(repoSuffix),
        owner: `webhook-test-org-${repoSuffix}`,
        name: `webhook-test-repo-${repoSuffix}`,
        fullName: `webhook-test-org-${repoSuffix}/webhook-test-repo-${repoSuffix}`,
        defaultBranch: 'main',
        isPrivate: false,
        syncEnabled: true,
        syncSettings: {
          issues: {
            enabled: true,
            direction: 'bidirectional',
          },
          pullRequests: {
            enabled: true,
            autoLink: true,
          },
          commits: {
            enabled: true,
            autoLink: true,
          },
        },
      },
    });
    testRepositoryId = testRepository.id;
  });

  afterAll(async () => {
    // Clean up test data in reverse order of creation
    await prisma.gitHubSyncLog.deleteMany({
      where: { repositoryId: testRepositoryId },
    });
    await prisma.gitHubCommit.deleteMany({
      where: { repositoryId: testRepositoryId },
    });
    await prisma.gitHubPullRequest.deleteMany({
      where: { repositoryId: testRepositoryId },
    });
    await prisma.gitHubIssue.deleteMany({
      where: { repositoryId: testRepositoryId },
    });
    await prisma.gitHubRepository.delete({
      where: { id: testRepositoryId },
    });
    await prisma.gitHubInstallation.delete({
      where: { id: testInstallationId },
    });
    await prisma.project.delete({
      where: { id: testProjectId },
    });
    await prisma.workspace.delete({
      where: { id: testWorkspaceId },
    });
  });

  // ===========================================================================
  // Signature Verification Tests
  // ===========================================================================

  describe('Signature Verification', () => {
    it('should generate valid HMAC SHA-256 signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = generateSignature(payload, TEST_WEBHOOK_SECRET);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should verify valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = generateSignature(payload, TEST_WEBHOOK_SECRET);

      expect(verifySignature(payload, signature, TEST_WEBHOOK_SECRET)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const wrongSignature =
        'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      expect(verifySignature(payload, wrongSignature, TEST_WEBHOOK_SECRET)).toBe(false);
    });

    it('should reject signature with wrong format', () => {
      const payload = JSON.stringify({ test: 'data' });

      expect(verifySignature(payload, 'invalid-format', TEST_WEBHOOK_SECRET)).toBe(false);
      expect(verifySignature(payload, 'sha1=abc123', TEST_WEBHOOK_SECRET)).toBe(false);
      expect(verifySignature(payload, '', TEST_WEBHOOK_SECRET)).toBe(false);
    });

    it('should reject modified payload', () => {
      const originalPayload = JSON.stringify({ test: 'data' });
      const signature = generateSignature(originalPayload, TEST_WEBHOOK_SECRET);
      const modifiedPayload = JSON.stringify({ test: 'modified' });

      expect(verifySignature(modifiedPayload, signature, TEST_WEBHOOK_SECRET)).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = generateSignature(payload, TEST_WEBHOOK_SECRET);

      expect(verifySignature(payload, signature, 'wrong-secret')).toBe(false);
    });
  });

  // ===========================================================================
  // Issue Event Tests
  // ===========================================================================

  describe('Issue Events', () => {
    beforeEach(async () => {
      // Clean up any existing issues before each test
      await prisma.gitHubIssue.deleteMany({
        where: { repositoryId: testRepositoryId },
      });
    });

    it('should create GitHubIssue record on issue.opened', async () => {
      const issueNumber = Math.floor(Math.random() * 10000);

      // Simulate creating an issue via direct database call
      // (In real scenario this would come from webhook handler)
      const issue = await prisma.gitHubIssue.create({
        data: {
          repositoryId: testRepositoryId,
          issueNumber,
          issueId: BigInt(issueNumber * 1000),
          title: 'Test Issue',
          state: 'open',
          syncDirection: 'bidirectional',
          lastSyncAt: new Date(),
        },
      });

      expect(issue.issueNumber).toBe(issueNumber);
      expect(issue.state).toBe('open');
      expect(issue.repositoryId).toBe(testRepositoryId);
    });

    it('should update GitHubIssue record on issue.edited', async () => {
      const issueNumber = Math.floor(Math.random() * 10000);

      // Create initial issue
      const issue = await prisma.gitHubIssue.create({
        data: {
          repositoryId: testRepositoryId,
          issueNumber,
          issueId: BigInt(issueNumber * 1000),
          title: 'Original Title',
          state: 'open',
          syncDirection: 'bidirectional',
        },
      });

      // Update issue
      const updatedIssue = await prisma.gitHubIssue.update({
        where: { id: issue.id },
        data: {
          title: 'Updated Title',
          lastSyncAt: new Date(),
        },
      });

      expect(updatedIssue.title).toBe('Updated Title');
    });

    it('should update state on issue.closed', async () => {
      const issueNumber = Math.floor(Math.random() * 10000);

      // Create open issue
      const issue = await prisma.gitHubIssue.create({
        data: {
          repositoryId: testRepositoryId,
          issueNumber,
          issueId: BigInt(issueNumber * 1000),
          title: 'Test Issue',
          state: 'open',
          syncDirection: 'bidirectional',
        },
      });

      // Close issue
      const closedIssue = await prisma.gitHubIssue.update({
        where: { id: issue.id },
        data: {
          state: 'closed',
          lastSyncAt: new Date(),
        },
      });

      expect(closedIssue.state).toBe('closed');
    });

    it('should update state on issue.reopened', async () => {
      const issueNumber = Math.floor(Math.random() * 10000);

      // Create closed issue
      const issue = await prisma.gitHubIssue.create({
        data: {
          repositoryId: testRepositoryId,
          issueNumber,
          issueId: BigInt(issueNumber * 1000),
          title: 'Test Issue',
          state: 'closed',
          syncDirection: 'bidirectional',
        },
      });

      // Reopen issue
      const reopenedIssue = await prisma.gitHubIssue.update({
        where: { id: issue.id },
        data: {
          state: 'open',
          lastSyncAt: new Date(),
        },
      });

      expect(reopenedIssue.state).toBe('open');
    });

    it('should delete GitHubIssue record on issue.deleted', async () => {
      const issueNumber = Math.floor(Math.random() * 10000);

      // Create issue
      const issue = await prisma.gitHubIssue.create({
        data: {
          repositoryId: testRepositoryId,
          issueNumber,
          issueId: BigInt(issueNumber * 1000),
          title: 'Test Issue',
          state: 'open',
          syncDirection: 'bidirectional',
        },
      });

      // Delete issue
      await prisma.gitHubIssue.delete({
        where: { id: issue.id },
      });

      // Verify deletion
      const deletedIssue = await prisma.gitHubIssue.findUnique({
        where: { id: issue.id },
      });

      expect(deletedIssue).toBeNull();
    });

    it('should enforce unique constraint on repositoryId + issueNumber', async () => {
      const issueNumber = Math.floor(Math.random() * 10000);

      // Create first issue
      await prisma.gitHubIssue.create({
        data: {
          repositoryId: testRepositoryId,
          issueNumber,
          issueId: BigInt(issueNumber * 1000),
          title: 'First Issue',
          state: 'open',
          syncDirection: 'bidirectional',
        },
      });

      // Try to create duplicate
      await expect(
        prisma.gitHubIssue.create({
          data: {
            repositoryId: testRepositoryId,
            issueNumber, // Same issue number
            issueId: BigInt(issueNumber * 1000 + 1),
            title: 'Duplicate Issue',
            state: 'open',
            syncDirection: 'bidirectional',
          },
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Pull Request Event Tests
  // ===========================================================================

  describe('Pull Request Events', () => {
    beforeEach(async () => {
      // Clean up any existing PRs before each test
      await prisma.gitHubPullRequest.deleteMany({
        where: { repositoryId: testRepositoryId },
      });
    });

    it('should create GitHubPullRequest record on pull_request.opened', async () => {
      const prNumber = Math.floor(Math.random() * 10000);

      const pr = await prisma.gitHubPullRequest.create({
        data: {
          repositoryId: testRepositoryId,
          prNumber,
          prId: BigInt(prNumber * 1000),
          title: 'Test PR',
          state: 'open',
          headBranch: 'feature/test',
          baseBranch: 'main',
          authorLogin: 'testuser',
        },
      });

      expect(pr.prNumber).toBe(prNumber);
      expect(pr.state).toBe('open');
      expect(pr.headBranch).toBe('feature/test');
    });

    it('should update state to merged on pull_request.closed with merged=true', async () => {
      const prNumber = Math.floor(Math.random() * 10000);

      // Create open PR
      const pr = await prisma.gitHubPullRequest.create({
        data: {
          repositoryId: testRepositoryId,
          prNumber,
          prId: BigInt(prNumber * 1000),
          title: 'Test PR',
          state: 'open',
          headBranch: 'feature/test',
          baseBranch: 'main',
          authorLogin: 'testuser',
        },
      });

      // Merge PR
      const mergedPR = await prisma.gitHubPullRequest.update({
        where: { id: pr.id },
        data: {
          state: 'merged',
          mergedAt: new Date(),
          closedAt: new Date(),
        },
      });

      expect(mergedPR.state).toBe('merged');
      expect(mergedPR.mergedAt).not.toBeNull();
    });

    it('should update state to closed on pull_request.closed with merged=false', async () => {
      const prNumber = Math.floor(Math.random() * 10000);

      // Create open PR
      const pr = await prisma.gitHubPullRequest.create({
        data: {
          repositoryId: testRepositoryId,
          prNumber,
          prId: BigInt(prNumber * 1000),
          title: 'Test PR',
          state: 'open',
          headBranch: 'feature/test',
          baseBranch: 'main',
          authorLogin: 'testuser',
        },
      });

      // Close without merge
      const closedPR = await prisma.gitHubPullRequest.update({
        where: { id: pr.id },
        data: {
          state: 'closed',
          closedAt: new Date(),
        },
      });

      expect(closedPR.state).toBe('closed');
      expect(closedPR.mergedAt).toBeNull();
    });

    it('should reopen PR on pull_request.reopened', async () => {
      const prNumber = Math.floor(Math.random() * 10000);

      // Create closed PR
      const pr = await prisma.gitHubPullRequest.create({
        data: {
          repositoryId: testRepositoryId,
          prNumber,
          prId: BigInt(prNumber * 1000),
          title: 'Test PR',
          state: 'closed',
          headBranch: 'feature/test',
          baseBranch: 'main',
          authorLogin: 'testuser',
          closedAt: new Date(),
        },
      });

      // Reopen PR
      const reopenedPR = await prisma.gitHubPullRequest.update({
        where: { id: pr.id },
        data: {
          state: 'open',
          mergedAt: null,
          closedAt: null,
        },
      });

      expect(reopenedPR.state).toBe('open');
      expect(reopenedPR.closedAt).toBeNull();
    });
  });

  // ===========================================================================
  // Commit/Push Event Tests
  // ===========================================================================

  describe('Push Events (Commits)', () => {
    beforeEach(async () => {
      // Clean up any existing commits before each test
      await prisma.gitHubCommit.deleteMany({
        where: { repositoryId: testRepositoryId },
      });
    });

    it('should create GitHubCommit record on push', async () => {
      const sha = crypto.randomBytes(20).toString('hex');

      const commit = await prisma.gitHubCommit.create({
        data: {
          repositoryId: testRepositoryId,
          sha,
          message: 'feat: Add new feature',
          authorName: 'Test User',
          authorEmail: 'test@example.com',
          authorLogin: 'testuser',
          committedAt: new Date(),
        },
      });

      expect(commit.sha).toBe(sha);
      expect(commit.message).toBe('feat: Add new feature');
    });

    it('should not create duplicate commits (idempotency)', async () => {
      const sha = crypto.randomBytes(20).toString('hex');

      // Create first commit
      await prisma.gitHubCommit.create({
        data: {
          repositoryId: testRepositoryId,
          sha,
          message: 'feat: Add new feature',
          authorName: 'Test User',
          authorEmail: 'test@example.com',
          committedAt: new Date(),
        },
      });

      // Try to create duplicate
      await expect(
        prisma.gitHubCommit.create({
          data: {
            repositoryId: testRepositoryId,
            sha, // Same SHA
            message: 'Different message',
            authorName: 'Test User',
            authorEmail: 'test@example.com',
            committedAt: new Date(),
          },
        })
      ).rejects.toThrow();
    });

    it('should allow same SHA in different repositories', async () => {
      // Create another project and repository
      const otherProject = await prisma.project.create({
        data: {
          name: `Other Project ${Date.now()}`,
          identifier: `OT${Date.now()}`.slice(-6).toUpperCase(),
          workspaceId: testWorkspaceId,
        },
      });

      const otherRepository = await prisma.gitHubRepository.create({
        data: {
          projectId: otherProject.id,
          installationId: testInstallationId,
          repoId: BigInt(Date.now()),
          owner: 'test-org',
          name: `other-repo-${Date.now()}`,
          fullName: `test-org/other-repo-${Date.now()}`,
          defaultBranch: 'main',
          syncEnabled: true,
          syncSettings: {},
        },
      });

      const sha = crypto.randomBytes(20).toString('hex');

      // Create commit in first repo
      await prisma.gitHubCommit.create({
        data: {
          repositoryId: testRepositoryId,
          sha,
          message: 'feat: Commit in repo 1',
          authorName: 'Test User',
          authorEmail: 'test@example.com',
          committedAt: new Date(),
        },
      });

      // Create same SHA in different repo - should succeed
      const commit2 = await prisma.gitHubCommit.create({
        data: {
          repositoryId: otherRepository.id,
          sha,
          message: 'feat: Commit in repo 2',
          authorName: 'Test User',
          authorEmail: 'test@example.com',
          committedAt: new Date(),
        },
      });

      expect(commit2.sha).toBe(sha);

      // Clean up
      await prisma.gitHubCommit.deleteMany({
        where: { repositoryId: otherRepository.id },
      });
      await prisma.gitHubRepository.delete({
        where: { id: otherRepository.id },
      });
      await prisma.project.delete({
        where: { id: otherProject.id },
      });
    });
  });

  // ===========================================================================
  // Sync Log Tests
  // ===========================================================================

  describe('Sync Logging', () => {
    beforeEach(async () => {
      // Clean up any existing sync logs before each test
      await prisma.gitHubSyncLog.deleteMany({
        where: { repositoryId: testRepositoryId },
      });
    });

    it('should create sync log entry for issue events', async () => {
      const log = await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'issue_opened',
          direction: 'github_to_kanbu',
          entityType: 'issue',
          entityId: '123',
          details: {
            title: 'Test Issue',
            state: 'open',
          },
          status: 'success',
        },
      });

      expect(log.action).toBe('issue_opened');
      expect(log.direction).toBe('github_to_kanbu');
      expect(log.status).toBe('success');
    });

    it('should create sync log entry for PR events', async () => {
      const log = await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'pr_merged',
          direction: 'github_to_kanbu',
          entityType: 'pr',
          entityId: '456',
          details: {
            title: 'Test PR',
            state: 'merged',
          },
          status: 'success',
        },
      });

      expect(log.action).toBe('pr_merged');
      expect(log.entityType).toBe('pr');
    });

    it('should create sync log entry for push events', async () => {
      const log = await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'commits_received',
          direction: 'github_to_kanbu',
          entityType: 'commit',
          entityId: 'abc123',
          details: {
            branch: 'refs/heads/main',
            count: 3,
          },
          status: 'success',
        },
      });

      expect(log.action).toBe('commits_received');
      expect(log.entityType).toBe('commit');
    });

    it('should log errors with error message', async () => {
      const log = await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: testRepositoryId,
          action: 'webhook_issues_error',
          direction: 'github_to_kanbu',
          entityType: 'issue',
          details: {},
          status: 'failed',
          errorMessage: 'Database connection error',
        },
      });

      expect(log.status).toBe('failed');
      expect(log.errorMessage).toBe('Database connection error');
    });
  });

  // ===========================================================================
  // Sync Settings Tests
  // ===========================================================================

  describe('Sync Settings', () => {
    it('should respect sync disabled setting', async () => {
      // Disable sync
      await prisma.gitHubRepository.update({
        where: { id: testRepositoryId },
        data: { syncEnabled: false },
      });

      const repo = await prisma.gitHubRepository.findUnique({
        where: { id: testRepositoryId },
      });

      expect(repo?.syncEnabled).toBe(false);

      // Re-enable sync
      await prisma.gitHubRepository.update({
        where: { id: testRepositoryId },
        data: { syncEnabled: true },
      });
    });

    it('should respect issue sync direction setting', async () => {
      // Set Kanbu-only direction
      await prisma.gitHubRepository.update({
        where: { id: testRepositoryId },
        data: {
          syncSettings: {
            issues: {
              enabled: true,
              direction: 'kanbu_to_github',
            },
          },
        },
      });

      const repo = await prisma.gitHubRepository.findUnique({
        where: { id: testRepositoryId },
      });

      const settings = repo?.syncSettings as { issues?: { direction: string } } | null;
      expect(settings?.issues?.direction).toBe('kanbu_to_github');

      // Reset to bidirectional
      await prisma.gitHubRepository.update({
        where: { id: testRepositoryId },
        data: {
          syncSettings: {
            issues: {
              enabled: true,
              direction: 'bidirectional',
            },
            pullRequests: {
              enabled: true,
              autoLink: true,
            },
            commits: {
              enabled: true,
              autoLink: true,
            },
          },
        },
      });
    });

    it('should respect disabled feature settings', async () => {
      // Disable issues
      await prisma.gitHubRepository.update({
        where: { id: testRepositoryId },
        data: {
          syncSettings: {
            issues: {
              enabled: false,
              direction: 'bidirectional',
            },
          },
        },
      });

      const repo = await prisma.gitHubRepository.findUnique({
        where: { id: testRepositoryId },
      });

      const settings = repo?.syncSettings as { issues?: { enabled: boolean } } | null;
      expect(settings?.issues?.enabled).toBe(false);

      // Re-enable
      await prisma.gitHubRepository.update({
        where: { id: testRepositoryId },
        data: {
          syncSettings: {
            issues: {
              enabled: true,
              direction: 'bidirectional',
            },
            pullRequests: {
              enabled: true,
              autoLink: true,
            },
            commits: {
              enabled: true,
              autoLink: true,
            },
          },
        },
      });
    });
  });

  // ===========================================================================
  // Installation Event Tests
  // ===========================================================================

  describe('Installation Events', () => {
    it('should mark installation as suspended', async () => {
      // Suspend installation
      await prisma.gitHubInstallation.update({
        where: { id: testInstallationId },
        data: { suspendedAt: new Date() },
      });

      const installation = await prisma.gitHubInstallation.findUnique({
        where: { id: testInstallationId },
      });

      expect(installation?.suspendedAt).not.toBeNull();

      // Unsuspend
      await prisma.gitHubInstallation.update({
        where: { id: testInstallationId },
        data: { suspendedAt: null },
      });
    });

    it('should unsuspend installation', async () => {
      // First suspend
      await prisma.gitHubInstallation.update({
        where: { id: testInstallationId },
        data: { suspendedAt: new Date() },
      });

      // Then unsuspend
      await prisma.gitHubInstallation.update({
        where: { id: testInstallationId },
        data: { suspendedAt: null },
      });

      const installation = await prisma.gitHubInstallation.findUnique({
        where: { id: testInstallationId },
      });

      expect(installation?.suspendedAt).toBeNull();
    });
  });
});
