/*
 * AclImportDialog Component
 * Version: 1.0.0
 *
 * Import ACL configuration from JSON or CSV format.
 *
 * Features:
 * - File upload or paste
 * - Format auto-detection
 * - Preview of changes
 * - Mode selection (skip, overwrite, merge)
 * - Execute import
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.5 - Advanced ACL UI
 * =============================================================================
 */

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface AclImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

type ImportFormat = 'json' | 'csv';
type ImportMode = 'skip' | 'overwrite' | 'merge';

// =============================================================================
// Icons
// =============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AclImportDialog({ isOpen, onClose, onImported }: AclImportDialogProps) {
  // Form state
  const [data, setData] = useState<string>('');
  const [format, setFormat] = useState<ImportFormat>('json');
  const [mode, setMode] = useState<ImportMode>('skip');
  const [fileName, setFileName] = useState<string | null>(null);

  // UI state
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Preview mutation
  const previewMutation = trpc.acl.importPreview.useMutation();

  // Execute mutation
  const executeMutation = trpc.acl.importExecute.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate();
      setStep('done');
      onImported?.();
    },
  });

  // Handle file upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Auto-detect format
    if (file.name.endsWith('.json')) {
      setFormat('json');
    } else if (file.name.endsWith('.csv')) {
      setFormat('csv');
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setData(content);
    };
    reader.readAsText(file);
  };

  // Run preview
  const handlePreview = async () => {
    try {
      await previewMutation.mutateAsync({
        data,
        format,
        mode,
      });
      setStep('preview');
    } catch {
      // Error handled by mutation
    }
  };

  // Execute import
  const handleExecute = async () => {
    try {
      await executeMutation.mutateAsync({
        data,
        format,
        mode,
      });
    } catch {
      // Error handled by mutation
    }
  };

  // Reset dialog
  const handleClose = () => {
    setData('');
    setFileName(null);
    setStep('upload');
    previewMutation.reset();
    executeMutation.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Import ACL Configuration</h3>
              <p className="text-xs text-gray-500">
                {step === 'upload' && 'Upload a JSON or CSV file'}
                {step === 'preview' && 'Review changes before importing'}
                {step === 'done' && 'Import completed'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-accent rounded">
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-input rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <UploadIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {fileName ? (
                    <span className="text-blue-600">{fileName}</span>
                  ) : (
                    <>Click to upload or drag and drop</>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">JSON or CSV files</p>
              </div>

              {/* Or paste content */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Or paste content directly
                </label>
                <textarea
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  placeholder="Paste JSON or CSV content here..."
                  className="w-full h-32 px-3 py-2 text-sm border border-input rounded bg-background text-foreground font-mono"
                />
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Format
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormat('json')}
                    className={cn(
                      'flex-1 py-2 text-sm rounded border',
                      format === 'json'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-50 dark:bg-gray-700 border-input text-gray-600 dark:text-gray-400'
                    )}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setFormat('csv')}
                    className={cn(
                      'flex-1 py-2 text-sm rounded border',
                      format === 'csv'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-50 dark:bg-gray-700 border-input text-gray-600 dark:text-gray-400'
                    )}
                  >
                    CSV
                  </button>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Conflict Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ImportMode)}
                  className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-foreground"
                >
                  <option value="skip">Skip existing entries</option>
                  <option value="overwrite">Overwrite existing entries</option>
                  <option value="merge">Merge permissions (OR)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {mode === 'skip' && 'Existing ACL entries will be kept unchanged'}
                  {mode === 'overwrite' && 'Existing ACL entries will be replaced'}
                  {mode === 'merge' && 'New permissions will be added to existing (bitwise OR)'}
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && previewMutation.data && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {previewMutation.data.toCreate}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">To Create</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {previewMutation.data.toUpdate}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">To Update</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {previewMutation.data.toSkip}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">To Skip</div>
                </div>
              </div>

              {/* Preview Entries */}
              {previewMutation.data.entries.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Preview ({previewMutation.data.entries.length} entries)
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                    {previewMutation.data.entries.slice(0, 20).map((entry, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            {entry.resourceType}
                          </span>
                          {entry.resourceId && (
                            <span className="text-gray-400 ml-1">#{entry.resourceId}</span>
                          )}
                          <span className="mx-2 text-gray-300">→</span>
                          <span className="text-foreground">{entry.principalName}</span>
                        </div>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                            entry.action === 'create' &&
                              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                            entry.action === 'update' &&
                              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                            entry.action === 'skip' && 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          )}
                        >
                          {entry.action}
                        </span>
                      </div>
                    ))}
                    {previewMutation.data.entries.length > 20 && (
                      <div className="px-3 py-2 text-xs text-gray-400 text-center">
                        ...and {previewMutation.data.entries.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'done' && executeMutation.data && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Import Complete</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <span className="font-medium text-green-600">{executeMutation.data.created}</span>{' '}
                  entries created
                </p>
                <p>
                  <span className="font-medium text-blue-600">{executeMutation.data.updated}</span>{' '}
                  entries updated
                </p>
                <p>
                  <span className="text-gray-500">{executeMutation.data.skipped}</span> entries
                  skipped
                </p>
              </div>
            </div>
          )}

          {/* Mutation Errors */}
          {previewMutation.error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {previewMutation.error.message}
              </p>
            </div>
          )}
          {executeMutation.error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {executeMutation.error.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          {step === 'preview' && (
            <button
              onClick={() => setStep('upload')}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Back
            </button>
          )}
          {step !== 'preview' && <div />}

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            >
              {step === 'done' ? 'Close' : 'Cancel'}
            </button>

            {step === 'upload' && (
              <button
                onClick={handlePreview}
                disabled={!data.trim() || previewMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded disabled:cursor-not-allowed"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {previewMutation.isPending ? 'Analyzing...' : 'Preview'}
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleExecute}
                disabled={
                  executeMutation.isPending ||
                  (previewMutation.data?.toCreate === 0 && previewMutation.data?.toUpdate === 0)
                }
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded disabled:cursor-not-allowed"
              >
                <UploadIcon className="w-4 h-4" />
                {executeMutation.isPending ? 'Importing...' : 'Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AclImportDialog;
