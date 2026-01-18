/*
 * Keyboard Shortcuts Definitions
 * Version: 1.0.0
 *
 * Central shortcut definitions with platform detection (Cmd vs Ctrl).
 * Used by useKeyboardShortcuts hook and ShortcutsModal.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T21:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// Platform Detection
// =============================================================================

/**
 * Detect if the user is on macOS
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().includes('MAC');
}

/**
 * Get the modifier key symbol based on platform
 */
export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Get the modifier key name for display
 */
export function getModifierKeyName(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

// =============================================================================
// Types
// =============================================================================

export type ShortcutCategory =
  | 'global'
  | 'navigation'
  | 'dashboard'
  | 'workspace'
  | 'board'
  | 'task';

export interface ShortcutDefinition {
  id: string;
  key: string;
  modifiers?: {
    cmd?: boolean; // Cmd on Mac, Ctrl on Windows/Linux
    shift?: boolean;
    alt?: boolean;
  };
  description: string;
  category: ShortcutCategory;
  /** Whether this shortcut should work in input fields */
  allowInInputs?: boolean;
}

export interface ShortcutGroup {
  category: ShortcutCategory;
  label: string;
  shortcuts: ShortcutDefinition[];
}

// =============================================================================
// Shortcut Definitions
// =============================================================================

export const SHORTCUTS: ShortcutDefinition[] = [
  // Global shortcuts
  {
    id: 'show-help',
    key: '?',
    description: 'Show keyboard shortcuts',
    category: 'global',
  },
  {
    id: 'command-palette',
    key: 'k',
    modifiers: { cmd: true },
    description: 'Open command palette',
    category: 'global',
    allowInInputs: true,
  },
  {
    id: 'toggle-sidebar',
    key: '/',
    modifiers: { cmd: true },
    description: 'Toggle sidebar',
    category: 'global',
  },
  {
    id: 'close-modal',
    key: 'Escape',
    description: 'Close modal / deselect',
    category: 'global',
    allowInInputs: true,
  },

  // Navigation shortcuts (via Command Palette)
  {
    id: 'goto-dashboard',
    key: 'g d',
    description: 'Go to Dashboard',
    category: 'navigation',
  },
  {
    id: 'goto-tasks',
    key: 'g t',
    description: 'Go to My Tasks',
    category: 'navigation',
  },
  {
    id: 'goto-inbox',
    key: 'g i',
    description: 'Go to Inbox',
    category: 'navigation',
  },
  {
    id: 'goto-workspaces',
    key: 'g w',
    description: 'Go to Workspaces',
    category: 'navigation',
  },
  {
    id: 'goto-notes',
    key: 'g n',
    description: 'Go to Notes',
    category: 'navigation',
  },

  // Board shortcuts
  {
    id: 'new-task',
    key: 'n',
    description: 'New task',
    category: 'board',
  },
  {
    id: 'focus-filter',
    key: 'f',
    description: 'Focus filter input',
    category: 'board',
  },
  {
    id: 'column-1',
    key: '1',
    description: 'Focus column 1',
    category: 'board',
  },
  {
    id: 'column-2',
    key: '2',
    description: 'Focus column 2',
    category: 'board',
  },
  {
    id: 'column-3',
    key: '3',
    description: 'Focus column 3',
    category: 'board',
  },
  {
    id: 'column-4',
    key: '4',
    description: 'Focus column 4',
    category: 'board',
  },
  {
    id: 'column-5',
    key: '5',
    description: 'Focus column 5',
    category: 'board',
  },
  {
    id: 'navigate-up',
    key: 'ArrowUp',
    description: 'Navigate up',
    category: 'board',
  },
  {
    id: 'navigate-down',
    key: 'ArrowDown',
    description: 'Navigate down',
    category: 'board',
  },
  {
    id: 'navigate-left',
    key: 'ArrowLeft',
    description: 'Navigate left',
    category: 'board',
  },
  {
    id: 'navigate-right',
    key: 'ArrowRight',
    description: 'Navigate right',
    category: 'board',
  },

  // Task selected shortcuts
  {
    id: 'open-detail',
    key: 'Enter',
    description: 'Open task detail',
    category: 'task',
  },
  {
    id: 'edit-title',
    key: 'e',
    description: 'Edit task title',
    category: 'task',
  },
  {
    id: 'change-priority',
    key: 'p',
    description: 'Change priority',
    category: 'task',
  },
  {
    id: 'move-task',
    key: 'm',
    description: 'Move to column',
    category: 'task',
  },
  {
    id: 'close-task',
    key: 'c',
    description: 'Close task',
    category: 'task',
  },
  {
    id: 'delete-task',
    key: 'Delete',
    description: 'Delete task',
    category: 'task',
  },
];

// =============================================================================
// Grouped Shortcuts (for display)
// =============================================================================

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'global',
    label: 'Global',
    shortcuts: SHORTCUTS.filter((s) => s.category === 'global'),
  },
  {
    category: 'navigation',
    label: 'Quick Navigation',
    shortcuts: SHORTCUTS.filter((s) => s.category === 'navigation'),
  },
  {
    category: 'dashboard',
    label: 'Dashboard',
    shortcuts: SHORTCUTS.filter((s) => s.category === 'dashboard'),
  },
  {
    category: 'workspace',
    label: 'Workspace',
    shortcuts: SHORTCUTS.filter((s) => s.category === 'workspace'),
  },
  {
    category: 'board',
    label: 'Board Navigation',
    shortcuts: SHORTCUTS.filter((s) => s.category === 'board'),
  },
  {
    category: 'task',
    label: 'Task Actions',
    shortcuts: SHORTCUTS.filter((s) => s.category === 'task'),
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a shortcut for display (e.g., "⌘K" or "Ctrl+K")
 */
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];

  if (shortcut.modifiers?.cmd) {
    parts.push(getModifierKey());
  }
  if (shortcut.modifiers?.shift) {
    parts.push('⇧');
  }
  if (shortcut.modifiers?.alt) {
    parts.push(isMac() ? '⌥' : 'Alt');
  }

  // Format the key
  let displayKey = shortcut.key;

  // Handle chord shortcuts (e.g., "g d" -> "G then D")
  if (displayKey.includes(' ')) {
    const chordParts = displayKey.split(' ');
    displayKey = chordParts.map((k) => k.toUpperCase()).join(' then ');
    parts.push(displayKey);
    return parts.join(isMac() ? '' : '+');
  }

  if (displayKey === 'ArrowUp') displayKey = '↑';
  else if (displayKey === 'ArrowDown') displayKey = '↓';
  else if (displayKey === 'ArrowLeft') displayKey = '←';
  else if (displayKey === 'ArrowRight') displayKey = '→';
  else if (displayKey === 'Escape') displayKey = 'Esc';
  else if (displayKey === 'Delete') displayKey = '⌫';
  else if (displayKey === 'Enter') displayKey = '↵';
  else displayKey = displayKey.toUpperCase();

  parts.push(displayKey);

  return parts.join(isMac() ? '' : '+');
}

