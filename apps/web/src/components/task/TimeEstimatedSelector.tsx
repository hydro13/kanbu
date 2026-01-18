/*
 * TimeEstimatedSelector Component
 * Version: 1.0.0
 *
 * Inline editor for task time estimates.
 * Supports hours input with optional minutes.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T13:15 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { X, Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface TimeEstimatedSelectorProps {
  taskId: number;
  currentHours: number;
  onTimeChange?: (hours: number) => void;
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatTimeForDisplay(hours: number): string {
  if (hours === 0) return 'Not set';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseTimeInput(input: string): number {
  // Support formats: "2", "2h", "2.5", "2h 30m", "30m", "2:30"
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) return 0;

  // Try "Xh Ym" format
  const hhmm = trimmed.match(/^(\d+(?:\.\d+)?)\s*h(?:\s+(\d+)\s*m)?$/);
  if (hhmm) {
    const hours = parseFloat(hhmm[1] ?? '0');
    const mins = parseInt(hhmm[2] ?? '0', 10);
    return hours + mins / 60;
  }

  // Try "Xm" format (minutes only)
  const mOnly = trimmed.match(/^(\d+)\s*m$/);
  if (mOnly) {
    return parseInt(mOnly[1] ?? '0', 10) / 60;
  }

  // Try "X:Y" format (hours:minutes)
  const colonFormat = trimmed.match(/^(\d+):(\d+)$/);
  if (colonFormat) {
    const hours = parseInt(colonFormat[1] ?? '0', 10);
    const mins = parseInt(colonFormat[2] ?? '0', 10);
    return hours + mins / 60;
  }

  // Try plain number (treat as hours)
  const num = parseFloat(trimmed);
  return isNaN(num) ? 0 : num;
}

// =============================================================================
// Component
// =============================================================================

export function TimeEstimatedSelector({
  taskId,
  currentHours,
  onTimeChange,
  disabled = false,
}: TimeEstimatedSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId });
      setIsEditing(false);
    },
  });

  // Set input value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // Show current value in a nice format for editing
      if (currentHours === 0) {
        setInputValue('');
      } else if (currentHours < 1) {
        setInputValue(`${Math.round(currentHours * 60)}m`);
      } else {
        const h = Math.floor(currentHours);
        const m = Math.round((currentHours - h) * 60);
        setInputValue(m > 0 ? `${h}h ${m}m` : `${h}h`);
      }
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, currentHours]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isEditing) {
          handleSave();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, inputValue]);

  const handleSave = () => {
    const newHours = parseTimeInput(inputValue);

    // Only save if different (with small epsilon for float comparison)
    if (Math.abs(newHours - currentHours) > 0.001) {
      updateMutation.mutate(
        { taskId, timeEstimated: newHours },
        {
          onSuccess: () => {
            onTimeChange?.(newHours);
          },
        }
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate(
      { taskId, timeEstimated: 0 },
      {
        onSuccess: () => {
          onTimeChange?.(0);
          setIsEditing(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={updateMutation.isPending}
          placeholder="e.g. 2h, 30m, 2h 30m"
          className="flex-1 px-2 py-1 text-sm border border-input rounded bg-background text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="group flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">Estimated:</span>
      <button
        onClick={() => !disabled && setIsEditing(true)}
        disabled={disabled || updateMutation.isPending}
        className={`flex items-center gap-1 transition-colors ${
          disabled
            ? 'cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded px-1'
        }`}
      >
        {updateMutation.isPending ? (
          <span className="text-gray-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        ) : (
          <>
            <span
              className={`text-sm ${currentHours === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-foreground'}`}
            >
              {formatTimeForDisplay(currentHours)}
            </span>
            {currentHours > 0 && !disabled && (
              <button
                onClick={handleClear}
                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                title="Clear estimate"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        )}
      </button>
    </div>
  );
}

export default TimeEstimatedSelector;
