/*
 * SwimlaneRow Component
 * Version: 1.0.0
 *
 * Row component for Kanban board swimlanes with header and collapsible content.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 1d704110-bdc1-417f-a584-942696f49132
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:46 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface Swimlane {
  id: number;
  name: string;
  description?: string | null;
  position: number;
  isActive: boolean;
  taskCount: number;
}

interface SwimlaneRowProps {
  swimlane: Swimlane;
  isCollapsed?: boolean;
  onToggleCollapse?: (swimlaneId: number) => void;
  onEditSwimlane?: (swimlaneId: number) => void;
  onDeleteSwimlane?: (swimlaneId: number) => void;
  onToggleActive?: (swimlaneId: number) => void;
  children?: React.ReactNode;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SwimlaneRow({
  swimlane,
  isCollapsed = false,
  onToggleCollapse,
  onEditSwimlane,
  onDeleteSwimlane,
  onToggleActive,
  children,
  className,
}: SwimlaneRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('border-b last:border-b-0', !swimlane.isActive && 'opacity-50', className)}>
      {/* Swimlane Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        {/* Left side: Collapse toggle and name */}
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            <button
              onClick={() => onToggleCollapse(swimlane.id)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={isCollapsed ? 'Expand swimlane' : 'Collapse swimlane'}
            >
              <ChevronIcon
                className={cn('h-4 w-4 transition-transform', isCollapsed && '-rotate-90')}
              />
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{swimlane.name}</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
              {swimlane.taskCount}
            </span>
            {!swimlane.isActive && (
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded">
                Hidden
              </span>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        {(onEditSwimlane || onDeleteSwimlane || onToggleActive) && (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowMenu(!showMenu)}
              title="Swimlane options"
            >
              <MoreIcon className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-popover border rounded-md shadow-lg z-10">
                {onEditSwimlane && (
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onEditSwimlane(swimlane.id);
                    }}
                  >
                    <EditIcon className="h-4 w-4" />
                    Edit swimlane
                  </button>
                )}
                {onToggleActive && (
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onToggleActive(swimlane.id);
                    }}
                  >
                    {swimlane.isActive ? (
                      <>
                        <EyeOffIcon className="h-4 w-4" />
                        Hide swimlane
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4" />
                        Show swimlane
                      </>
                    )}
                  </button>
                )}
                {onDeleteSwimlane && (
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteSwimlane(swimlane.id);
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete swimlane
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Swimlane Content (collapsible) */}
      {!isCollapsed && <div className="min-h-[100px]">{children}</div>}
    </div>
  );
}

// =============================================================================
// Icons (inline SVG to avoid external dependencies)
// =============================================================================

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default SwimlaneRow;
