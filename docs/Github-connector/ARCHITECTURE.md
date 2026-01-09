# Kanbu GitHub Connector - Architectuur

## Overzicht

Dit document beschrijft de technische architectuur van de Kanbu GitHub Connector.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              KANBU                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Web App   │  │   tRPC API  │  │  MCP Server │  │   Workers   │    │
│  │  (React)    │  │  (Fastify)  │  │  (Claude)   │  │  (Queues)   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┼────────────────┴────────────────┘            │
│                          │                                              │
│                   ┌──────┴──────┐                                       │
│                   │   GitHub    │                                       │
│                   │   Service   │                                       │
│                   └──────┬──────┘                                       │
│                          │                                              │
│  ┌───────────────────────┴───────────────────────┐                     │
│  │                    Database                    │                     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ │                     │
│  │  │ Installs   │ │   Repos    │ │  Sync Log  │ │                     │
│  │  └────────────┘ └────────────┘ └────────────┘ │                     │
│  └───────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / Webhooks
                                    │
┌───────────────────────────────────┴───────────────────────────────────┐
│                            GITHUB                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │  GitHub App │  │   REST API  │  │  Webhooks   │                    │
│  │ Installation│  │   v3/v4    │  │             │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. GitHub App vs OAuth App

We gebruiken een **GitHub App** (niet een OAuth App) om de volgende redenen:

| Aspect | GitHub App | OAuth App |
|--------|------------|-----------|
| Permissions | Fine-grained, per-resource | Broad, user-level |
| Rate limits | 5000/hour (higher) | 5000/hour (shared with user) |
| Installation | Org/user install once | Per-user auth |
| Webhooks | App-level, automatic | Manual per-repo |
| Token lifetime | 1 hour (renewable) | Long-lived |

### GitHub App Configuratie

```yaml
name: Kanbu
description: Bidirectional issue sync with Kanbu project management

# Permissions
permissions:
  issues: write
  pull_requests: read
  contents: read
  metadata: read

# Webhook events
default_events:
  - issues
  - issue_comment
  - pull_request
  - push

# URLs
webhook_url: https://kanbu.example.com/api/webhooks/github
callback_url: https://kanbu.example.com/api/github/callback
setup_url: https://kanbu.example.com/api/github/setup
```

---

## 2. Authenticatie Flow

### 2.1 Installation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │  Kanbu   │     │  GitHub  │     │  Kanbu   │
│ Browser  │     │  Web     │     │          │     │  API     │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Click "Connect │                │                │
     │ to GitHub"     │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ Generate state │                │
     │                │ + redirect URL │                │
     │<───────────────│                │                │
     │                │                │                │
     │ Redirect to    │                │                │
     │ GitHub install │                │                │
     │────────────────────────────────>│                │
     │                │                │                │
     │                │  User authorizes               │
     │                │  installation  │                │
     │<────────────────────────────────│                │
     │ Callback with  │                │                │
     │ installation_id│                │                │
     │───────────────────────────────────────────────>│
     │                │                │                │
     │                │                │  Store install │
     │                │                │  + get token   │
     │<───────────────────────────────────────────────│
     │ Redirect to    │                │                │
     │ settings page  │                │                │
     │                │                │                │
```

### 2.2 Token Refresh

Installation access tokens verlopen na 1 uur. Refresh flow:

```typescript
async function getInstallationToken(installationId: number): Promise<string> {
  const installation = await db.gitHubInstallation.findUnique({
    where: { installationId }
  })

  // Check if token is still valid (with 5 min buffer)
  if (installation.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(installation.accessToken)
  }

  // Generate new token using App JWT
  const jwt = generateAppJWT()
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json'
      }
    }
  )

  const { token, expires_at } = await response.json()

  // Store encrypted token
  await db.gitHubInstallation.update({
    where: { installationId },
    data: {
      accessToken: encrypt(token),
      tokenExpiresAt: new Date(expires_at)
    }
  })

  return token
}
```

---

## 3. Webhook Processing

### 3.1 Webhook Security

```typescript
// apps/api/src/routes/webhooks/github.ts

import crypto from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

