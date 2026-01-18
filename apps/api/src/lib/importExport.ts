/*
 * Import/Export Library
 * Version: 1.0.0
 *
 * Professional import/export system for Kanbu.
 * Supports multiple formats and external tools (Trello, Asana, Jira, etc.)
 *
 * Design principles:
 * - No vendor lock-in: users can freely import/export their data
 * - Adapter pattern: easy to add new import sources
 * - Robust parsing: using papaparse for CSV
 * - Streaming support: handle large files efficiently
 * - Flexible mapping: auto-detect + custom field mapping
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:50 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import Papa from 'papaparse';

// =============================================================================
// Core Types
// =============================================================================

export type ImportSource =
  | 'generic' // Generic CSV/JSON
  | 'trello' // Trello export
  | 'asana' // Asana export
  | 'jira' // Jira export
  | 'todoist' // Todoist export
  | 'notion' // Notion export
  | 'monday' // Monday.com export
  | 'clickup' // ClickUp export
  | 'basecamp' // Basecamp export
  | 'wrike' // Wrike export
  | 'kanboard'; // Kanboard export (our legacy)

export type ExportFormat =
  | 'csv'
  | 'json'
  | 'trello' // Trello-compatible JSON
  | 'jira'; // Jira-compatible CSV

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
  required?: boolean;
}

export type FieldTransform =
  | { type: 'direct' }
  | { type: 'date'; format?: string }
  | { type: 'priority'; mapping: Record<string, number> }
  | { type: 'list'; separator: string }
  | { type: 'boolean'; trueValues: string[] }
  | { type: 'number' }
  | { type: 'status'; mapping: Record<string, string> }
  | { type: 'custom'; fn: (value: string, row: Record<string, string>) => unknown };

// =============================================================================
// Parse Results
// =============================================================================

export interface ParseError {
  row?: number;
  column?: string;
  message: string;
  type: 'error' | 'warning';
  value?: string;
}

export interface ParseResult {
  success: boolean;
  headers: string[];
  rows: Record<string, string>[];
  errors: ParseError[];
  meta: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    encoding?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
}

// =============================================================================
// Import Preview & Result
// =============================================================================

export interface ImportPreviewRow {
  rowNumber: number;
  original: Record<string, string>;
  mapped: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  willImport: boolean;
}

export interface ImportPreview {
  source: ImportSource;
  detectedSource?: ImportSource;
  headers: string[];
  fieldMappings: FieldMapping[];
  unmappedFields: string[];
  suggestedMappings: FieldMapping[];
  rows: ImportPreviewRow[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  createdIds: number[];
}

// =============================================================================
// Export Types
// =============================================================================

export interface TaskExportData {
  id: number;
  reference: string | null;
  title: string;
  description: string | null;
  priority: number;
  priorityName: string;
  isActive: boolean;
  status: string;
  column: string;
  columnId: number;
  swimlane: string | null;
  swimlaneId: number | null;
  dateDue: string | null;
  dateStarted: string | null;
  dateCompleted: string | null;
  timeEstimated: number;
  timeSpent: number;
  progress: number;
  score: number;
  tags: string[];
  assignees: string[];
  category: string | null;
  milestone: string | null;
  sprint: string | null;
  module: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectExportData {
  id: number;
  name: string;
  identifier: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isPublic: boolean;
  columns: string[];
  swimlanes: string[];
  tags: string[];
  categories: string[];
  taskCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExportEnvelope {
  format: string;
  version: string;
  exportedAt: string;
  source: 'kanbu';
  sourceVersion: string;
  projectId?: number;
  projectName?: string;
  workspaceId?: number;
  workspaceName?: string;
  data: {
    tasks?: TaskExportData[];
    projects?: ProjectExportData[];
    columns?: Array<{ id: number; title: string; position: number }>;
    swimlanes?: Array<{ id: number; name: string; position: number }>;
    tags?: Array<{ id: number; name: string; color: string }>;
    categories?: Array<{ id: number; name: string; color: string }>;
  };
  meta: {
    totalTasks?: number;
    totalProjects?: number;
    exportedBy?: string;
  };
}

// =============================================================================
// Source Detection
// =============================================================================

/**
 * Detect import source from headers
 * Each tool has characteristic column names
 */
