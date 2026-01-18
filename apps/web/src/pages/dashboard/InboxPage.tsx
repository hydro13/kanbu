/*
 * Inbox Page
 * Version: 1.0.0
 *
 * Personal inbox for notifications aggregated across all projects/workspaces.
 * Uses DashboardLayout with sidebar navigation.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation for Fase 3.1
 * ===================================================================
 */

import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  Clock,
  GitBranch,
  Rocket,
  CheckCheck,
  Trash2,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_assigned':
    case 'subtask_assigned':
      return <UserPlus className="h-5 w-5 text-blue-500" />;
    case 'task_completed':
    case 'subtask_completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'task_overdue':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'task_due_soon':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'comment_added':
    case 'comment_mentioned':
      return <MessageSquare className="h-5 w-5 text-purple-500" />;
    case 'workflow_failed':
    case 'check_run_failed':
    case 'deployment_failed':
      return <GitBranch className="h-5 w-5 text-red-500" />;
    case 'workflow_succeeded':
    case 'check_run_succeeded':
      return <GitBranch className="h-5 w-5 text-green-500" />;
    case 'deployment_succeeded':
      return <Rocket className="h-5 w-5 text-green-500" />;
    case 'deployment_pending':
      return <Rocket className="h-5 w-5 text-amber-500" />;
    case 'project_invited':
    case 'project_role_changed':
      return <UserPlus className="h-5 w-5 text-indigo-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupNotificationsByDate(notifications: NotificationItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationItem[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups[0]!.items.push(notification);
    } else if (date.getTime() === yesterday.getTime()) {
      groups[1]!.items.push(notification);
    } else {
      groups[2]!.items.push(notification);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

function getProjectInfo(data: Record<string, unknown>): string | null {
  const projectName = data.projectName as string | undefined;
  const workspaceName = data.workspaceName as string | undefined;
  if (projectName && workspaceName) return `${projectName} • ${workspaceName}`;
  if (projectName) return projectName;
  return null;
}

// =============================================================================
// Component
// =============================================================================

export function InboxPage() {
  const utils = trpc.useUtils();

  // Fetch notifications
  const notificationsQuery = trpc.notification.list.useQuery({
    limit: 50,
    offset: 0,
  });
  const notifications = (notificationsQuery.data ?? []) as NotificationItem[];
  const unreadCountQuery = trpc.notification.getUnreadCount.useQuery();

  // Mutations
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const deleteNotification = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const deleteAllRead = trpc.notification.deleteAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const groupedNotifications = groupNotificationsByDate(notifications);
  const unreadCount = unreadCountQuery.data?.count ?? 0;

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markRead.mutate({ notificationIds: [notification.id] });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title-lg tracking-tight text-foreground flex items-center gap-3">
              Inbox
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 text-sm font-medium rounded-full bg-primary text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">
              Notifications from all your projects and workspaces
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteAllRead.mutate()}
              disabled={deleteAllRead.isPending}
              title="Delete all read notifications"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {notificationsQuery.isLoading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                <p className="text-muted-foreground">You have no notifications at the moment.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {group.label}
                </h2>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {group.items.map((notification) => {
                      const projectInfo = getProjectInfo(notification.data);

                      const contentElement = (
                        <>
                          <p className={cn('text-sm', !notification.isRead && 'font-medium')}>
                            {notification.title}
                          </p>
                          {notification.content && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.content}
                            </p>
                          )}
                          {projectInfo && (
                            <p className="text-xs text-muted-foreground mt-1">{projectInfo}</p>
                          )}
                        </>
                      );

                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            'flex items-start gap-4 p-4 transition-colors hover:bg-accent/50',
                            !notification.isRead && 'bg-primary/5'
                          )}
                        >
                          {/* Unread indicator */}
                          <div className="flex-shrink-0 pt-1">
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>

                          {/* Icon */}
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          {notification.link ? (
                            <Link
                              to={notification.link}
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              {contentElement}
                            </Link>
                          ) : (
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              {contentElement}
                            </div>
                          )}

                          {/* Time and actions */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNotification.mutate({
                                  notificationId: notification.id,
                                });
                              }}
                              disabled={deleteNotification.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default InboxPage;