app.post('/api/webhooks/github', async (req, reply) => {
  const signature = req.headers['x-hub-signature-256'] as string
  const event = req.headers['x-github-event'] as string
  const deliveryId = req.headers['x-github-delivery'] as string

  // Get repository from payload
  const { repository } = req.body
  const repo = await db.gitHubRepository.findUnique({
    where: { fullName: repository.full_name }
  })

  if (!repo) {
    return reply.code(404).send({ error: 'Repository not configured' })
  }

  // Verify signature
  if (!verifyWebhookSignature(req.rawBody, signature, repo.webhookSecret)) {
    return reply.code(401).send({ error: 'Invalid signature' })
  }

  // Check idempotency
  const existing = await db.gitHubSyncLog.findFirst({
    where: { details: { path: ['delivery_id'], equals: deliveryId } }
  })
  if (existing) {
    return reply.code(200).send({ status: 'already_processed' })
  }

  // Route to handler
  await routeWebhookEvent(event, req.body, repo)

  return reply.code(200).send({ status: 'ok' })
})
```

### 3.2 Event Routing

```typescript
// apps/api/src/services/github/webhookRouter.ts

type WebhookHandler = (payload: any, repo: GitHubRepository) => Promise<void>

const handlers: Record<string, Record<string, WebhookHandler>> = {
  issues: {
    opened: handleIssueOpened,
    edited: handleIssueEdited,
    closed: handleIssueClosed,
    reopened: handleIssueReopened,
    labeled: handleIssueLabeled,
    unlabeled: handleIssueUnlabeled,
  },
  pull_request: {
    opened: handlePROpened,
    closed: handlePRClosed,
    merged: handlePRMerged,
  },
  push: {
    default: handlePush,
  },
}

async function routeWebhookEvent(
  event: string,
  payload: any,
  repo: GitHubRepository
): Promise<void> {
  const action = payload.action || 'default'
  const handler = handlers[event]?.[action]

  if (!handler) {
    console.log(`No handler for ${event}.${action}`)
    return
  }

  await handler(payload, repo)
}
```

---

## 4. Issue Synchronisatie

### 4.1 Sync Hash

Om te bepalen of een update nodig is, gebruiken we een hash van de relevante velden:

```typescript
function computeIssueHash(issue: GitHubIssuePayload): string {
  const data = {
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels.map(l => l.name).sort(),
    assignees: issue.assignees.map(a => a.login).sort(),
    milestone: issue.milestone?.title || null,
  }
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

function computeTaskHash(task: Task): string {
  const data = {
    title: task.title,
    body: task.description,
    state: task.columnId, // Map column to state
    labels: task.tags.map(t => t.name).sort(),
    assignees: task.assignees.map(a => a.email).sort(),
    milestone: task.milestone?.name || null,
  }
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}
```

### 4.2 Conflict Resolution

Bij bidirectionele sync kunnen conflicts ontstaan:

```typescript
type SyncDirection = 'github_to_kanbu' | 'kanbu_to_github' | 'skip'

function resolveConflict(
  githubIssue: GitHubIssue,
  task: Task,
  settings: SyncSettings
): SyncDirection {
  // If only one side changed, sync from that side
  const githubChanged = githubIssue.updatedAt > githubIssue.lastSyncAt
  const taskChanged = task.updatedAt > githubIssue.lastSyncAt

  if (githubChanged && !taskChanged) return 'github_to_kanbu'
  if (taskChanged && !githubChanged) return 'kanbu_to_github'

  // Both changed - use configured strategy
  switch (settings.issueSync.conflictStrategy) {
    case 'github_wins':
      return 'github_to_kanbu'
    case 'kanbu_wins':
      return 'kanbu_to_github'
    case 'newest_wins':
      return githubIssue.updatedAt > task.updatedAt
        ? 'github_to_kanbu'
        : 'kanbu_to_github'
    case 'skip':
    default:
      return 'skip'
  }
}
```

### 4.3 Field Mapping

```typescript
// GitHub Issue → Kanbu Task
const issueToTask: FieldMapping = {
  title: 'title',
  body: 'description',
  state: {
    transform: (state: string, repo: GitHubRepository) => {
      // Map state to column ID based on settings
      return state === 'open'
        ? repo.syncSettings.mapping.openColumnId
        : repo.syncSettings.mapping.closedColumnId
    }
  },
  labels: {
    transform: (labels: Label[], repo: GitHubRepository) => {
      // Map GitHub labels to Kanbu tags
      return labels
        .map(l => repo.syncSettings.labelMapping[l.name])
        .filter(Boolean)
    }
  },
  assignees: {
    transform: async (assignees: User[], projectId: number) => {
      // Map GitHub logins to Kanbu user IDs
      const mappings = await db.gitHubUserMapping.findMany({
        where: {
          projectId,
          githubLogin: { in: assignees.map(a => a.login) }
        }
      })
      return mappings.map(m => m.userId)
    }
  }
}
```

---

## 5. ACL Integratie

### 5.1 Permission Checks

```typescript
// apps/api/src/trpc/procedures/github.ts

import { checkProjectPermission } from '@/services/permissionService'

export const githubRouter = router({
  // View linked repository (requires R)
  getLinkedRepository: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await checkProjectPermission(ctx.user.id, input.projectId, 'R')
      return db.gitHubRepository.findUnique({
        where: { projectId: input.projectId }
      })
    }),

  // Link repository (requires P)
  linkRepository: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      installationId: z.number(),
      repoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkProjectPermission(ctx.user.id, input.projectId, 'P')

      // ... link logic
    }),

  // Trigger sync (requires W)
  triggerSync: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await checkProjectPermission(ctx.user.id, input.projectId, 'W')

      // ... sync logic
    }),
})
```

### 5.2 Feature Visibility

```typescript
// apps/api/src/permissions/definitions/index.ts