export function detectImportSource(headers: string[]): ImportSource {
  const headerSet = new Set(headers.map((h) => h.toLowerCase().trim()));

  // Trello: Card Name, List Name, Labels, Members, Due Date
  if (headerSet.has('card name') && headerSet.has('list name')) {
    return 'trello';
  }

  // Asana: Name, Section/Column, Assignee, Due Date, Tags
  if (headerSet.has('name') && (headerSet.has('section/column') || headerSet.has('section'))) {
    return 'asana';
  }

  // Jira: Summary, Issue key, Issue Type, Status, Assignee
  if (headerSet.has('summary') && headerSet.has('issue key')) {
    return 'jira';
  }

  // Todoist: TYPE, CONTENT, PRIORITY, INDENT, AUTHOR
  if (headerSet.has('type') && headerSet.has('content') && headerSet.has('indent')) {
    return 'todoist';
  }

  // Notion: Name/Title with specific patterns
  if (headerSet.has('name') && headerSet.has('status') && headerSet.has('created time')) {
    return 'notion';
  }

  // Monday.com: Name, Group, Status, Owner
  if (headerSet.has('name') && headerSet.has('group') && headerSet.has('owner')) {
    return 'monday';
  }

  // ClickUp: Task Name, List, Status, Assignees
  if (headerSet.has('task name') && headerSet.has('list') && headerSet.has('status')) {
    return 'clickup';
  }

  // Kanboard: id, title, column_id, project_id
  if (headerSet.has('id') && headerSet.has('title') && headerSet.has('column_id')) {
    return 'kanboard';
  }

  return 'generic';
}

// =============================================================================
// Field Mapping Configurations per Source
// =============================================================================

