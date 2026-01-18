/*
 * SearchInput Component
 * Version: 1.0.0
 *
 * Global search input with dropdown results and keyboard navigation.
 * Searches tasks, comments, and wiki pages.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:55 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

interface SearchResult {
  type: 'task' | 'comment' | 'wiki';
  id: number;
  title: string;
  snippet: string;
  taskId?: number;
  taskTitle?: string;
  updatedAt: string;
}

interface SearchInputProps {
  projectId: number;
  placeholder?: string;
  className?: string;
  onTaskSelect?: (taskId: number) => void;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function TaskIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function CommentIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function WikiIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function LoadingSpinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// Result Type Icon
// =============================================================================

function ResultTypeIcon({ type }: { type: 'task' | 'comment' | 'wiki' }) {
  const iconClass = 'h-4 w-4 flex-shrink-0';
  switch (type) {
    case 'task':
      return <TaskIcon className={`${iconClass} text-blue-500`} />;
    case 'comment':
      return <CommentIcon className={`${iconClass} text-green-500`} />;
    case 'wiki':
      return <WikiIcon className={`${iconClass} text-purple-500`} />;
  }
}

// =============================================================================
// Debounce Hook
// =============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// SearchInput Component
// =============================================================================

export function SearchInput({
  projectId,
  placeholder = 'Search tasks, comments, wiki...',
  className = '',
  onTaskSelect,
}: SearchInputProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounce search query
  const debouncedQuery = useDebounce(query, 300);

  // Search query
  const searchQuery = trpc.search.global.useQuery(
    {
      projectId,
      query: debouncedQuery,
      limit: 10,
    },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 30 * 1000,
    }
  );

  const results = useMemo(() => {
    return (searchQuery.data ?? []) as SearchResult[];
  }, [searchQuery.data]);

  const isLoading = searchQuery.isLoading && debouncedQuery.length >= 2;
  const showResults = isOpen && query.length >= 2;

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.type === 'task') {
        if (onTaskSelect) {
          onTaskSelect(result.id);
        } else {
          navigate(`/project/${projectId}/task/${result.id}`);
        }
      } else if (result.type === 'comment' && result.taskId) {
        if (onTaskSelect) {
          onTaskSelect(result.taskId);
        } else {
          navigate(`/project/${projectId}/task/${result.taskId}`);
        }
      } else if (result.type === 'wiki') {
        navigate(`/project/${projectId}/wiki/${result.id}`);
      }
      setQuery('');
      setIsOpen(false);
    },
    [projectId, navigate, onTaskSelect]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showResults) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [showResults, results, selectedIndex, handleSelect]
  );

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedEl = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <LoadingSpinner className="h-4 w-4 text-gray-400" />
          ) : (
            <SearchIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
        {/* Keyboard shortcut hint */}
        {!query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700"
        >
          {results.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              No results found for "{query}"
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ResultTypeIcon type={result.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {result.title}
                    </span>
                    <span className="text-xs text-gray-400 uppercase">{result.type}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {result.snippet}
                  </p>
                  {result.taskTitle && (
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      in task: {result.taskTitle}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
          {/* Keyboard navigation hint */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ml-0.5">
                  ↓
                </kbd>{' '}
                navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd> select
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">esc</kbd> close
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchInput;
