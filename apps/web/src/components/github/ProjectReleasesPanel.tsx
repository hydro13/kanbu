/*
 * ProjectReleasesPanel Component
 * Version: 1.0.0
 *
 * Displays GitHub releases for a project.
 * Shows release notes, tags, and allows generating release notes.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 11 - Geavanceerde Sync
 * =============================================================================
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Tag,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  ExternalLink,
  FileText,
  Download,
  GitBranch,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ProjectReleasesPanelProps {
  projectId: number;
}

interface ReleaseInfo {
  id: number;
  tagName: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  authorLogin: string | null;
  htmlUrl: string | null;
  publishedAt: string | null;
}

// =============================================================================
// Release Card Component
// =============================================================================

function ReleaseCard({ release }: { release: ReleaseInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const publishedDate = release.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-card rounded-card border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-500" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{release.name || release.tagName}</h4>
              {release.draft && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                  Draft
                </span>
              )}
              {release.prerelease && (
                <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
                  Pre-release
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {release.tagName}
              </span>
              {publishedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {publishedDate}
                </span>
              )}
              {release.authorLogin && <span>by {release.authorLogin}</span>}
            </div>
          </div>
        </div>
        {release.htmlUrl && (
          <a
            href={release.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {release.body && (
        <>
          <div
            className={`text-sm text-gray-600 dark:text-gray-400 ${
              !isExpanded ? 'line-clamp-3' : ''
            } whitespace-pre-wrap`}
          >
            {release.body}
          </div>
          {release.body.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Latest Release Highlight
// =============================================================================

function LatestReleaseHighlight({ release }: { release: ReleaseInfo }) {
  const publishedDate = release.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Latest Release
          </span>
          <h3 className="text-xl font-bold text-foreground mt-1">
            {release.name || release.tagName}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
            <Tag className="w-4 h-4" />
            {release.tagName}
            {publishedDate && <span>• Released {publishedDate}</span>}
          </div>
        </div>
        {release.htmlUrl && (
          <a
            href={release.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            View Release
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Stats Summary Component
// =============================================================================

function StatsSummary({
  stats,
}: {
  stats: { total: number; published: number; drafts: number; prereleases: number };
}) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-xl font-bold text-foreground">{stats.total}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
      </div>
      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-xl font-bold text-green-600 dark:text-green-400">
          {stats.published}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Published</div>
      </div>
      <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.drafts}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Drafts</div>
      </div>
      <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
          {stats.prereleases}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Pre-releases</div>
      </div>
    </div>
  );
}

// =============================================================================
// Release Notes Generator
// =============================================================================

function ReleaseNotesGenerator({ projectId }: { projectId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const notesQuery = trpc.github.generateReleaseNotes.useQuery(
    { projectId, includeTaskLinks: true },
    { enabled: isOpen }
  );

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="mb-4">
        <FileText className="w-4 h-4 mr-2" />
        Generate Release Notes
      </Button>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generated Release Notes
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Close
        </Button>
      </div>
      {notesQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : notesQuery.data ? (
        <div className="bg-card rounded border border-gray-200 dark:border-gray-700 p-3">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {notesQuery.data}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigator.clipboard.writeText(notesQuery.data)}
          >
            Copy to Clipboard
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// Loading State
// =============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No releases found</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Releases will appear here once they are published in the linked GitHub repository.
      </p>
    </div>
  );
}

// =============================================================================
// Error State
// =============================================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">Failed to load releases</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectReleasesPanel({ projectId }: ProjectReleasesPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [includePrereleases, setIncludePrereleases] = useState(true);

  const releasesQuery = trpc.github.getProjectReleases.useQuery(
    { projectId, includePrereleases },
    { enabled: !!projectId }
  );

  const statsQuery = trpc.github.getReleaseStats.useQuery({ projectId }, { enabled: !!projectId });

  const latestQuery = trpc.github.getLatestRelease.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([releasesQuery.refetch(), statsQuery.refetch(), latestQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (releasesQuery.isLoading) {
    return <LoadingState />;
  }

  if (releasesQuery.isError) {
    return (
      <ErrorState
        message={releasesQuery.error?.message ?? 'Unknown error'}
        onRetry={handleRefresh}
      />
    );
  }

  const releases = (releasesQuery.data ?? []) as ReleaseInfo[];
  const stats = statsQuery.data;
  const latestRelease = latestQuery.data as ReleaseInfo | null;

  if (releases.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Releases
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePrereleases}
              onChange={(e) => setIncludePrereleases(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-600 dark:text-gray-400">Include pre-releases</span>
          </label>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Latest Release Highlight */}
      {latestRelease && <LatestReleaseHighlight release={latestRelease} />}

      {/* Stats */}
      {stats && <StatsSummary stats={stats} />}

      {/* Release Notes Generator */}
      <ReleaseNotesGenerator projectId={projectId} />

      {/* Releases list */}
      <div className="space-y-3">
        {releases.map((release) => (
          <ReleaseCard key={release.id} release={release} />
        ))}
      </div>
    </div>
  );
}

export default ProjectReleasesPanel;
