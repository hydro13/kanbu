/*
 * AuditLogsPage Component
 * Version: 1.0.0
 *
 * Admin page for viewing security audit logs.
 * Displays audit trail with filtering, search, and export functionality.
 * Scoped access: Domain Admins see all, Workspace Admins see their workspace only.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 259 - Audit Logging Implementation
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type AuditCategory =
  | 'ACL'
  | 'GROUP'
  | 'USER'
  | 'WORKSPACE'
  | 'SETTINGS'
  | 'PROJECT'
  | 'TASK'
  | 'SUBTASK'
  | 'COMMENT';

interface FilterState {
  category?: AuditCategory;
  action?: string;
  workspaceId?: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  mcpOnly?: boolean; // Filter for MCP/Claude Code actions only
}

// Simple types to avoid TS2589 with deep tRPC/Prisma types
interface AuditLogUser {
  id: number;
  name: string | null;
  username: string;
  avatarUrl: string | null;
}

interface AuditLogWorkspace {
  id: number;
  name: string;
  slug: string;
}

interface AuditLogEntry {
  id: number;
  category: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  resourceName: string | null;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  userId: number;
  workspaceId: number | null;
  ipAddress: string | null;
  createdAt: Date | string;
  user: AuditLogUser | null;
  workspace: AuditLogWorkspace | null;
}

// =============================================================================
// Category Badge Styling
// =============================================================================

const CATEGORY_STYLES: Record<AuditCategory, { bg: string; text: string }> = {
  ACL: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-200' },
  GROUP: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200' },
  USER: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200' },
  WORKSPACE: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-200',
  },
  SETTINGS: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' },
  // Fase 16 - MCP Activity categories
  PROJECT: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-800 dark:text-indigo-200',
  },
  TASK: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-800 dark:text-cyan-200' },
  SUBTASK: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-200' },
  COMMENT: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-800 dark:text-pink-200' },
};

// =============================================================================
// Date Helpers
// =============================================================================

function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFullTimestamp(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// =============================================================================
// Component
// =============================================================================

export function AuditLogsPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(0);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const limit = 50;

  // Get workspaces for filter dropdown
  const { data: workspaces } = trpc.workspace.list.useQuery();

  // Get audit logs
  const { data: auditData, isLoading } = trpc.auditLog.list.useQuery({
    ...filters,
    limit,
    offset: page * limit,
    sortOrder: 'desc',
  });

  // Get stats for dashboard summary
  const { data: statsData } = trpc.auditLog.getStats.useQuery({
    workspaceId: filters.workspaceId,
  });

  // Export mutation
  const exportMutation = trpc.auditLog.export.useMutation({
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data.data], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExporting(false);
    },
    onError: () => {
      setExporting(false);
    },
  });

  const handleExport = (format: 'csv' | 'json') => {
    setExporting(true);
    exportMutation.mutate({
      ...filters,
      format,
    });
  };

  // Cast logs to simple type to avoid TS2589 with deep tRPC/Prisma types
  const logs = (auditData?.logs ?? []) as unknown as AuditLogEntry[];

  // Compute expanded log data separately
  const expandedLogData = useMemo((): AuditLogEntry | null => {
    if (!expandedLog) return null;
    return logs.find((log) => log.id === expandedLog) ?? null;
  }, [expandedLog, logs]);

  const handleFilterChange = (key: keyof FilterState, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
    setPage(0);
  };

  const renderChanges = (changes: Record<string, unknown> | null) => {
    if (!changes || Object.keys(changes).length === 0) return null;

    const before = changes.before as Record<string, unknown> | null;
    const after = changes.after as Record<string, unknown> | null;

    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
        <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Changes:</div>
        <div className="grid grid-cols-2 gap-4">
          {before && (
            <div>
              <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Before</div>
              <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {JSON.stringify(before, null, 2)}
              </pre>
            </div>
          )}
          {after && (
            <div>
              <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">After</div>
              <pre className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap">
                {JSON.stringify(after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Audit Logs"
      description="Security event logging for compliance and troubleshooting"
    >
      <div className="space-y-6">
        {/* Export Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-card border border-input rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-card border border-input rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>

        {/* Stats Cards */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card rounded-card border border-border p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Events</div>
              <div className="text-2xl font-semibold text-foreground mt-1">
                {statsData.totalLogs.toLocaleString()}
              </div>
            </div>
            {Object.entries(statsData.byCategory).map(([category, count]) => (
              <div key={category} className="bg-card rounded-card border border-border p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">{category}</div>
                <div className="text-2xl font-semibold text-foreground mt-1">
                  {(count as number).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-card border border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search in resource, target, action..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value as AuditCategory)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <optgroup label="Security">
                  <option value="ACL">ACL</option>
                  <option value="GROUP">GROUP</option>
                  <option value="USER">USER</option>
                  <option value="WORKSPACE">WORKSPACE</option>
                  <option value="SETTINGS">SETTINGS</option>
                </optgroup>
                <optgroup label="Project Management">
                  <option value="PROJECT">PROJECT</option>
                  <option value="TASK">TASK</option>
                  <option value="SUBTASK">SUBTASK</option>
                  <option value="COMMENT">COMMENT</option>
                </optgroup>
              </select>
            </div>

            {/* Workspace */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workspace
              </label>
              <select
                value={filters.workspaceId || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'workspaceId',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Workspaces</option>
                {workspaces?.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            {/* MCP Only Filter */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full">
                <input
                  type="checkbox"
                  checked={filters.mcpOnly || false}
                  onChange={(e) =>
                    handleFilterChange('mcpOnly', e.target.checked ? true : undefined)
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Claude Code only
                </span>
              </label>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({});
                  setPage(0);
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-input rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-card rounded-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading audit logs...
            </div>
          ) : !auditData || auditData.logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No audit logs found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Workspace
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-foreground">
                            {formatTimeAgo(log.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFullTimestamp(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                              CATEGORY_STYLES[log.category as AuditCategory]?.bg ||
                                'bg-gray-100 dark:bg-gray-700',
                              CATEGORY_STYLES[log.category as AuditCategory]?.text ||
                                'text-gray-800 dark:text-gray-200'
                            )}
                          >
                            {log.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground font-mono">
                          {log.action}
                        </td>
                        <td className="px-4 py-3">
                          {(log.metadata as Record<string, unknown> | null)?.via === 'assistant' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                              </svg>
                              Claude Code
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">Web UI</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-foreground">{log.resourceName || '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {log.resourceType}
                            {log.resourceId ? ` #${log.resourceId}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {log.targetName ? (
                            <>
                              <div className="text-sm text-foreground">{log.targetName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {log.targetType}
                                {log.targetId ? ` #${log.targetId}` : ''}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {log.user?.avatarUrl ? (
                              <img
                                src={log.user.avatarUrl}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                                {(
                                  log.user?.name?.[0] ||
                                  log.user?.username?.[0] ||
                                  '?'
                                ).toUpperCase()}
                              </div>
                            )}
                            <div className="text-sm text-foreground">
                              {log.user?.name || log.user?.username || `User #${log.userId}`}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {log.workspace?.name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expanded Details */}
              {expandedLogData && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-muted">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">ID:</span>
                      <span className="font-mono text-foreground">{expandedLogData.id}</span>
                      {expandedLogData.ipAddress && (
                        <>
                          <span className="text-gray-500 dark:text-gray-400">IP:</span>
                          <span className="font-mono text-foreground">
                            {expandedLogData.ipAddress}
                          </span>
                        </>
                      )}
                    </div>
                    {renderChanges(expandedLogData.changes)}
                    {/* Claude Code / MCP Details */}
                    {(expandedLogData.metadata as Record<string, unknown> | null)?.via ===
                      'assistant' && (
                      <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-sm border border-violet-200 dark:border-violet-800">
                        <div className="flex items-center gap-2 font-medium text-violet-800 dark:text-violet-200 mb-2">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                          </svg>
                          Via Claude Code (MCP)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-violet-600 dark:text-violet-400">Machine:</span>{' '}
                            <span className="text-foreground font-mono">
                              {String(
                                (expandedLogData.metadata as Record<string, unknown>)
                                  ?.machineName || 'Unknown'
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-violet-600 dark:text-violet-400">
                              Machine ID:
                            </span>{' '}
                            <span className="text-foreground font-mono text-xs">
                              {String(
                                (expandedLogData.metadata as Record<string, unknown>)?.machineId ||
                                  'Unknown'
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-violet-600 dark:text-violet-400">
                              Binding ID:
                            </span>{' '}
                            <span className="text-foreground font-mono">
                              {String(
                                (expandedLogData.metadata as Record<string, unknown>)?.bindingId ||
                                  'Unknown'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Other Metadata */}
                    {expandedLogData.metadata &&
                      Object.keys(expandedLogData.metadata).length > 0 &&
                      (expandedLogData.metadata as Record<string, unknown>)?.via !==
                        'assistant' && (
                        <div className="p-3 bg-card rounded-lg text-sm">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Metadata:
                          </div>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {JSON.stringify(expandedLogData.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-muted">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {page * limit + 1} - {Math.min((page + 1) * limit, auditData.total)} of{' '}
                  {auditData.total} logs
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-sm border border-input rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!auditData.hasMore}
                    className="px-3 py-1 text-sm border border-input rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
