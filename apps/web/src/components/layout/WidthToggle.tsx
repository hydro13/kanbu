/**
 * Width Toggle Component
 *
 * A header button that allows users to toggle between normal and full-width
 * page layouts. Click toggles directly, dropdown shows save option.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useState, useRef, useEffect } from 'react';
import { usePageWidth } from '@/hooks/usePageWidth';

// =============================================================================
// Icons
// =============================================================================

function WidthIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {/* Double arrow (↔) icon */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l-4-4"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PinIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export interface WidthToggleProps {
  className?: string;
}

export function WidthToggle({ className = '' }: WidthToggleProps) {
  const { isFullWidth, isPinned, showPulseHint, toggle, togglePin } = usePageWidth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pulse animation class
  const pulseClass = showPulseHint ? 'animate-pulse' : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Button group: Toggle + Dropdown arrow */}
      <div className="flex items-center">
        {/* Main Toggle Button - Direct click toggles width */}
        <button
          onClick={toggle}
          className={`
            p-1.5 rounded-l-md transition-colors border-r border-gray-200 dark:border-gray-600
            hover:bg-accent
            ${isFullWidth ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-400 dark:text-gray-500'}
            ${pulseClass}
          `}
          title={isFullWidth ? 'Switch to normal width' : 'Switch to full width'}
        >
          <WidthIcon className="h-5 w-5" />
        </button>

        {/* Dropdown arrow button */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`
            p-1.5 rounded-r-md transition-colors
            hover:bg-accent
            ${isFullWidth ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}
          `}
          title="Options"
        >
          <ChevronDownIcon className="h-3 w-3" />
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100]"
        >
          {/* Current state indicator */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Page Width
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isFullWidth
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {isFullWidth ? 'Full' : 'Normal'}
              </span>
            </div>
          </div>

          {/* Save Option */}
          <div className="p-2">
            <button
              onClick={() => {
                togglePin();
                setShowDropdown(false);
              }}
              className={`
                w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors
                ${isPinned
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-accent'
                }
              `}
            >
              <PinIcon className="h-4 w-4" filled={isPinned} />
              <span>{isPinned ? 'Saved for this page' : 'Save for this page'}</span>
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-2">
              {isPinned
                ? 'Click to remove saved preference'
                : 'Remember this width setting for this page'}
            </p>
          </div>

          {/* Arrow */}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

export default WidthToggle;