const SOURCE_MAPPINGS: Record<ImportSource, FieldMapping[]> = {
  generic: [
    { sourceField: 'title', targetField: 'title', required: true },
    { sourceField: 'name', targetField: 'title', required: true },
    { sourceField: 'task', targetField: 'title', required: true },
    { sourceField: 'description', targetField: 'description' },
    { sourceField: 'desc', targetField: 'description' },
    {
      sourceField: 'priority',
      targetField: 'priority',
      transform: {
        type: 'priority',
        mapping: { low: 0, medium: 1, high: 2, urgent: 3, critical: 3 },
      },
    },
    { sourceField: 'due', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'due_date', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'duedate', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'deadline', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'start', targetField: 'dateStarted', transform: { type: 'date' } },
    { sourceField: 'start_date', targetField: 'dateStarted', transform: { type: 'date' } },
    { sourceField: 'estimated', targetField: 'timeEstimated', transform: { type: 'number' } },
    { sourceField: 'hours', targetField: 'timeEstimated', transform: { type: 'number' } },
    { sourceField: 'tags', targetField: 'tags', transform: { type: 'list', separator: ',' } },
    { sourceField: 'labels', targetField: 'tags', transform: { type: 'list', separator: ',' } },
    {
      sourceField: 'assignee',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    {
      sourceField: 'assignees',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'column', targetField: 'column' },
    { sourceField: 'status', targetField: 'column' },
    { sourceField: 'swimlane', targetField: 'swimlane' },
    { sourceField: 'category', targetField: 'category' },
  ],

  trello: [
    { sourceField: 'Card Name', targetField: 'title', required: true },
    { sourceField: 'Card Description', targetField: 'description' },
    { sourceField: 'List Name', targetField: 'column' },
    { sourceField: 'Labels', targetField: 'tags', transform: { type: 'list', separator: ',' } },
    {
      sourceField: 'Members',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Due Date', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'Start Date', targetField: 'dateStarted', transform: { type: 'date' } },
    {
      sourceField: 'Checklist',
      targetField: '_subtasks',
      transform: { type: 'list', separator: '\n' },
    },
    {
      sourceField: 'Archived',
      targetField: 'isActive',
      transform: { type: 'boolean', trueValues: ['false', 'FALSE', '0', ''] },
    },
  ],

  asana: [
    { sourceField: 'Name', targetField: 'title', required: true },
    { sourceField: 'Notes', targetField: 'description' },
    { sourceField: 'Section/Column', targetField: 'column' },
    { sourceField: 'Section', targetField: 'column' },
    {
      sourceField: 'Assignee',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Due Date', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'Start Date', targetField: 'dateStarted', transform: { type: 'date' } },
    { sourceField: 'Tags', targetField: 'tags', transform: { type: 'list', separator: ',' } },
    { sourceField: 'Projects', targetField: '_project' },
    {
      sourceField: 'Completed',
      targetField: 'isActive',
      transform: { type: 'boolean', trueValues: ['false', 'FALSE', '0', ''] },
    },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      transform: { type: 'priority', mapping: { low: 0, medium: 1, high: 2 } },
    },
  ],

  jira: [
    { sourceField: 'Summary', targetField: 'title', required: true },
    { sourceField: 'Description', targetField: 'description' },
    { sourceField: 'Issue key', targetField: 'reference' },
    { sourceField: 'Status', targetField: 'column' },
    {
      sourceField: 'Assignee',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Reporter', targetField: '_reporter' },
    { sourceField: 'Due date', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'Created', targetField: '_createdAt', transform: { type: 'date' } },
    { sourceField: 'Labels', targetField: 'tags', transform: { type: 'list', separator: ' ' } },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      transform: {
        type: 'priority',
        mapping: { lowest: 0, low: 0, medium: 1, high: 2, highest: 3, critical: 3, blocker: 3 },
      },
    },
    { sourceField: 'Story Points', targetField: 'score', transform: { type: 'number' } },
    {
      sourceField: 'Original Estimate',
      targetField: 'timeEstimated',
      transform: { type: 'number' },
    },
    { sourceField: 'Sprint', targetField: 'sprint' },
    { sourceField: 'Epic Link', targetField: 'milestone' },
  ],

  todoist: [
    { sourceField: 'CONTENT', targetField: 'title', required: true },
    { sourceField: 'DESCRIPTION', targetField: 'description' },
    {
      sourceField: 'PRIORITY',
      targetField: 'priority',
      transform: { type: 'priority', mapping: { '1': 3, '2': 2, '3': 1, '4': 0 } },
    }, // Todoist: 1=highest
    { sourceField: 'DATE', targetField: 'dateDue', transform: { type: 'date' } },
    {
      sourceField: 'RESPONSIBLE',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'LABELS', targetField: 'tags', transform: { type: 'list', separator: ',' } },
  ],

  notion: [
    { sourceField: 'Name', targetField: 'title', required: true },
    { sourceField: 'Title', targetField: 'title', required: true },
    { sourceField: 'Status', targetField: 'column' },
    {
      sourceField: 'Assignee',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Due', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'Tags', targetField: 'tags', transform: { type: 'list', separator: ',' } },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      transform: { type: 'priority', mapping: { low: 0, medium: 1, high: 2, urgent: 3 } },
    },
  ],

  monday: [
    { sourceField: 'Name', targetField: 'title', required: true },
    { sourceField: 'Group', targetField: 'swimlane' },
    { sourceField: 'Status', targetField: 'column' },
    { sourceField: 'Owner', targetField: 'assignees', transform: { type: 'list', separator: ',' } },
    { sourceField: 'Timeline', targetField: '_timeline' },
    { sourceField: 'Date', targetField: 'dateDue', transform: { type: 'date' } },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      transform: { type: 'priority', mapping: { low: 0, medium: 1, high: 2, critical: 3 } },
    },
    { sourceField: 'Tags', targetField: 'tags', transform: { type: 'list', separator: ',' } },
  ],

  clickup: [
    { sourceField: 'Task Name', targetField: 'title', required: true },
    { sourceField: 'Task Content', targetField: 'description' },
    { sourceField: 'List', targetField: 'column' },
    { sourceField: 'Folder', targetField: 'swimlane' },
    { sourceField: 'Status', targetField: '_status' },
    {
      sourceField: 'Assignees',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Due Date', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'Start Date', targetField: 'dateStarted', transform: { type: 'date' } },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      transform: { type: 'priority', mapping: { low: 0, normal: 1, high: 2, urgent: 3 } },
    },
    { sourceField: 'Tags', targetField: 'tags', transform: { type: 'list', separator: ',' } },
    { sourceField: 'Time Estimate', targetField: 'timeEstimated', transform: { type: 'number' } },
  ],

  basecamp: [
    { sourceField: 'Title', targetField: 'title', required: true },
    { sourceField: 'Content', targetField: 'description' },
    {
      sourceField: 'Assignees',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Due on', targetField: 'dateDue', transform: { type: 'date' } },
    {
      sourceField: 'Completed',
      targetField: 'isActive',
      transform: { type: 'boolean', trueValues: ['false', 'FALSE', '0', ''] },
    },
  ],

  wrike: [
    { sourceField: 'Title', targetField: 'title', required: true },
    { sourceField: 'Description', targetField: 'description' },
    { sourceField: 'Status', targetField: 'column' },
    {
      sourceField: 'Assignees',
      targetField: 'assignees',
      transform: { type: 'list', separator: ',' },
    },
    { sourceField: 'Due Date', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'Start Date', targetField: 'dateStarted', transform: { type: 'date' } },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      transform: { type: 'priority', mapping: { low: 0, normal: 1, high: 2 } },
    },
  ],

  kanboard: [
    { sourceField: 'title', targetField: 'title', required: true },
    { sourceField: 'description', targetField: 'description' },
    { sourceField: 'column_id', targetField: '_columnId', transform: { type: 'number' } },
    { sourceField: 'swimlane_id', targetField: '_swimlaneId', transform: { type: 'number' } },
    { sourceField: 'priority', targetField: 'priority', transform: { type: 'number' } },
    { sourceField: 'date_due', targetField: 'dateDue', transform: { type: 'date' } },
    { sourceField: 'date_started', targetField: 'dateStarted', transform: { type: 'date' } },
    { sourceField: 'time_estimated', targetField: 'timeEstimated', transform: { type: 'number' } },
    { sourceField: 'time_spent', targetField: 'timeSpent', transform: { type: 'number' } },
    { sourceField: 'score', targetField: 'score', transform: { type: 'number' } },
    { sourceField: 'reference', targetField: 'reference' },
    { sourceField: 'color_id', targetField: 'color' },
  ],
};

// =============================================================================
// CSV Parsing with PapaParse
// =============================================================================

/**
 * Parse CSV content using PapaParse
 * Robust handling of quotes, newlines, different encodings
 */
export function parseCSV(content: string): ParseResult {
  const errors: ParseError[] = [];

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
    dynamicTyping: false, // Keep everything as strings for consistent handling
  });

  // Collect parse errors
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      errors.push({
        row: error.row !== undefined ? error.row + 2 : undefined, // +2 for 1-indexed + header
        message: error.message,
        type: error.type === 'FieldMismatch' ? 'warning' : 'error',
      });
    }
  }

  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((row) => {
    // Skip completely empty rows
    return Object.values(row).some((v) => v !== '');
  });

  return {
    success: errors.filter((e) => e.type === 'error').length === 0,
    headers,
    rows,
    errors,
    meta: {
      totalRows: result.data.length,
      parsedRows: rows.length,
      skippedRows: result.data.length - rows.length,
    },
  };
}

