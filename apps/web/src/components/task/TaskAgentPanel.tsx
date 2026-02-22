/*
 * TaskAgentPanel Component
 *
 * Shows agents for a task's project and lets users dispatch the task
 * to an OpenClaw agent. Displays a run history (AgentRun log).
 *
 * Only active when OPENCLAW_GATEWAY_URL is configured on the server.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Bot,
  Play,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface TaskAgentPanelProps {
  taskId: number;
  projectId: number;
}

// =============================================================================
// Run Status Badge
// =============================================================================

function RunStatusBadge({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Running
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {status}
    </span>
  );
}

// =============================================================================
// Relative time helper
// =============================================================================

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// Create Agent Form (inline)
// =============================================================================

function CreateAgentForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');

  const createMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      projectId,
      name: name.trim(),
      role: role.trim() || undefined,
      workspacePath: workspacePath.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
    >
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        New Agent
      </p>
      <div>
        <input
          type="text"
          placeholder="Agent name (e.g. Dev Agent)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          required
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="Role (e.g. developer, reviewer)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="Workspace path (e.g. /home/user/project)"
          value={workspacePath}
          onChange={(e) => setWorkspacePath(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Plus className="w-3 h-3 mr-1" />
          )}
          Create
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {createMutation.isError && (
        <p className="text-xs text-red-500">{createMutation.error.message}</p>
      )}
    </form>
  );
}

// =============================================================================
// AgentRun Item
// =============================================================================

function AgentRunItem({
  run,
}: {
  run: {
    id: number;
    status: string;
    sessionKey: string;
    startedAt: string;
    endedAt: string | null;
    agent: { id: number; name: string; role: string | null };
  };
}) {
  const [expanded, setExpanded] = useState(false);

  const duration = run.endedAt
    ? (() => {
        const ms = new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime();
        const secs = Math.floor(ms / 1000);
        const mins = Math.floor(secs / 60);
        return mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
      })()
    : null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <Bot className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {run.agent.name}
            </span>
            {run.agent.role && (
              <span className="text-xs text-gray-500 dark:text-gray-400">({run.agent.role})</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(run.startedAt)}
            {duration && <span>· {duration}</span>}
          </div>
        </div>
        <RunStatusBadge status={run.status} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
            Session: {run.sessionKey}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Panel
// =============================================================================

export function TaskAgentPanel({ taskId, projectId }: TaskAgentPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  // Check if OpenClaw is configured
  const enabledQuery = trpc.agent.isEnabled.useQuery();

  // List agents for this project's workspace
  const agentsQuery = trpc.agent.list.useQuery(
    { projectId },
    { enabled: enabledQuery.data?.enabled === true }
  );

  // List runs for this task
  const runsQuery = trpc.agent.listRuns.useQuery(
    { taskId },
    { refetchInterval: 5000 } // poll every 5s while panel is open
  );

  const dispatchMutation = trpc.agent.dispatch.useMutation({
    onSuccess: () => {
      setCustomInstructions('');
      setShowInstructions(false);
      runsQuery.refetch();
    },
  });

  const handleDispatch = () => {
    if (!selectedAgentId) return;
    dispatchMutation.mutate({
      taskId,
      agentId: selectedAgentId,
      customInstructions: customInstructions.trim() || undefined,
    });
  };

  // ─── Not configured ───────────────────────────────────────────────────────
  if (!enabledQuery.data?.enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          OpenClaw not configured
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
          Set{' '}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
            OPENCLAW_GATEWAY_URL
          </code>{' '}
          in your server environment to enable AI agent dispatch.
        </p>
      </div>
    );
  }

  const agents = agentsQuery.data ?? [];
  const runs = runsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* ─── Dispatch Section ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Run with Agent
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            New agent
          </Button>
        </div>

        {showCreateForm && (
          <CreateAgentForm
            projectId={projectId}
            onCreated={() => {
              setShowCreateForm(false);
              agentsQuery.refetch();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {agentsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading agents…
          </div>
        ) : agents.length === 0 && !showCreateForm ? (
          <div className="text-center py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <Bot className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No agents yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Create your first agent
            </Button>
          </div>
        ) : (
          agents.length > 0 && (
            <div className="space-y-2">
              {/* Agent selector */}
              <select
                value={selectedAgentId ?? ''}
                onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.role ? ` (${a.role})` : ''}
                  </option>
                ))}
              </select>

              {/* Optional instructions toggle */}
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className={cn(
                  'text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1',
                  showInstructions && 'text-blue-600 dark:text-blue-400'
                )}
              >
                {showInstructions ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Custom instructions
              </button>

              {showInstructions && (
                <textarea
                  rows={3}
                  placeholder="Optional: extra instructions for this run…"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}

              <Button
                onClick={handleDispatch}
                disabled={!selectedAgentId || dispatchMutation.isPending}
                size="sm"
                className="w-full"
              >
                {dispatchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Dispatch to agent
              </Button>

              {dispatchMutation.isError && (
                <p className="text-xs text-red-500">{dispatchMutation.error.message}</p>
              )}
              {dispatchMutation.isSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Agent dispatched — see run log below.
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* ─── Run Log ──────────────────────────────────────────────────── */}
      {runs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Run history</h3>
          {runs.map((run) => (
            <AgentRunItem
              key={run.id}
              run={{
                ...run,
                startedAt: run.startedAt.toString(),
                endedAt: run.endedAt ? run.endedAt.toString() : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
