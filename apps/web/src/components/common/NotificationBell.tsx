/*
 * NotificationBell Component
 * Version: 1.0.0
 *
 * Bell icon with badge and notification dropdown.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:10 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Settings, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { NotificationItem, type NotificationItemData } from './NotificationItem'

// =============================================================================
// Types
// =============================================================================

export interface NotificationBellProps {
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  // Queries
  const { data: countData } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  const {
    data: notifications,
    isLoading,
    refetch,
  } = trpc.notification.list.useQuery(
    { limit: 10, unreadOnly: false },
    {
      enabled: isOpen, // Only fetch when dropdown is open
    }
  )

  // Mutations
  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.getUnreadCount.invalidate()
      utils.notification.list.invalidate()
    },
  })

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.getUnreadCount.invalidate()
      utils.notification.list.invalidate()
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Refetch when opening
  useEffect(() => {
    if (isOpen) {
      refetch()
    }
  }, [isOpen, refetch])

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ notificationIds: [id] })
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate()
  }

  const handleNotificationClick = (_notification: NotificationItemData) => {
    setIsOpen(false)
    // Navigation is handled by NotificationItem
  }

  const unreadCount = countData?.count ?? 0

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Mark all as read"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/settings/notifications')
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Notification settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No notifications yet
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications && notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/notifications')
                }}
                className="w-full px-4 py-2.5 text-sm text-center text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