/**
 * Parse CSV with streaming for large files
 * Returns a promise that resolves when complete
 */
export function parseCSVStreaming(
  content: string,
  onRow: (row: Record<string, string>, index: number) => void,
  onComplete: (meta: { totalRows: number }) => void,
  onError: (error: ParseError) => void
): void {
  let rowIndex = 0;

  Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
    step: (results) => {
      if (results.errors.length > 0) {
        for (const error of results.errors) {
          onError({
            row: rowIndex + 2,
            message: error.message,
            type: 'error',
          });
        }
      }

      // Skip empty rows
      const hasData = Object.values(results.data).some((v) => v !== '');
      if (hasData) {
        onRow(results.data, rowIndex);
      }
      rowIndex++;
    },
    complete: () => {
      onComplete({ totalRows: rowIndex });
    },
  });
}

// =============================================================================
// Field Transformation
// =============================================================================

/**
 * Apply transform to a field value
 */
export function applyTransform(
  value: string,
  transform: FieldTransform,
  row: Record<string, string>
): unknown {
  if (!value || value.trim() === '') {
    return null;
  }

  switch (transform.type) {
    case 'direct':
      return value;

    case 'date':
      return parseDate(value);

    case 'priority': {
      const normalized = value.toLowerCase().trim();
      return transform.mapping[normalized] ?? 0;
    }

    case 'list':
      return value
        .split(transform.separator)
        .map((s) => s.trim())
        .filter(Boolean);

    case 'boolean':
      return transform.trueValues.includes(value.toLowerCase().trim());

    case 'number': {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }

    case 'status':
      return transform.mapping[value.toLowerCase().trim()] ?? value;

    case 'custom':
      return transform.fn(value, row);

    default:
      return value;
  }
}

