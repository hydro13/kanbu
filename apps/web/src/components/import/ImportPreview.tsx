/*
 * ImportPreview Component
 * Version: 1.0.0
 *
 * Shows a preview of data to be imported with field mappings.
 * Allows users to review and adjust mappings before import.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:10 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// =============================================================================
// Types
// =============================================================================

interface FieldMapping {
  sourceField: string;
  targetField: string;
  required?: boolean;
}

interface PreviewRow {
  rowNumber: number;
  original: Record<string, string>;
  mapped: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  willImport: boolean;
}

interface ImportPreviewData {
  source: string;
  detectedSource?: string;
  headers: string[];
  fieldMappings: FieldMapping[];
  unmappedFields: string[];
  suggestedMappings: FieldMapping[];
  rows: PreviewRow[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
  projectColumns: Array<{ id: number; title: string }>;
  projectTags: Array<{ id: number; name: string }>;
  sourceInfo?: {
    name: string;
    description: string;
    fileTypes: string[];
    example: string;
  };
}

interface ImportPreviewProps {
  preview: ImportPreviewData;
  onConfirm: (mappings: FieldMapping[]) => void;
  onCancel: () => void;
  isImporting?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AlertIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

// =============================================================================
// Target Fields
// =============================================================================

const TARGET_FIELDS = [
  { value: 'title', label: 'Title', required: true },
  { value: 'description', label: 'Description' },
  { value: 'priority', label: 'Priority' },
  { value: 'column', label: 'Column/Status' },
  { value: 'swimlane', label: 'Swimlane' },
  { value: 'dateDue', label: 'Due Date' },
  { value: 'dateStarted', label: 'Start Date' },
  { value: 'tags', label: 'Tags/Labels' },
  { value: 'assignees', label: 'Assignees' },
  { value: 'category', label: 'Category' },
  { value: 'timeEstimated', label: 'Time Estimate' },
  { value: 'score', label: 'Story Points/Score' },
  { value: 'reference', label: 'Reference/ID' },
  { value: '_skip', label: '(Skip this field)' },
];

// =============================================================================
// Component
// =============================================================================

export function ImportPreview({
  preview,
  onConfirm,
  onCancel,
  isImporting = false,
}: ImportPreviewProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([
    ...preview.fieldMappings,
    ...preview.suggestedMappings,
  ]);
  const [showAllRows, setShowAllRows] = useState(false);

  const displayRows = showAllRows ? preview.rows : preview.rows.slice(0, 10);

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.sourceField === sourceField);
      if (existing) {
        return prev.map((m) =>
          m.sourceField === sourceField ? { ...m, targetField } : m
        );
      }
      return [...prev, { sourceField, targetField }];
    });
  };

  const handleConfirm = () => {
    const validMappings = mappings.filter((m) => m.targetField !== '_skip');
    onConfirm(validMappings);
  };

  const getMappingForField = (sourceField: string): string | undefined => {
    return mappings.find((m) => m.sourceField === sourceField)?.targetField;
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Import Preview
            {preview.detectedSource && preview.detectedSource !== 'generic' && (
              <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                (Detected: {preview.sourceInfo?.name ?? preview.detectedSource})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">Total Rows</p>
              <p className="text-2xl font-bold text-foreground">
                {preview.summary.totalRows}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-600 dark:text-green-400">Valid</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {preview.summary.validRows}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-600 dark:text-yellow-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {preview.summary.warningRows}
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400">Errors</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {preview.summary.errorRows}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>Field Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preview.headers.map((header) => {
              const currentMapping = getMappingForField(header);
              const isUnmapped = preview.unmappedFields.includes(header);
              const hasSuggestion = preview.suggestedMappings.some(
                (m) => m.sourceField === header
              );

              return (
                <div
                  key={header}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    isUnmapped && !currentMapping
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {header}
                    </p>
                    {hasSuggestion && !currentMapping && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Suggested mapping available
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400">→</span>
                  <select
                    value={currentMapping ?? '_skip'}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                  >
                    <option value="_skip">(Skip this field)</option>
                    {TARGET_FIELDS.filter((f) => f.value !== '_skip').map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                        {field.required && ' *'}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Data Preview</span>
            {preview.rows.length > 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllRows(!showAllRows)}
              >
                {showAllRows
                  ? 'Show Less'
                  : `Show All (${preview.rows.length} rows)`}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                    Title
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                    Column
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                    Priority
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={`border-b dark:border-gray-700 ${
                      row.errors.length > 0
                        ? 'bg-red-50 dark:bg-red-900/10'
                        : row.warnings.length > 0
                        ? 'bg-yellow-50 dark:bg-yellow-900/10'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                      {row.rowNumber}
                    </td>
                    <td className="px-3 py-2">
                      {row.willImport ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <XIcon className="h-4 w-4 text-red-500" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {String(row.mapped.title ?? row.original.title ?? '-')}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {String(row.mapped.column ?? '-')}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {typeof row.mapped.priority === 'number'
                        ? (['Low', 'Medium', 'High', 'Urgent'][row.mapped.priority] ?? String(row.mapped.priority))
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length > 0 && (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XIcon className="h-4 w-4" />
                          <span className="text-xs">{row.errors[0]}</span>
                        </div>
                      )}
                      {row.warnings.length > 0 && row.errors.length === 0 && (
                        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <AlertIcon className="h-4 w-4" />
                          <span className="text-xs">{row.warnings[0]}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ready to import {preview.summary.validRows} tasks
          </p>
          <Button onClick={handleConfirm} disabled={isImporting || preview.summary.validRows === 0}>
            {isImporting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
                Importing...
              </>
            ) : (
              `Import ${preview.summary.validRows} Tasks`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ImportPreview;