export const PROJECT_FEATURES: FeatureDefinition[] = [
  // ... existing features ...
  {
    slug: 'github',
    name: 'GitHub Integration',
    description: 'Link project to GitHub repository for issue sync',
    permissions: ['R', 'W', 'P'],
    defaultVisibility: {
      OWNER: true,
      MANAGER: true,
      MEMBER: false,  // Members can't see GitHub settings by default
      VIEWER: false,
    },
    requiredPermission: 'R',  // Minimum to see in sidebar
  },
]
```

### 5.3 Audit Logging

```typescript
// apps/api/src/services/auditService.ts

export const GITHUB_AUDIT_ACTIONS = {
  REPO_LINKED: 'github:repo_linked',
  REPO_UNLINKED: 'github:repo_unlinked',
  SETTINGS_UPDATED: 'github:settings_updated',
  SYNC_TRIGGERED: 'github:sync_triggered',
  ISSUE_IMPORTED: 'github:issue_imported',
  ISSUE_EXPORTED: 'github:issue_exported',
  PR_LINKED: 'github:pr_linked',
  BRANCH_CREATED: 'github:branch_created',
}

// Example usage
await auditLog({
  action: GITHUB_AUDIT_ACTIONS.REPO_LINKED,
  category: 'INTEGRATION',
  userId: ctx.user.id,
  workspaceId: project.workspaceId,
  projectId: project.id,
  details: {
    repository: `${owner}/${name}`,
    installationId,
  },
})
```

---

## 6. Database Schema Details

### 6.1 Entity Relationship Diagram

```
┌─────────────────────┐
│ GitHubInstallation  │
├─────────────────────┤
│ id                  │
│ installationId      │◄───────────────────┐
│ accountType         │                    │
│ accountLogin        │                    │
│ accessToken (enc)   │                    │
│ tokenExpiresAt      │                    │
└─────────────────────┘                    │
                                           │
┌─────────────────────┐              ┌─────┴───────────────┐
│ Project             │              │ GitHubRepository    │
├─────────────────────┤              ├─────────────────────┤
│ id                  │◄─────────────│ projectId (unique)  │
│ name                │              │ installationId      │
│ ...                 │              │ repoId              │
└─────────────────────┘              │ owner               │
         ▲                           │ name                │
         │                           │ syncSettings (json) │
         │                           │ webhookSecret       │
         │                           └─────────────────────┘
         │                                     │
         │                                     │
┌────────┴────────────┐              ┌────────┴────────────┐
│ Task                │              │ GitHubIssue         │
├─────────────────────┤              ├─────────────────────┤
│ id                  │◄─────────────│ taskId (unique)     │
│ title               │              │ repositoryId        │
│ description         │              │ issueNumber         │
│ ...                 │              │ syncHash            │
└─────────────────────┘              └─────────────────────┘
         ▲
         │
         ├────────────────────────────────────┐
         │                                    │
┌────────┴────────────┐              ┌────────┴────────────┐
│ GitHubPullRequest   │              │ GitHubCommit        │
├─────────────────────┤              ├─────────────────────┤
│ taskId              │              │ taskId              │
│ repositoryId        │              │ repositoryId        │
│ prNumber            │              │ sha                 │
│ state               │              │ message             │
│ headBranch          │              │ authorLogin         │
└─────────────────────┘              └─────────────────────┘
```

### 6.2 Indexes

```prisma
model GitHubRepository {
  // ...
  @@unique([owner, name])
  @@index([installationId])
}

