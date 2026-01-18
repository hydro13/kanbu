/**
 * Presence Indicator Component
 *
 * Shows avatars of users currently viewing the same board.
 * Displays a stack of avatars with tooltip showing names.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { usePresence, type PresenceUser } from '@/hooks/usePresence';
import { getMediaUrl } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

interface PresenceIndicatorProps {
  projectId: number;
  currentUserId: number;
  maxVisible?: number;
}

// =============================================================================
// Avatar Component
// =============================================================================

function UserAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: PresenceUser;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.username.slice(0, 2).toUpperCase();

  // Generate a consistent color based on user ID
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
  ];
  const colorIndex = user.id % colors.length;
  const bgColor = colors[colorIndex];

  if (user.avatarUrl) {
    return (
      <img
        src={getMediaUrl(user.avatarUrl)}
        alt={user.name ?? user.username}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium ring-2 ring-white dark:ring-gray-800 ${className}`}
    >
      {initials}
    </div>
  );
}

// =============================================================================
// Tooltip Component
// =============================================================================

function Tooltip({ users, isConnected }: { users: PresenceUser[]; isConnected: boolean }) {
  return (
    <div className="absolute top-full right-0 mt-2 py-2 px-3 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg shadow-lg z-50 min-w-[150px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600">{isConnected ? 'Live' : 'Offline'}</span>
      </div>
      {users.length === 0 ? (
        <div className="text-gray-500 text-xs">No other users online</div>
      ) : (
        <div className="space-y-1">
          <div className="text-gray-500 text-xs mb-1">Also viewing:</div>
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <UserAvatar user={user} size="sm" />
              <span className="truncate text-gray-700">{user.name ?? user.username}</span>
            </div>
          ))}
        </div>
      )}
      {/* Arrow */}
      <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45" />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PresenceIndicator({
  projectId,
  currentUserId,
  maxVisible = 4,
}: PresenceIndicatorProps) {
  const { onlineUsers, isConnected } = usePresence({
    projectId,
    currentUserId,
  });
  const [showTooltip, setShowTooltip] = useState(false);

  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const hiddenCount = onlineUsers.length - maxVisible;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Connection status dot */}
      <div className="mr-2 flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
        {!isConnected && <span className="text-xs text-gray-500 dark:text-gray-400">Offline</span>}
      </div>

      {/* Avatar stack */}
      {visibleUsers.length > 0 && (
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <UserAvatar key={user.id} user={user} size="md" />
          ))}
          {hiddenCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
              +{hiddenCount}
            </div>
          )}
        </div>
      )}

      {/* Online count badge */}
      {onlineUsers.length > 0 && (
        <div className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
          {onlineUsers.length} online
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && <Tooltip users={onlineUsers} isConnected={isConnected} />}
    </div>
  );
}

export default PresenceIndicator;