/**
 * Parse date string in various formats
 */
function parseDate(value: string): string | null {
  if (!value) return null;

  // Try ISO format first
  let date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Try common formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or DD-MM-YYYY
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      // Assume YYYY-MM-DD for unambiguous parsing
      if (match[1] && match[1].length === 4) {
        date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
      } else if (match[3] && match[3].length === 4) {
        // Could be MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY (US format)
        date = new Date(`${match[3]}-${match[1]}-${match[2]}`);
      }

      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
}

// =============================================================================
// Import Preview Generation
// =============================================================================

/**
 * Get field mappings for a source
 */
export function getFieldMappings(source: ImportSource): FieldMapping[] {
  return SOURCE_MAPPINGS[source] ?? SOURCE_MAPPINGS.generic;
}

/**
 * Auto-detect field mappings from headers
 */
export function detectFieldMappings(
  headers: string[],
  source: ImportSource
): {
  mappings: FieldMapping[];
  unmapped: string[];
  suggestions: FieldMapping[];
} {
  const sourceMappings = getFieldMappings(source);
  const mappings: FieldMapping[] = [];
  const unmapped: string[] = [];
  const suggestions: FieldMapping[] = [];

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();

    // Find exact or close match in source mappings
    const exactMatch = sourceMappings.find((m) => m.sourceField.toLowerCase() === normalizedHeader);

    if (exactMatch) {
      mappings.push({ ...exactMatch, sourceField: header });
    } else {
      unmapped.push(header);

      // Try to suggest a mapping based on common patterns
      const suggestion = suggestMapping(header, sourceMappings);
      if (suggestion) {
        suggestions.push({ ...suggestion, sourceField: header });
      }
    }
  }

  return { mappings, unmapped, suggestions };
}

/**
 * Suggest a mapping for an unmapped field
 */
function suggestMapping(header: string, mappings: FieldMapping[]): FieldMapping | null {
  const normalized = header.toLowerCase().trim();

  // Check for partial matches
  for (const mapping of mappings) {
    const sourceNormalized = mapping.sourceField.toLowerCase();
    if (normalized.includes(sourceNormalized) || sourceNormalized.includes(normalized)) {
      return mapping;
    }
  }

  // Check for common synonyms
  const synonyms: Record<string, string> = {
    task: 'title',
    name: 'title',
    subject: 'title',
    summary: 'title',
    desc: 'description',
    notes: 'description',
    body: 'description',
    prio: 'priority',
    importance: 'priority',
    due: 'dateDue',
    deadline: 'dateDue',
    end: 'dateDue',
    begin: 'dateStarted',
    start: 'dateStarted',
    estimate: 'timeEstimated',
    hours: 'timeEstimated',
    effort: 'timeEstimated',
    label: 'tags',
    tag: 'tags',
    category: 'category',
    type: 'category',
    owner: 'assignees',
    assigned: 'assignees',
    responsible: 'assignees',
    list: 'column',
    stage: 'column',
    phase: 'column',
    state: 'column',
  };

  for (const [synonym, target] of Object.entries(synonyms)) {
    if (normalized.includes(synonym)) {
      const targetMapping = mappings.find((m) => m.targetField === target);
      if (targetMapping) {
        return { ...targetMapping, sourceField: header };
      }
    }
  }

  return null;
}

/**
 * Generate import preview
 */
