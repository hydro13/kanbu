/*
 * Analytics Dashboard Page
 * Version: 1.0.0
 *
 * Project analytics and reporting dashboard with widget grid layout.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:25 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Calendar,
  Download,
} from 'lucide-react';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { TaskCountWidget } from '@/components/analytics/TaskCountWidget';
import { VelocityChart } from '@/components/analytics/VelocityChart';
import { CycleTimeChart } from '@/components/analytics/CycleTimeChart';
import { WorkloadChart } from '@/components/analytics/WorkloadChart';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

type DateRangePreset = 'all' | '7d' | '30d' | '90d' | 'custom';

// =============================================================================
// Helpers
// =============================================================================

function getDateRange(preset: DateRangePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === 'all') return {};

  const now = new Date();
  const dateTo = now.toISOString();

  let dateFrom: Date;
  switch (preset) {
    case '7d':
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      return {};
  }

  return { dateFrom: dateFrom.toISOString(), dateTo };
}

function getVelocityParams(preset: DateRangePreset): {
  days?: number;
  weeks?: number;
  granularity: 'day' | 'week';
} {
  switch (preset) {
    case '7d':
      return { days: 7, granularity: 'day' };
    case '30d':
      return { days: 30, granularity: 'day' };
    case '90d':
      return { weeks: 13, granularity: 'week' };
    case 'all':
    default:
      return { weeks: 52, granularity: 'week' };
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function AnalyticsDashboard() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>();

  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  // Memoize to prevent new Date() on every render causing infinite refetches
  const dateRangeParams = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Fetch project by identifier (SEO-friendly URL)
  const { data: project, isLoading: isProjectLoading } = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  );

  // Get project ID from fetched data
  const projectIdNum = project?.id ?? 0;

  const { data: stats, isLoading: isStatsLoading } = trpc.analytics.getProjectStats.useQuery(
    { projectId: projectIdNum, ...dateRangeParams },
    { enabled: projectIdNum > 0 }
  );

  const velocityParams = useMemo(() => getVelocityParams(dateRange), [dateRange]);
  const { data: velocity, isLoading: isVelocityLoading } = trpc.analytics.getVelocity.useQuery(
    { projectId: projectIdNum, ...velocityParams },
    { enabled: projectIdNum > 0 }
  );

  const { data: cycleTime, isLoading: isCycleTimeLoading } = trpc.analytics.getCycleTime.useQuery(
    { projectId: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const { data: workload, isLoading: isWorkloadLoading } = trpc.analytics.getTeamWorkload.useQuery(
    { projectId: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const isLoading = isProjectLoading || isStatsLoading;

  // Export handler
  const handleExport = () => {
    if (!stats || !velocity || !cycleTime || !workload) return;

    const exportData = {
      project: project?.name,
      exportDate: new Date().toISOString(),
      stats,
      velocity,
      cycleTime,
      workload,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name ?? 'project'}-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ProjectLayout>
    );
  }

  // Error state
  if (!project) {
    return (
      <ProjectLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold text-foreground">Project not found</h2>
          <Link to="/workspaces" className="text-blue-500 hover:text-blue-600 dark:text-blue-400">
            Return to projects
          </Link>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                to={`/project/${projectIdNum}`}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                  <h1 className="text-page-title text-foreground">Analytics</h1>
                </div>
                <p className="text-sm text-muted-foreground">{project.name}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2 bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                {(['all', '7d', '30d', '90d'] as DateRangePreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDateRange(preset)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      dateRange === preset
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-accent'
                    }`}
                  >
                    {preset === 'all' ? 'All Time' : preset}
                  </button>
                ))}
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={!stats}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-card border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Count Widget */}
          <div className="lg:col-span-2">
            <TaskCountWidget stats={stats} isLoading={isStatsLoading} />
          </div>

          {/* Velocity Chart */}
          <div className="bg-card rounded-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-foreground">Velocity</h3>
            </div>
            <VelocityChart data={velocity} isLoading={isVelocityLoading} />
          </div>

          {/* Cycle Time Chart */}
          <div className="bg-card rounded-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-foreground">Cycle Time</h3>
            </div>
            <CycleTimeChart data={cycleTime} isLoading={isCycleTimeLoading} />
          </div>

          {/* Workload Chart */}
          <div className="lg:col-span-2 bg-card rounded-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-foreground">Team Workload</h3>
            </div>
            <WorkloadChart data={workload} isLoading={isWorkloadLoading} />
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}

export default AnalyticsDashboard;