/**
 * Characters that inherently require Shift key on most keyboards
 * For these, we ignore the shift key check
 */
const SHIFT_CHARS = new Set([
  '?',
  '!',
  '@',
  '#',
  '$',
  '%',
  '^',
  '&',
  '*',
  '(',
  ')',
  '_',
  '+',
  '{',
  '}',
  '|',
  ':',
  '"',
  '<',
  '>',
  '~',
]);

/**
 * Check if a keyboard event matches a shortcut definition
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDefinition): boolean {
  // Check the key
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Check modifiers
  const wantCmd = shortcut.modifiers?.cmd ?? false;
  const wantShift = shortcut.modifiers?.shift ?? false;
  const wantAlt = shortcut.modifiers?.alt ?? false;

  // On Mac, check metaKey. On other platforms, check ctrlKey
  const hasCmd = isMac() ? event.metaKey : event.ctrlKey;

  if (hasCmd !== wantCmd) return false;

  // For characters that inherently require Shift (like ?), ignore shift check
  // unless the shortcut explicitly wants Shift as a modifier
  if (!SHIFT_CHARS.has(shortcut.key)) {
    if (event.shiftKey !== wantShift) return false;
  }

  if (event.altKey !== wantAlt) return false;

  return true;
}

/**
 * Check if the event target is an input element
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  // Check for contenteditable
  if (target.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Get a shortcut by ID
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return SHORTCUTS.find((s) => s.id === id);
}