export function generatePreview(
  parseResult: ParseResult,
  source: ImportSource,
  customMappings?: FieldMapping[],
  previewLimit: number = 100
): ImportPreview {
  const detectedSource = detectImportSource(parseResult.headers);
  const { mappings, unmapped, suggestions } = detectFieldMappings(
    parseResult.headers,
    source === 'generic' ? detectedSource : source
  );

  const effectiveMappings = customMappings ?? mappings;
  const rows: ImportPreviewRow[] = [];
  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;

  const previewRows = parseResult.rows.slice(0, previewLimit);

  for (let i = 0; i < previewRows.length; i++) {
    const row = previewRows[i]!;
    const previewRow = transformRow(row, effectiveMappings, i + 2); // +2 for 1-indexed + header

    rows.push(previewRow);

    if (previewRow.errors.length > 0) {
      errorRows++;
    } else if (previewRow.warnings.length > 0) {
      warningRows++;
    } else {
      validRows++;
    }
  }

  return {
    source,
    detectedSource: source === 'generic' ? detectedSource : undefined,
    headers: parseResult.headers,
    fieldMappings: effectiveMappings,
    unmappedFields: unmapped,
    suggestedMappings: suggestions,
    rows,
    summary: {
      totalRows: parseResult.rows.length,
      validRows: Math.round((validRows / previewRows.length) * parseResult.rows.length),
      errorRows: Math.round((errorRows / previewRows.length) * parseResult.rows.length),
      warningRows: Math.round((warningRows / previewRows.length) * parseResult.rows.length),
    },
  };
}

/**
 * Transform a single row using mappings
 */
export function transformRow(
  row: Record<string, string>,
  mappings: FieldMapping[],
  rowNumber: number
): ImportPreviewRow {
  const mapped: Record<string, unknown> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  const titleMapping = mappings.find((m) => m.targetField === 'title' && m.required);
  if (titleMapping) {
    const titleValue = row[titleMapping.sourceField];
    if (!titleValue || titleValue.trim() === '') {
      errors.push('Title is required');
    }
  }

  // Apply each mapping
  for (const mapping of mappings) {
    const rawValue = row[mapping.sourceField];

    if (rawValue === undefined || rawValue === '') {
      if (mapping.required) {
        errors.push(`Required field "${mapping.sourceField}" is missing`);
      }
      continue;
    }

    try {
      const transform = mapping.transform ?? { type: 'direct' as const };
      const transformedValue = applyTransform(rawValue, transform, row);
      mapped[mapping.targetField] = transformedValue;

      // Add warnings for potential issues
      if (mapping.transform?.type === 'date' && transformedValue === null && rawValue) {
        warnings.push(`Could not parse date "${rawValue}" in field "${mapping.sourceField}"`);
      }
    } catch (e) {
      errors.push(`Error transforming "${mapping.sourceField}": ${String(e)}`);
    }
  }

  return {
    rowNumber,
    original: row,
    mapped,
    errors,
    warnings,
    willImport: errors.length === 0,
  };
}

// =============================================================================
// CSV/JSON Export
// =============================================================================

/**
 * Export tasks to CSV
 */
export function exportTasksToCSV(tasks: TaskExportData[]): string {
  const headers = [
    'id',
    'reference',
    'title',
    'description',
    'priority',
    'priorityName',
    'status',
    'column',
    'swimlane',
    'dateDue',
    'dateStarted',
    'dateCompleted',
    'timeEstimated',
    'timeSpent',
    'progress',
    'score',
    'tags',
    'assignees',
    'category',
    'milestone',
    'sprint',
    'module',
    'createdAt',
    'updatedAt',
  ];

  const rows = tasks.map((task) => ({
    ...task,
    status: task.isActive ? 'open' : 'closed',
    tags: task.tags.join('; '),
    assignees: task.assignees.join('; '),
  }));

  return Papa.unparse(rows, {
    columns: headers,
    quotes: true,
    quoteChar: '"',
    escapeChar: '"',
    header: true,
    newline: '\n',
  });
}

/**
 * Export tasks to Trello-compatible CSV
 */