model GitHubIssue {
  // ...
  @@unique([repositoryId, issueNumber])
  @@index([taskId])
}

model GitHubPullRequest {
  // ...
  @@unique([repositoryId, prNumber])
  @@index([taskId])
  @@index([state])
}

model GitHubCommit {
  // ...
  @@unique([repositoryId, sha])
  @@index([taskId])
  @@index([committedAt])
}

model GitHubSyncLog {
  // ...
  @@index([repositoryId, createdAt])
  @@index([status])
}
```

---

## 7. Rate Limiting

### 7.1 GitHub API Limits

| Limit Type | Value | Scope |
|------------|-------|-------|
| Core API | 5000/hour | Per installation |
| Search API | 30/min | Per installation |
| GraphQL | 5000 points/hour | Per installation |

### 7.2 Rate Limit Handling

```typescript
// apps/api/src/lib/github.ts

import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  reservoir: 5000,
  reservoirRefreshAmount: 5000,
  reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
  maxConcurrent: 10,
  minTime: 100, // 100ms between requests
})

export async function githubRequest<T>(
  token: string,
  path: string,
  options?: RequestInit
): Promise<T> {
  return limiter.schedule(async () => {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options?.headers,
      },
    })

    // Check rate limit headers
    const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0')
    const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0')

    if (remaining < 100) {
      console.warn(`GitHub rate limit low: ${remaining} remaining, resets at ${new Date(reset * 1000)}`)
    }

    if (!response.ok) {
      if (response.status === 403 && remaining === 0) {
        throw new RateLimitError(`Rate limit exceeded, resets at ${new Date(reset * 1000)}`)
      }
      throw new GitHubAPIError(response.status, await response.text())
    }

    return response.json()
  })
}
```

---

## 8. Error Handling

### 8.1 Error Types

```typescript
// apps/api/src/services/github/errors.ts

export class GitHubError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'GitHubError'
  }
}

export class GitHubAPIError extends GitHubError {
  constructor(public status: number, message: string) {
    super(message, `GITHUB_API_${status}`)
  }
}

export class RateLimitError extends GitHubError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_EXCEEDED')
  }
}

export class WebhookValidationError extends GitHubError {
  constructor(message: string) {
    super(message, 'WEBHOOK_VALIDATION_FAILED')
  }
}

export class SyncConflictError extends GitHubError {
  constructor(
    public taskId: number,
    public issueNumber: number,
    message: string
  ) {
    super(message, 'SYNC_CONFLICT')
  }
}
```

### 8.2 Retry Strategy

```typescript
// apps/api/src/services/github/retry.ts

import pRetry from 'p-retry'

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; onRetry?: (error: Error) => void }
): Promise<T> {
  return pRetry(fn, {
    retries: options?.retries ?? 3,
    onFailedAttempt: (error) => {
      // Don't retry on 4xx errors (except 429)
      if (error instanceof GitHubAPIError) {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error
        }
      }
      options?.onRetry?.(error)
    },
    minTimeout: 1000,
    maxTimeout: 30000,
  })
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

- Sync hash computation
- Field mapping transformations
- Conflict resolution logic
- Webhook signature verification

### 9.2 Integration Tests

- OAuth flow (mock GitHub responses)
- Webhook handling (mock deliveries)
- Issue sync (mock API calls)

### 9.3 E2E Tests

- Full installation flow
- Issue create → sync → verify
- PR link → task update

---

## 10. Monitoring & Observability

### 10.1 Metrics

```typescript
// Prometheus metrics
const githubSyncDuration = new Histogram({
  name: 'kanbu_github_sync_duration_seconds',
  help: 'Duration of GitHub sync operations',
  labelNames: ['direction', 'entity_type', 'status'],
})

const githubWebhookCounter = new Counter({
  name: 'kanbu_github_webhooks_total',
  help: 'Total GitHub webhooks received',
  labelNames: ['event', 'action', 'status'],
})

const githubAPIRequests = new Counter({
  name: 'kanbu_github_api_requests_total',
  help: 'Total GitHub API requests',
  labelNames: ['method', 'endpoint', 'status'],
})
```

### 10.2 Logging

```typescript
// Structured logging for sync operations
logger.info('GitHub sync completed', {
  repositoryId: repo.id,
  direction: 'github_to_kanbu',
  issuesImported: 5,
  issuesUpdated: 3,
  issuesSkipped: 2,
  duration: 1234,
})
```

---

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-09 | Initiële architectuur document |
