/*
 * NotificationItem Component
 * Version: 1.0.0
 *
 * Individual notification display with click navigation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:10 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  AtSign,
  ListTodo,
  FolderPlus,
  ShieldCheck,
  Bell,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface NotificationItemData {
  id: number;
  type: string;
  title: string;
  content: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string | Date;
  link?: string;
}

export interface NotificationItemProps {
  notification: NotificationItemData;
  onMarkRead?: (id: number) => void;
  onClick?: (notification: NotificationItemData) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_assigned':
      return UserPlus;
    case 'task_updated':
      return Bell;
    case 'task_completed':
      return CheckCircle;
    case 'task_due_soon':
      return Clock;
    case 'task_overdue':
      return AlertCircle;
    case 'comment_added':
      return MessageSquare;
    case 'comment_mentioned':
      return AtSign;
    case 'subtask_assigned':
    case 'subtask_completed':
      return ListTodo;
    case 'project_invited':
      return FolderPlus;
    case 'project_role_changed':
      return ShieldCheck;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'task_assigned':
    case 'subtask_assigned':
      return 'text-blue-500';
    case 'task_completed':
    case 'subtask_completed':
      return 'text-green-500';
    case 'task_overdue':
      return 'text-red-500';
    case 'task_due_soon':
      return 'text-orange-500';
    case 'comment_added':
    case 'comment_mentioned':
      return 'text-purple-500';
    case 'project_invited':
    case 'project_role_changed':
      return 'text-indigo-500';
    default:
      return 'text-gray-500';
  }
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString();
}

// =============================================================================
// Component
// =============================================================================

export function NotificationItem({ notification, onMarkRead, onClick }: NotificationItemProps) {
  const navigate = useNavigate();
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  const handleClick = () => {
    // Mark as read if not already
    if (!notification.isRead && onMarkRead) {
      onMarkRead(notification.id);
    }

    // Call custom onClick handler
    if (onClick) {
      onClick(notification);
    }

    // Navigate to link if available
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
        notification.isRead ? 'bg-card' : 'bg-blue-50 dark:bg-blue-900/20'
      } hover:bg-gray-50 dark:hover:bg-gray-700`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-foreground font-medium'
          }`}
        >
          {notification.title}
        </p>
        {notification.content && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {notification.content}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="flex-shrink-0 mt-1.5">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        </div>
      )}
    </button>
  );
}

export default NotificationItem;
