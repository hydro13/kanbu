/*
 * BurndownChart Component
 * Version: 1.0.0
 *
 * Visual burndown chart for sprint progress tracking.
 * Shows ideal vs actual task completion over time.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:20 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { TrendingDown, Info } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface BurndownDataPoint {
  date: string;
  ideal: number;
  actual: number | null;
}

export interface BurndownChartProps {
  data: BurndownDataPoint[];
  totalTasks: number;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// Component
// =============================================================================

export function BurndownChart({ data, totalTasks, className = '' }: BurndownChartProps) {
  // Chart dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales and paths
  const { idealPath, actualPath, xLabels, yLabels } = useMemo(() => {
    if (!data || data.length === 0) {
      return { idealPath: '', actualPath: '', xLabels: [], yLabels: [] };
    }

    const maxY = totalTasks;
    const xScale = (i: number) => (i / (data.length - 1)) * chartWidth;
    const yScale = (v: number) => chartHeight - (v / maxY) * chartHeight;

    // Ideal line path
    const idealPoints = data.map((d, i) => `${xScale(i)},${yScale(d.ideal)}`);
    const idealPath = `M ${idealPoints.join(' L ')}`;

    // Actual line path (only points with data)
    const actualPoints = data
      .map((d, i) => ({
        x: xScale(i),
        y: d.actual !== null ? yScale(d.actual) : null,
        actual: d.actual,
      }))
      .filter((p) => p.y !== null);
    const actualPath =
      actualPoints.length > 0 ? `M ${actualPoints.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';

    // X axis labels (show ~5 labels)
    const step = Math.ceil(data.length / 5);
    const xLabels = data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d) => {
        const actualIndex = data.findIndex((item) => item.date === d.date);
        return {
          x: xScale(actualIndex),
          label: formatShortDate(d.date),
        };
      });

    // Y axis labels
    const yLabels = [
      0,
      Math.round(maxY / 4),
      Math.round(maxY / 2),
      Math.round((3 * maxY) / 4),
      maxY,
    ].map((v) => ({
      y: yScale(v),
      label: v.toString(),
    }));

    return { idealPath, actualPath, xLabels, yLabels };
  }, [data, totalTasks, chartWidth, chartHeight]);

  // Current progress
  const latestActual = data.filter((d) => d.actual !== null).slice(-1)[0];
  const currentRemaining = latestActual?.actual ?? totalTasks;
  const completedTasks = totalTasks - currentRemaining;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Trend indicator (ahead/behind schedule)
  const latestIdeal = data.filter((d) => d.actual !== null).slice(-1)[0]?.ideal ?? totalTasks;
  const isAhead = currentRemaining < latestIdeal;
  const isBehind = currentRemaining > latestIdeal;
  const difference = Math.abs(currentRemaining - latestIdeal);

  if (!data || data.length === 0) {
    return (
      <div className={`bg-card rounded-card border border-border p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-foreground">Burndown Chart</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <Info className="w-5 h-5 mr-2" />
          No burndown data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-card border border-border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-foreground">Burndown Chart</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-400" />
            <span className="text-gray-500 dark:text-gray-400">Ideal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-green-500" />
            <span className="text-gray-500 dark:text-gray-400">Actual</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Progress:</span>
          <span className="ml-1.5 font-medium text-foreground">{progressPercent}%</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
          <span className="ml-1.5 font-medium text-foreground">{currentRemaining} tasks</span>
        </div>
        {(isAhead || isBehind) && (
          <div
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              isAhead
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isAhead ? `${difference} ahead` : `${difference} behind`}
          </div>
        )}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yLabels.map((label, i) => (
            <line
              key={i}
              x1={0}
              y1={label.y}
              x2={chartWidth}
              y2={label.y}
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-gray-400 dark:text-gray-600"
            />
          ))}

          {/* Y axis labels */}
          {yLabels.map((label, i) => (
            <text
              key={i}
              x={-10}
              y={label.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {label.label}
            </text>
          ))}

          {/* X axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={chartHeight + 25}
              textAnchor="middle"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {label.label}
            </text>
          ))}

          {/* Ideal line */}
          <path
            d={idealPath}
            fill="none"
            stroke="rgb(96, 165, 250)"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.7}
          />

          {/* Actual line */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points for actual */}
          {data
            .map((d, i) => ({ ...d, index: i }))
            .filter((d) => d.actual !== null)
            .map((d) => {
              const x = (d.index / (data.length - 1)) * chartWidth;
              const y = chartHeight - (d.actual! / totalTasks) * chartHeight;
              return (
                <circle
                  key={d.index}
                  cx={x}
                  cy={y}
                  r={4}
                  fill="rgb(34, 197, 94)"
                  stroke="white"
                  strokeWidth={2}
                />
              );
            })}

          {/* Axes */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-gray-400"
          />
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-gray-400"
          />
        </g>
      </svg>
    </div>
  );
}

export default BurndownChart;
