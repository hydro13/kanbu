/*
 * API Client
 * Version: 1.0.0
 *
 * HTTP client for Kanbu API communication.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import { config } from './config.js';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make a tRPC-style API call
 */
async function trpcCall<T>(procedure: string, input?: unknown, mutation = false): Promise<T> {
  const apiUrl = config.get('apiUrl');
  const token = config.get('token');

  if (!token) {
    throw new ApiError('Not authenticated. Run: kanbu login', 401);
  }

  const url = new URL(`/trpc/${procedure}`, apiUrl);

  const options: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (mutation) {
    options.method = 'POST';
    options.body = JSON.stringify({ json: input });
  } else {
    // Query - encode input in URL
    if (input !== undefined) {
      url.searchParams.set('input', JSON.stringify({ json: input }));
    }
    options.method = 'GET';
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const text = await response.text();
    let message = `API error: ${response.status}`;
    try {
      const json = JSON.parse(text);
      message = json.error?.message || json.message || message;
    } catch {
      // Not JSON
    }
    throw new ApiError(message, response.status, text);
  }

  const data = (await response.json()) as {
    result?: {
      data?:
        | {
            json?: T;
          }
        | T;
    };
  };
  const result = data.result?.data;
  if (result && typeof result === 'object' && 'json' in result) {
    return result.json as T;
  }
  return (result ?? data) as T;
}

// =============================================================================
// API Methods
// =============================================================================

export const api = {
  // Auth
  async whoami() {
    return trpcCall<{
      id: number;
      email: string;
      username: string;
      name: string | null;
    }>('user.me');
  },

  // Tasks
  async listTasks(options: {
    projectId?: number;
    status?: 'open' | 'closed' | 'all';
    assignedToMe?: boolean;
    limit?: number;
  }) {
    return trpcCall<{
      tasks: Array<{
        id: number;
        reference: string;
        title: string;
        priority: string;
        columnName: string | null;
        assignees: string[];
      }>;
      total: number;
    }>('task.list', options);
  },

  async getTask(reference: string) {
    return trpcCall<{
      id: number;
      reference: string;
      title: string;
      description: string | null;
      priority: string;
      columnName: string | null;
      projectSlug: string;
      assignees: Array<{ id: number; name: string }>;
      githubBranch: string | null;
      pullRequests: Array<{
        prNumber: number;
        state: string;
        title: string;
      }>;
    }>('task.getByReference', { reference });
  },

  async createTask(input: {
    projectId: number;
    title: string;
    description?: string;
    priority?: string;
  }) {
    return trpcCall<{
      id: number;
      reference: string;
      title: string;
    }>('task.create', input, true);
  },

  async updateTask(
    taskId: number,
    input: {
      columnId?: number;
      priority?: string;
    }
  ) {
    return trpcCall<{ id: number }>('task.update', { id: taskId, ...input }, true);
  },

  async assignTask(taskId: number, userId: number) {
    return trpcCall<{ success: boolean }>('task.assign', { taskId, userId }, true);
  },

  // Projects
  async listProjects() {
    return trpcCall<
      Array<{
        id: number;
        name: string;
        slug: string;
        prefix: string;
      }>
    >('project.list');
  },

  async getProject(slug: string) {
    return trpcCall<{
      id: number;
      name: string;
      slug: string;
      prefix: string;
      columns: Array<{
        id: number;
        name: string;
        position: number;
      }>;
    }>('project.getBySlug', { slug });
  },

  // GitHub
  async createBranch(taskId: number, customName?: string) {
    return trpcCall<{
      branchName: string;
      created: boolean;
    }>('github.createBranch', { taskId, customBranchName: customName }, true);
  },

  async getTaskPRs(taskId: number) {
    return trpcCall<
      Array<{
        id: number;
        prNumber: number;
        title: string;
        state: string;
        headBranch: string;
      }>
    >('github.getTaskPRs', { taskId });
  },

  async linkPRToTask(prNumber: number, taskReference: string) {
    return trpcCall<{ success: boolean }>('github.linkPRToTask', { prNumber, taskReference }, true);
  },
};

export default api;
