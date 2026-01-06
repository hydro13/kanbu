export type ImportSource = 'generic' | 'trello' | 'asana' | 'jira' | 'todoist' | 'notion' | 'monday' | 'clickup' | 'basecamp' | 'wrike' | 'kanboard';
export type ExportFormat = 'csv' | 'json' | 'trello' | 'jira';
export interface FieldMapping {
    sourceField: string;
    targetField: string;
    transform?: FieldTransform;
    required?: boolean;
}
export type FieldTransform = {
    type: 'direct';
} | {
    type: 'date';
    format?: string;
} | {
    type: 'priority';
    mapping: Record<string, number>;
} | {
    type: 'list';
    separator: string;
} | {
    type: 'boolean';
    trueValues: string[];
} | {
    type: 'number';
} | {
    type: 'status';
    mapping: Record<string, string>;
} | {
    type: 'custom';
    fn: (value: string, row: Record<string, string>) => unknown;
};
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
    errors: Array<{
        row: number;
        error: string;
    }>;
    createdIds: number[];
}
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
        columns?: Array<{
            id: number;
            title: string;
            position: number;
        }>;
        swimlanes?: Array<{
            id: number;
            name: string;
            position: number;
        }>;
        tags?: Array<{
            id: number;
            name: string;
            color: string;
        }>;
        categories?: Array<{
            id: number;
            name: string;
            color: string;
        }>;
    };
    meta: {
        totalTasks?: number;
        totalProjects?: number;
        exportedBy?: string;
    };
}
/**
 * Detect import source from headers
 * Each tool has characteristic column names
 */
export declare function detectImportSource(headers: string[]): ImportSource;
/**
 * Parse CSV content using PapaParse
 * Robust handling of quotes, newlines, different encodings
 */
export declare function parseCSV(content: string): ParseResult;
/**
 * Parse CSV with streaming for large files
 * Returns a promise that resolves when complete
 */
export declare function parseCSVStreaming(content: string, onRow: (row: Record<string, string>, index: number) => void, onComplete: (meta: {
    totalRows: number;
}) => void, onError: (error: ParseError) => void): void;
/**
 * Apply transform to a field value
 */
export declare function applyTransform(value: string, transform: FieldTransform, row: Record<string, string>): unknown;
/**
 * Get field mappings for a source
 */
export declare function getFieldMappings(source: ImportSource): FieldMapping[];
/**
 * Auto-detect field mappings from headers
 */
export declare function detectFieldMappings(headers: string[], source: ImportSource): {
    mappings: FieldMapping[];
    unmapped: string[];
    suggestions: FieldMapping[];
};
/**
 * Generate import preview
 */
export declare function generatePreview(parseResult: ParseResult, source: ImportSource, customMappings?: FieldMapping[], previewLimit?: number): ImportPreview;
/**
 * Transform a single row using mappings
 */
export declare function transformRow(row: Record<string, string>, mappings: FieldMapping[], rowNumber: number): ImportPreviewRow;
/**
 * Export tasks to CSV
 */
export declare function exportTasksToCSV(tasks: TaskExportData[]): string;
/**
 * Export tasks to Trello-compatible CSV
 */
export declare function exportTasksToTrelloCSV(tasks: TaskExportData[]): string;
/**
 * Export tasks to JSON
 */
export declare function exportTasksToJSON(tasks: TaskExportData[], projectId?: number, projectName?: string): string;
/**
 * Export project with all data to JSON
 */
export declare function exportProjectToJSON(project: ProjectExportData, tasks: TaskExportData[], columns: Array<{
    id: number;
    title: string;
    position: number;
}>, swimlanes: Array<{
    id: number;
    name: string;
    position: number;
}>, tags: Array<{
    id: number;
    name: string;
    color: string;
}>, categories: Array<{
    id: number;
    name: string;
    color: string;
}>): string;
/**
 * Validate JSON import format
 */
export declare function validateJSONImport(json: unknown): ValidationResult;
export interface BatchProgress {
    current: number;
    total: number;
    percentage: number;
}
/**
 * Process items in batches with progress callback
 */
export declare function processBatch<T, R>(items: T[], batchSize: number, processor: (item: T, index: number) => Promise<R>, onProgress?: (progress: BatchProgress) => void): Promise<{
    results: R[];
    errors: Array<{
        index: number;
        error: string;
    }>;
}>;
export declare const PRIORITY_NAMES: Record<number, string>;
export declare function getPriorityName(priority: number): string;
//# sourceMappingURL=importExport.d.ts.map