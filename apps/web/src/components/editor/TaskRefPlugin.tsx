/**
 * Task Reference Plugin for Lexical Editor
 *
 * Handles #TASK-123 syntax detection and autocomplete.
 * When user types # followed by characters, shows a dropdown with matching tasks.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 3 - Cross References)
 * ===================================================================
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  TextNode,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { $createTaskRefNode } from './nodes/TaskRefNode';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface TaskResult {
  id: number;
  title: string;
  reference: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isActive?: boolean;
  column?: { title: string };
}

export interface TaskRefPluginProps {
  /** Function to search for tasks */
  searchTasks?: (query: string) => Promise<TaskResult[]>;
  /** Project ID for searching tasks */
  projectId?: number;
}

// =============================================================================
// Priority Badge Component
// =============================================================================

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  return (
    <span className={cn('text-[10px] px-1 rounded', priorityColors[priority] ?? 'bg-gray-100')}>
      {priority}
    </span>
  );
}

// =============================================================================
// Types for positioning
// =============================================================================

interface AnchorRect {
  left: number;
  top: number;
  bottom: number;
}

// =============================================================================
// Autocomplete Dropdown Component
// =============================================================================

interface AutocompleteDropdownProps {
  anchorRect: AnchorRect | null;
  items: TaskResult[];
  selectedIndex: number;
  onSelect: (task: TaskResult) => void;
  query: string;
  isLoading?: boolean;
}

function AutocompleteDropdown({
  anchorRect,
  items,
  selectedIndex,
  onSelect,
  query,
  isLoading,
}: AutocompleteDropdownProps) {
  if (!anchorRect) return null;

  // Calculate position - center horizontally with some constraints
  const dropdownWidth = 380;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Position below cursor, but center the dropdown
  let left = anchorRect.left - dropdownWidth / 2 + 10;
  // Constrain to viewport
  left = Math.max(16, Math.min(left, viewportWidth - dropdownWidth - 16));

  // Position below cursor, or above if not enough space below
  let top = anchorRect.bottom + 8;
  const dropdownHeight = 300; // approximate max height
  if (top + dropdownHeight > viewportHeight - 16) {
    top = anchorRect.top - dropdownHeight - 8;
  }

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-xl overflow-hidden"
      style={{
        top,
        left,
        width: dropdownWidth,
      }}
    >
      {isLoading ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">Searching tasks...</div>
      ) : items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          {query ? `No tasks matching "${query}"` : 'Type to search tasks...'}
        </div>
      ) : (
        <div className="max-h-[250px] overflow-y-auto">
          {items.map((task, index) => (
            <button
              key={task.id}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => onSelect(task)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  #{task.reference}
                </span>
                <span className="text-sm font-medium truncate flex-1">{task.title}</span>
                <PriorityBadge priority={task.priority} />
              </div>
              {task.column && (
                <div className="text-xs text-muted-foreground mt-0.5">{task.column.title}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

// =============================================================================
// Main Plugin
// =============================================================================

export function TaskRefPlugin({
  searchTasks,
  projectId: _projectId,
}: TaskRefPluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [searchResults, setSearchResults] = useState<TaskResult[]>([]);
  const [triggerOffset, setTriggerOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Guard against duplicate insertions
  const isInsertingRef = useRef(false);

  // Search effect for async search
  useEffect(() => {
    if (!searchTasks || !isOpen) {
      setSearchResults([]);
      return;
    }

    // Only search if we have at least 1 character (to match PREFIX-NUM pattern)
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchTasks(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Task search failed:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, searchTasks, isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Insert task reference
  const insertTaskRef = useCallback(
    (task: TaskResult) => {
      // Prevent duplicate insertions
      if (isInsertingRef.current) return;
      isInsertingRef.current = true;

      // Close dropdown immediately to prevent double-clicks
      setIsOpen(false);
      setQuery('');
      const currentTriggerOffset = triggerOffset;
      setTriggerOffset(null);

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || currentTriggerOffset === null) {
          isInsertingRef.current = false;
          return;
        }

        // Get the text node and remove the # and query
        const anchor = selection.anchor;
        const node = anchor.getNode();

        if (node instanceof TextNode) {
          const text = node.getTextContent();
          // Find the # trigger position
          const beforeTrigger = text.substring(0, currentTriggerOffset);
          const afterCursor = text.substring(anchor.offset);

          // Create the task ref node
          const taskRefNode = $createTaskRefNode({
            taskId: task.id,
            reference: task.reference,
            title: task.title,
            exists: true,
          });

          // Replace the text with our link
          node.setTextContent(beforeTrigger);

          // Insert after the shortened text node
          node.insertAfter(taskRefNode);

          // Add any remaining text after
          if (afterCursor) {
            const afterNode = $createTextNode(afterCursor);
            taskRefNode.insertAfter(afterNode);
          }

          // Add a space after the link for better UX
          const spaceNode = $createTextNode(' ');
          taskRefNode.insertAfter(spaceNode);

          // Move selection to after the space
          spaceNode.select(1, 1);
        }

        // Reset insertion guard after update completes
        setTimeout(() => {
          isInsertingRef.current = false;
        }, 100);
      });
    },
    [editor, triggerOffset]
  );

  // Handle selection
  const handleSelect = useCallback(
    (task: TaskResult) => {
      insertTaskRef(task);
    },
    [insertTaskRef]
  );

  // Update listener to detect # and track query
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();

        if (!(node instanceof TextNode)) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        const text = node.getTextContent();
        const cursorPos = anchor.offset;

        // Find # before cursor that could be a task reference trigger
        const textBeforeCursor = text.substring(0, cursorPos);

        // Look for # that is either at the start or after whitespace
        // This prevents triggering on URLs or other # usages
        let triggerIndex = -1;
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
          if (textBeforeCursor[i] === '#') {
            // Check if it's a valid trigger position (start or after whitespace)
            if (i === 0 || /\s/.test(textBeforeCursor[i - 1] ?? '')) {
              triggerIndex = i;
              break;
            }
          }
          // Stop looking if we hit whitespace (no # found in this word)
          if (/\s/.test(textBeforeCursor[i] ?? '')) {
            break;
          }
        }

        if (triggerIndex === -1) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        // Get the query after #
        const queryText = textBeforeCursor.substring(triggerIndex + 1);

        // If query contains whitespace, close the dropdown (user is done)
        if (/\s/.test(queryText)) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        // We have a valid # trigger, show dropdown
        setQuery(queryText);
        setTriggerOffset(triggerIndex);

        if (!isOpenRef.current) {
          setIsOpen(true);
        }

        // Always update anchor position while open
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setAnchorRect({
            left: rect.left,
            top: rect.top,
            bottom: rect.bottom,
          });
        }
      });
    });
  }, [editor]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          event?.preventDefault();
          setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          event?.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          if (searchResults[selectedIndex]) {
            event?.preventDefault();
            handleSelect(searchResults[selectedIndex]);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          if (searchResults[selectedIndex]) {
            event?.preventDefault();
            handleSelect(searchResults[selectedIndex]);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (!isOpenRef.current) return false;
          setIsOpen(false);
          setQuery('');
          setTriggerOffset(null);
          return true;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, isOpen, searchResults, selectedIndex, handleSelect]);

  // Update anchor position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setAnchorRect({
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Don't render if no search function provided
  if (!searchTasks) return null;

  return isOpen ? (
    <AutocompleteDropdown
      anchorRect={anchorRect}
      items={searchResults}
      selectedIndex={selectedIndex}
      onSelect={handleSelect}
      query={query}
      isLoading={isLoading}
    />
  ) : null;
}

export default TaskRefPlugin;
