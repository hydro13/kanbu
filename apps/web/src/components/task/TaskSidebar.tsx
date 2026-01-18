/*
 * TaskSidebar Component
 * Version: 1.0.0
 *
 * Sidebar with task metadata: assignees, due date, tags, dates.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:45 CET
 *
 * Modified by:
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T11:15 CET
 * Change: Added MilestoneSelector for task-to-milestone linking
 * ═══════════════════════════════════════════════════════════════════
 */

import { Calendar, Users, Tag, Clock, Columns, GitBranch, Flag, Play } from 'lucide-react';
import { MilestoneSelector } from '@/components/milestone/MilestoneSelector';
import { TagSelector } from '@/components/task/TagSelector';
import { DateSelector } from '@/components/task/DateSelector';
import { AssigneeSelector } from '@/components/task/AssigneeSelector';
import { LocationSelector } from '@/components/task/LocationSelector';
import { TimeEstimatedSelector } from '@/components/task/TimeEstimatedSelector';

// =============================================================================
// Types
// =============================================================================

interface TaskData {
  id: number;
  dateDue: string | null;
  dateStarted: string | null;
  dateCompleted: string | null;
  createdAt: string;
  updatedAt: string;
  timeEstimated: number;
  timeSpent: number;
  column: {
    id: number;
    title: string;
  };
  swimlane: {
    id: number;
    name: string;
  } | null;
  milestone: {
    id: number;
    name: string;
  } | null;
  assignees: Array<{
    id: number;
    user: {
      id: number;
      username: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }>;
  tags: Array<{
    id: number;
    tag: {
      id: number;
      name: string;
      color: string | null;
    };
  }>;
}

export interface TaskSidebarProps {
  task: TaskData;
  projectId: number;
  onUpdate: (data: { taskId: number } & Record<string, unknown>) => Promise<unknown>;
  isUpdating: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(hours: number): string {
  if (hours === 0) return 'Not set';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// SidebarSection Component
// =============================================================================

function SidebarSection({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

// =============================================================================
// TaskSidebar Component
// =============================================================================

export function TaskSidebar({
  task,
  projectId,
  onUpdate: _onUpdate,
  isUpdating: _isUpdating,
}: TaskSidebarProps) {
  const completedFormatted = formatDate(task.dateCompleted);

  return (
    <div className="space-y-6">
      {/* Assignees */}
      <SidebarSection icon={Users} label="Assignees">
        <AssigneeSelector
          projectId={projectId}
          taskId={task.id}
          assignees={task.assignees.map(({ user }) => ({
            id: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
          }))}
        />
      </SidebarSection>

      {/* Start Date */}
      <SidebarSection icon={Play} label="Start Date">
        <DateSelector taskId={task.id} dateType="start" currentDate={task.dateStarted} />
      </SidebarSection>

      {/* Due Date */}
      <SidebarSection icon={Calendar} label="Due Date">
        <DateSelector taskId={task.id} dateType="due" currentDate={task.dateDue} />
      </SidebarSection>

      {/* Milestone */}
      <SidebarSection icon={Flag} label="Milestone">
        <MilestoneSelector
          projectId={projectId}
          taskId={task.id}
          currentMilestoneId={task.milestone?.id ?? null}
        />
      </SidebarSection>

      {/* Tags */}
      <SidebarSection icon={Tag} label="Tags">
        <TagSelector
          projectId={projectId}
          taskId={task.id}
          selectedTags={task.tags.map(({ tag }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          }))}
        />
      </SidebarSection>

      {/* Time Tracking */}
      <SidebarSection icon={Clock} label="Time Tracking">
        <div className="space-y-1 text-sm">
          <TimeEstimatedSelector taskId={task.id} currentHours={task.timeEstimated} />
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Spent:</span>
            <span className="text-foreground">{formatTime(task.timeSpent)}</span>
          </div>
        </div>
      </SidebarSection>

      {/* Location */}
      <SidebarSection icon={Columns} label="Location">
        <LocationSelector
          taskId={task.id}
          projectId={projectId}
          currentColumn={task.column}
          currentSwimlane={task.swimlane}
        />
      </SidebarSection>

      {/* Activity */}
      <SidebarSection icon={GitBranch} label="Activity">
        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <div>Created: {formatDateTime(task.createdAt)}</div>
          <div>Updated: {formatDateTime(task.updatedAt)}</div>
          {completedFormatted && <div>Completed: {completedFormatted}</div>}
        </div>
      </SidebarSection>
    </div>
  );
}

export default TaskSidebar;
