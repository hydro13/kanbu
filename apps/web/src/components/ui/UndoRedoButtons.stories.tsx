/*
 * UndoRedoButtons Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the UndoRedoButtons component.
 * Note: This component requires project context hooks, so stories show visual states only.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = {
  title: 'UI/UndoRedoButtons',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Undo/Redo buttons for edit operations. Shows enabled/disabled states based on undo/redo stack. Includes keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z).',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// Mock Icons
function UndoIcon({ className }: { className?: string }) {
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
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
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
        d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
      />
    </svg>
  );
}

// =============================================================================
// Visual States
// =============================================================================

export const BothEnabled: Story = {
  render: () => (
    <div className="flex items-center gap-0.5 rounded-lg border p-2">
      <button
        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <UndoIcon className="h-4 w-4" />
      </button>
      <button
        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <RedoIcon className="h-4 w-4" />
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Both undo and redo buttons enabled.',
      },
    },
  },
};

export const UndoOnly: Story = {
  render: () => (
    <div className="flex items-center gap-0.5 rounded-lg border p-2">
      <button
        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <UndoIcon className="h-4 w-4" />
      </button>
      <button
        disabled
        className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <RedoIcon className="h-4 w-4" />
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Only undo enabled, redo disabled (nothing to redo).',
      },
    },
  },
};

export const RedoOnly: Story = {
  render: () => (
    <div className="flex items-center gap-0.5 rounded-lg border p-2">
      <button
        disabled
        className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <UndoIcon className="h-4 w-4" />
      </button>
      <button
        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <RedoIcon className="h-4 w-4" />
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Only redo enabled, undo disabled (nothing to undo).',
      },
    },
  },
};

export const BothDisabled: Story = {
  render: () => (
    <div className="flex items-center gap-0.5 rounded-lg border p-2">
      <button
        disabled
        className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <UndoIcon className="h-4 w-4" />
      </button>
      <button
        disabled
        className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <RedoIcon className="h-4 w-4" />
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Both buttons disabled (no history).',
      },
    },
  },
};

// =============================================================================
// In Toolbar Context
// =============================================================================

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <button className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-0.5">
        <button
          className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon className="h-4 w-4" />
        </button>
        <button
          disabled
          className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <RedoIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-border" />

      <button className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Undo/Redo buttons in a toolbar with other actions.',
      },
    },
  },
};

// =============================================================================
// Visual Explanation
// =============================================================================

export const VisualStates: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">Fresh State (No History)</h3>
        <div className="flex items-center gap-0.5 rounded-lg border p-2 w-fit">
          <button
            disabled
            className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
          >
            <UndoIcon className="h-4 w-4" />
          </button>
          <button
            disabled
            className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
          >
            <RedoIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">No actions to undo or redo yet</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">After Making Changes</h3>
        <div className="flex items-center gap-0.5 rounded-lg border p-2 w-fit">
          <button className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
            <UndoIcon className="h-4 w-4" />
          </button>
          <button
            disabled
            className="p-1.5 rounded transition-colors text-muted-foreground/40 cursor-not-allowed"
          >
            <RedoIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Can undo recent changes</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">After Undoing</h3>
        <div className="flex items-center gap-0.5 rounded-lg border p-2 w-fit">
          <button className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
            <UndoIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
            <RedoIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Can undo further or redo what was undone
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different visual states based on undo/redo history.',
      },
    },
  },
};

export const KeyboardShortcuts: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-0.5 rounded-lg border p-2 w-fit">
        <button
          className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon className="h-4 w-4" />
        </button>
        <button
          className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <RedoIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-xs">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-xs">Z</kbd>
          <span className="text-muted-foreground">- Undo</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-xs">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-xs">Shift</kbd>
          <span>+</span>
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-xs">Z</kbd>
          <span className="text-muted-foreground">- Redo</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Keyboard shortcuts for undo and redo operations.',
      },
    },
  },
};
