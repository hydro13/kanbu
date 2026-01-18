/*
 * ViewSwitcher Component
 * Version: 1.0.0
 *
 * Toggle buttons to switch between different project views.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: de75c403-118c-4293-8d05-c2e3147fd7c8
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useNavigate, useLocation } from 'react-router-dom';
import {
  useViewPreference,
  getViewPath,
  getViewFromPath,
  type ViewType,
} from '@/hooks/useViewPreference';

// =============================================================================
// Icons
// =============================================================================

function BoardIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

// =============================================================================
// View Config
// =============================================================================

interface ViewConfig {
  type: ViewType;
  label: string;
  icon: React.ComponentType;
}

const views: ViewConfig[] = [
  { type: 'board', label: 'Board', icon: BoardIcon },
  { type: 'list', label: 'List', icon: ListIcon },
  { type: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { type: 'timeline', label: 'Timeline', icon: TimelineIcon },
];

// =============================================================================
// Component
// =============================================================================

export interface ViewSwitcherProps {
  projectId: number;
  /** Compact mode shows only icons */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function ViewSwitcher({ projectId, compact = false, className = '' }: ViewSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setView } = useViewPreference(projectId);

  // Get current view from URL
  const currentView = getViewFromPath(location.pathname);

  const handleViewChange = (view: ViewType) => {
    setView(view);
    navigate(getViewPath(projectId, view));
  };

  return (
    <div
      className={`flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.type;

        return (
          <button
            key={view.type}
            onClick={() => handleViewChange(view.type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'bg-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={view.label}
          >
            <Icon />
            {!compact && <span>{view.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Dropdown Variant
// =============================================================================

export interface ViewSwitcherDropdownProps {
  projectId: number;
  className?: string;
}

export function ViewSwitcherDropdown({ projectId, className = '' }: ViewSwitcherDropdownProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setView } = useViewPreference(projectId);

  const currentView = getViewFromPath(location.pathname);
  const currentConfig = views.find((v) => v.type === currentView) ?? views[0]!;
  const CurrentIcon = currentConfig.icon;

  const handleViewChange = (view: ViewType) => {
    setView(view);
    navigate(getViewPath(projectId, view));
  };

  return (
    <div className={`relative group ${className}`}>
      <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
        <CurrentIcon />
        <span>{currentConfig.label}</span>
        <svg
          className="h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="absolute left-0 top-full mt-1 w-40 bg-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = currentView === view.type;

          return (
            <button
              key={view.type}
              onClick={() => handleViewChange(view.type)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <Icon />
              <span>{view.label}</span>
              {isActive && (
                <svg
                  className="h-4 w-4 ml-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ViewSwitcher;
