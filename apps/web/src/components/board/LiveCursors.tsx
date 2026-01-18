/**
 * Live Cursors Component
 *
 * Renders cursor positions of other users on the board.
 * Each cursor shows the user's name and a colored pointer.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useCursors, type CursorData } from '@/hooks/useCursors';

// =============================================================================
// Types
// =============================================================================

interface LiveCursorsProps {
  projectId: number;
  currentUserId: number;
  enabled?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
}

interface ContainerInfo {
  // Container position on screen
  left: number;
  top: number;
  // Current scroll position
  scrollLeft: number;
  scrollTop: number;
}

// =============================================================================
// Constants
// =============================================================================

// Cursor colors based on user ID
const CURSOR_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
];

// =============================================================================
// Cursor SVG Component
// =============================================================================

function CursorPointer({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      <path
        d="M5.65376 12.4561C5.3825 12.5996 5.05001 12.4102 5.05001 12.1001V2.75001C5.05001 2.43998 5.40001 2.25001 5.65001 2.42001L16.5 9.12001C16.7894 9.31001 16.7894 9.73501 16.5 9.92501L11.35 13.295L8.65376 18.4561C8.52 18.7333 8.16001 18.8111 7.91001 18.6101L5.65376 12.4561Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// =============================================================================
// Single Cursor Component
// =============================================================================

interface CursorProps {
  cursor: CursorData;
  containerInfo: ContainerInfo | null;
}

function Cursor({ cursor, containerInfo }: CursorProps) {
  const colorIndex = cursor.user.id % CURSOR_COLORS.length;
  const color = CURSOR_COLORS[colorIndex];
  const displayName = cursor.user.name ?? cursor.user.username;

  // Convert world coordinates to screen coordinates
  // This is the inverse of what we do when sending:
  // Screen position = container position + (world position - scroll offset)
  const screenPosition = useMemo(() => {
    if (!containerInfo) {
      // Can't render without container info
      return null;
    }

    // World to screen: worldPos - scrollOffset + containerOffset
    const screenX = containerInfo.left + (cursor.worldX - containerInfo.scrollLeft);
    const screenY = containerInfo.top + (cursor.worldY - containerInfo.scrollTop);

    return { x: screenX, y: screenY };
  }, [cursor.worldX, cursor.worldY, containerInfo]);

  // Don't render if we don't have position or if cursor is outside visible area
  if (!screenPosition) {
    return null;
  }

  // Check if cursor is within visible bounds (with some padding)
  const isVisible =
    screenPosition.x >= -50 &&
    screenPosition.y >= -50 &&
    screenPosition.x <= window.innerWidth + 50 &&
    screenPosition.y <= window.innerHeight + 50;

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-[9999] transition-all duration-75 ease-out"
      style={{
        left: screenPosition.x,
        top: screenPosition.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      <CursorPointer color={color ?? '#3B82F6'} />
      <div
        className="absolute left-5 top-4 px-2 py-0.5 text-xs text-white rounded whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {displayName}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function LiveCursors({
  projectId,
  currentUserId,
  enabled = true,
  containerRef,
}: LiveCursorsProps) {
  const { cursors, sendCursorPosition } = useCursors({
    projectId,
    currentUserId,
    enabled,
    containerRef,
  });

  // Track container info for converting world coordinates to screen coordinates
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);

  // Track mouse movement
  const lastPositionRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;

      // Only send if position changed significantly
      const dx = Math.abs(e.clientX - lastPositionRef.current.x);
      const dy = Math.abs(e.clientY - lastPositionRef.current.y);

      if (dx > 3 || dy > 3) {
        lastPositionRef.current = { x: e.clientX, y: e.clientY };
        sendCursorPosition(e.clientX, e.clientY);
      }
    },
    [enabled, sendCursorPosition]
  );

  // Update container info (position + scroll) for world-to-screen conversion
  const updateContainerInfo = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContainerInfo({
      left: rect.left,
      top: rect.top,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
  }, [containerRef]);

  // Attach mouse move listener and track container info
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);

    // Initial measurement
    updateContainerInfo();

    // Update on resize, scroll (window), and container scroll
    window.addEventListener('resize', updateContainerInfo);
    window.addEventListener('scroll', updateContainerInfo, true);
    container.addEventListener('scroll', updateContainerInfo);

    // Also update periodically to catch any missed scroll events
    const interval = setInterval(updateContainerInfo, 100);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', updateContainerInfo);
      window.removeEventListener('scroll', updateContainerInfo, true);
      container.removeEventListener('scroll', updateContainerInfo);
      clearInterval(interval);
    };
  }, [enabled, containerRef, handleMouseMove, updateContainerInfo]);

  if (!enabled || cursors.size === 0) {
    return null;
  }

  return (
    <>
      {Array.from(cursors.values()).map((cursor) => (
        <Cursor key={cursor.user.id} cursor={cursor} containerInfo={containerInfo} />
      ))}
    </>
  );
}

export default LiveCursors;
