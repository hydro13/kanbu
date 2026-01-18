/*
 * ConflictWarningModal Component
 * Version: 1.0.0
 *
 * Modal that warns users when a task was modified by another user
 * while they were editing. Offers options to reload or discard changes.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: realtime-conflict-handling
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2026-01-04T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

export interface ConflictWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  modifiedByUsername?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ConflictWarningModal({
  isOpen,
  onClose,
  onReload,
  modifiedByUsername,
}: ConflictWarningModalProps) {
  const handleReload = () => {
    onReload();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Task Modified</DialogTitle>
              <DialogDescription className="mt-1">Concurrent edit detected</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This task was modified by{' '}
            <span className="font-medium text-foreground">
              {modifiedByUsername ?? 'another user'}
            </span>{' '}
            while you were editing. Your changes could not be saved to prevent overwriting their
            work.
          </p>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Please reload the task to see the latest changes, then reapply your edits if needed.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
          <Button onClick={handleReload}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictWarningModal;
