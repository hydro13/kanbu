/*
 * Import/Export Page
 * Version: 1.0.0
 *
 * Import tasks from external tools (Trello, Asana, Jira, etc.)
 * and export project data in various formats.
 *
 * Design principle: No vendor lock-in - users can freely
 * import and export their data.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:15 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { ImportPreview } from '@/components/import/ImportPreview';
import { useProjectPermissions } from '@/hooks/useProjectPermissions';

// =============================================================================
// Types
// =============================================================================

type ImportSource =
  | 'generic'
  | 'trello'
  | 'asana'
  | 'jira'
  | 'todoist'
  | 'notion'
  | 'monday'
  | 'clickup'
  | 'basecamp'
  | 'wrike'
  | 'kanboard';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  required?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function UploadIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function DownloadIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function FileIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}


// =============================================================================
// Source Cards Data
// =============================================================================

const IMPORT_SOURCES: Array<{
  id: ImportSource;
  name: string;
  description: string;
  icon: string;
  color: string;
}> = [
  { id: 'trello', name: 'Trello', description: 'Import from Trello CSV export', icon: '📋', color: 'blue' },
  { id: 'asana', name: 'Asana', description: 'Import from Asana CSV export', icon: '🎯', color: 'pink' },
  { id: 'jira', name: 'Jira', description: 'Import from Jira CSV export', icon: '🔵', color: 'blue' },
  { id: 'todoist', name: 'Todoist', description: 'Import from Todoist CSV', icon: '✓', color: 'red' },
  { id: 'notion', name: 'Notion', description: 'Import from Notion database export', icon: '📓', color: 'gray' },
  { id: 'monday', name: 'Monday.com', description: 'Import from Monday.com export', icon: '📊', color: 'red' },
  { id: 'clickup', name: 'ClickUp', description: 'Import from ClickUp export', icon: '⬆️', color: 'purple' },
  { id: 'kanboard', name: 'Kanboard', description: 'Import from Kanboard/GENX-Planner', icon: '📌', color: 'green' },
  { id: 'generic', name: 'Generic CSV', description: 'Import from any CSV file', icon: '📄', color: 'gray' },
];

// =============================================================================
// Component
// =============================================================================

export function ImportExportPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>();
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  );

  // Get project ID from fetched data
  const projectId = projectQuery.data?.id ?? 0;
  const { canManage, isLoading: permissionsLoading } = useProjectPermissions(projectId);

  const exportFormatsQuery = trpc.export.formats.useQuery(undefined, {
    enabled: activeTab === 'export',
  });

  // Mutations
  const previewMutation = trpc.import.preview.useMutation();
  const importMutation = trpc.import.execute.useMutation();
  const exportTasksMutation = trpc.export.tasks.useQuery(
    { projectId, format: 'csv' },
    { enabled: false }
  );

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Preview generation
  const handleGeneratePreview = useCallback(async () => {
    if (!fileContent || !selectedSource) return;

    setError(null);
    try {
      const fileType = fileName?.endsWith('.json') ? 'json' : 'csv';
      const result = await previewMutation.mutateAsync({
        projectId,
        content: fileContent,
        fileType,
        source: selectedSource,
      });
      setPreviewData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate preview');
    }
  }, [fileContent, selectedSource, projectId, fileName, previewMutation]);

  // Import execution
  const handleImport = useCallback(
    async (mappings: FieldMapping[]) => {
      if (!fileContent || !selectedSource) return;

      setError(null);
      try {
        const fileType = fileName?.endsWith('.json') ? 'json' : 'csv';
        const result = await importMutation.mutateAsync({
          projectId,
          content: fileContent,
          fileType,
          source: selectedSource,
          fieldMappings: mappings.map((m) => ({
            sourceField: m.sourceField,
            targetField: m.targetField,
            required: m.required,
          })),
        });
        setImportResult(result);
        setPreviewData(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import failed');
      }
    },
    [fileContent, selectedSource, projectId, fileName, importMutation]
  );

  // Export handling
  const handleExport = useCallback(
    async (format: 'csv' | 'json' | 'trello') => {
      try {
        // Use fetch directly since we need to download the file
        const response = await fetch(`/api/export/${projectId}?format=${format}`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectQuery.data?.name ?? 'export'}.${format === 'trello' ? 'csv' : format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // Fallback: use tRPC query result
        const result = await exportTasksMutation.refetch();
        if (result.data) {
          const blob = new Blob([result.data.content], { type: result.data.mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.data.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    },
    [projectId, projectQuery.data?.name, exportTasksMutation]
  );

  // Reset state
  const handleReset = useCallback(() => {
    setSelectedSource(null);
    setFileContent(null);
    setFileName(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  // Loading state
  if (projectQuery.isLoading || permissionsLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      </ProjectLayout>
    );
  }

  // Access check - redirect if user doesn't have manage permissions
  if (!canManage) {
    return <Navigate to={`/project/${projectId}/board`} replace />;
  }

  return (
    <ProjectLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import & Export
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Import tasks from other tools or export your project data. No lock-in - your data is always yours.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="mb-6">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <DownloadIcon className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import">
            {importResult ? (
              // Import Success Screen
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Import Complete
                  </h2>
                  <div className="text-gray-600 dark:text-gray-300 space-y-1 mb-6">
                    <p>
                      <span className="font-medium text-green-600">{importResult.imported}</span> tasks imported
                    </p>
                    {importResult.skipped > 0 && (
                      <p>
                        <span className="font-medium text-yellow-600">{importResult.skipped}</span> tasks skipped (duplicates)
                      </p>
                    )}
                    {importResult.failed > 0 && (
                      <p>
                        <span className="font-medium text-red-600">{importResult.failed}</span> tasks failed
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={handleReset}>
                      Import More
                    </Button>
                    <Link to={`/project/${projectId}/board`}>
                      <Button>View Board</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : previewData ? (
              // Preview Screen
              <ImportPreview
                preview={previewData as Parameters<typeof ImportPreview>[0]['preview']}
                onConfirm={handleImport}
                onCancel={handleReset}
                isImporting={importMutation.isPending}
              />
            ) : selectedSource && fileContent ? (
              // File Selected - Ready to Preview
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-6">
                    <FileIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="font-medium text-gray-900 dark:text-white">{fileName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(fileContent.length / 1024)} KB
                    </p>
                  </div>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={handleReset}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGeneratePreview}
                      disabled={previewMutation.isPending}
                    >
                      {previewMutation.isPending ? 'Analyzing...' : 'Preview Import'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : selectedSource ? (
              // Source Selected - Upload File
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        Import from {IMPORT_SOURCES.find((s) => s.id === selectedSource)?.name}
                      </CardTitle>
                      <CardDescription>
                        Upload your CSV or JSON export file
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      Change Source
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                      transition-colors duration-200
                      ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }
                    `}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        Click to upload
                      </span>
                      {' or drag and drop'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      CSV or JSON files
                    </p>
                  </div>
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Source Selection
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Select Import Source
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {IMPORT_SOURCES.map((source) => (
                    <Card
                      key={source.id}
                      className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => setSelectedSource(source.id)}
                    >
                      <CardContent className="py-6 text-center">
                        <span className="text-3xl">{source.icon}</span>
                        <h3 className="mt-2 font-medium text-gray-900 dark:text-white">
                          {source.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {source.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Export Project Data
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Download your project data in various formats. Your data is always yours.
              </p>

              <div className="grid grid-cols-3 gap-4 mt-6">
                {exportFormatsQuery.data?.map((format) => (
                  <Card key={format.id} className="overflow-hidden">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <FileIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {format.name}
                          </h3>
                          <p className="text-xs text-gray-500">{format.extension}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {format.description}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleExport(format.id as 'csv' | 'json' | 'trello')}
                      >
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Download {format.name}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Full Project Export */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Full Project Export</CardTitle>
                  <CardDescription>
                    Export complete project including columns, swimlanes, tags, and all tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => handleExport('json')}>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export Full Project (JSON)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProjectLayout>
  );
}

export default ImportExportPage;