export function exportTasksToTrelloCSV(tasks: TaskExportData[]): string {
  const headers = [
    'Card Name',
    'Card Description',
    'List Name',
    'Labels',
    'Members',
    'Due Date',
    'Start Date',
  ];

  const rows = tasks.map((task) => ({
    'Card Name': task.title,
    'Card Description': task.description ?? '',
    'List Name': task.column,
    Labels: task.tags.join(','),
    Members: task.assignees.join(','),
    'Due Date': task.dateDue ?? '',
    'Start Date': task.dateStarted ?? '',
  }));

  return Papa.unparse(rows, {
    columns: headers,
    quotes: true,
    header: true,
    newline: '\n',
  });
}

/**
 * Export tasks to JSON
 */
export function exportTasksToJSON(
  tasks: TaskExportData[],
  projectId?: number,
  projectName?: string
): string {
  const envelope: ExportEnvelope = {
    format: 'kanbu-json',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    source: 'kanbu',
    sourceVersion: '1.0.0',
    projectId,
    projectName,
    data: { tasks },
    meta: { totalTasks: tasks.length },
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Export project with all data to JSON
 */
export function exportProjectToJSON(
  project: ProjectExportData,
  tasks: TaskExportData[],
  columns: Array<{ id: number; title: string; position: number }>,
  swimlanes: Array<{ id: number; name: string; position: number }>,
  tags: Array<{ id: number; name: string; color: string }>,
  categories: Array<{ id: number; name: string; color: string }>
): string {
  const envelope: ExportEnvelope = {
    format: 'kanbu-project-json',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    source: 'kanbu',
    sourceVersion: '1.0.0',
    projectId: project.id,
    projectName: project.name,
    data: {
      projects: [project],
      tasks,
      columns,
      swimlanes,
      tags,
      categories,
    },
    meta: {
      totalProjects: 1,
      totalTasks: tasks.length,
    },
  };

  return JSON.stringify(envelope, null, 2);
}

// =============================================================================
// JSON Import Validation
// =============================================================================

/**
 * Validate JSON import format
 */
export function validateJSONImport(json: unknown): ValidationResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];

  if (typeof json !== 'object' || json === null) {
    return {
      valid: false,
      errors: [{ message: 'Invalid JSON: expected object', type: 'error' }],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  // Check for Kanbu export format
  if (obj.format && (obj.format as string).startsWith('kanbu')) {
    if (!obj.version) {
      warnings.push({ message: 'Missing version field', type: 'warning' });
    }
    if (!obj.data) {
      errors.push({ message: 'Missing data field', type: 'error' });
    }
  }

  // Check for Trello export format
  if (Array.isArray(obj) || (obj.cards && Array.isArray(obj.cards))) {
    warnings.push({ message: 'Detected Trello JSON format', type: 'warning' });
  }

  // Check for generic task array
  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;
    if (!data.tasks && !data.projects) {
      errors.push({ message: 'Data must contain tasks or projects', type: 'error' });
    }
  } else if (Array.isArray(obj)) {
    // Direct array of tasks - valid
  } else if (!obj.data) {
    errors.push({ message: 'Missing data field', type: 'error' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Batch Processing Utilities
// =============================================================================

export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
}

/**
 * Process items in batches with progress callback
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<R>,
  onProgress?: (progress: BatchProgress) => void
): Promise<{
  results: R[];
  errors: Array<{ index: number; error: string }>;
}> {
  const results: R[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchPromises = batch.map((item, batchIndex) =>
      processor(item, i + batchIndex)
        .then((result) => ({ success: true as const, result, index: i + batchIndex }))
        .catch((error) => ({
          success: false as const,
          error: error instanceof Error ? error.message : String(error),
          index: i + batchIndex,
        }))
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success) {
        results.push(result.result);
      } else {
        errors.push({ index: result.index, error: result.error });
      }
    }

    // Report progress
    if (onProgress) {
      const current = Math.min(i + batchSize, items.length);
      onProgress({
        current,
        total: items.length,
        percentage: Math.round((current / items.length) * 100),
      });
    }
  }

  return { results, errors };
}

// =============================================================================
// Priority Name Mapping
// =============================================================================

export const PRIORITY_NAMES: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Urgent',
};

export function getPriorityName(priority: number): string {
  return PRIORITY_NAMES[priority] ?? 'Unknown';
}
