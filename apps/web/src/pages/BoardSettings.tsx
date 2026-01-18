/*
 * Board Settings Page
 * Version: 1.1.0
 *
 * Board configuration: columns, swimlanes, WIP limits.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 1d704110-bdc1-417f-a584-942696f49132
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:46 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ColumnFormData {
  title: string;
  description: string;
  taskLimit: number;
}

interface SwimlaneFormData {
  name: string;
  description: string;
}

// =============================================================================
// Component
// =============================================================================

export function BoardSettingsPage() {
  const { projectIdentifier, workspaceSlug } = useParams<{
    projectIdentifier: string;
    workspaceSlug: string;
  }>();
  const utils = trpc.useUtils();

  // Form states
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [showSwimlaneForm, setShowSwimlaneForm] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingSwimlaneId, setEditingSwimlaneId] = useState<number | null>(null);

  // Column form
  const [columnForm, setColumnForm] = useState<ColumnFormData>({
    title: '',
    description: '',
    taskLimit: 0,
  });

  // Swimlane form
  const [swimlaneForm, setSwimlaneForm] = useState<SwimlaneFormData>({
    name: '',
    description: '',
  });

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  );

  // Get project ID from fetched data
  const projectId = projectQuery.data?.id ?? 0;

  const columnsQuery = trpc.column.list.useQuery({ projectId }, { enabled: projectId > 0 });

  const swimlanesQuery = trpc.swimlane.list.useQuery({ projectId }, { enabled: projectId > 0 });

  // Column mutations
  const createColumnMutation = trpc.column.create.useMutation({
    onSuccess: () => {
      resetColumnForm();
      utils.column.list.invalidate({ projectId });
    },
  });

  const updateColumnMutation = trpc.column.update.useMutation({
    onSuccess: () => {
      resetColumnForm();
      utils.column.list.invalidate({ projectId });
    },
  });

  const deleteColumnMutation = trpc.column.delete.useMutation({
    onSuccess: () => {
      utils.column.list.invalidate({ projectId });
    },
  });

  const reorderColumnMutation = trpc.column.reorder.useMutation({
    onSuccess: () => {
      utils.column.list.invalidate({ projectId });
    },
  });

  // Swimlane mutations
  const createSwimlaneMutation = trpc.swimlane.create.useMutation({
    onSuccess: () => {
      resetSwimlaneForm();
      utils.swimlane.list.invalidate({ projectId });
    },
  });

  const updateSwimlaneMutation = trpc.swimlane.update.useMutation({
    onSuccess: () => {
      resetSwimlaneForm();
      utils.swimlane.list.invalidate({ projectId });
    },
  });

  const deleteSwimlaneMutation = trpc.swimlane.delete.useMutation({
    onSuccess: () => {
      utils.swimlane.list.invalidate({ projectId });
    },
  });

  const toggleSwimlaneMutation = trpc.swimlane.toggleActive.useMutation({
    onSuccess: () => {
      utils.swimlane.list.invalidate({ projectId });
    },
  });

  // Form handlers
  const resetColumnForm = () => {
    setColumnForm({ title: '', description: '', taskLimit: 0 });
    setShowColumnForm(false);
    setEditingColumnId(null);
  };

  const resetSwimlaneForm = () => {
    setSwimlaneForm({ name: '', description: '' });
    setShowSwimlaneForm(false);
    setEditingSwimlaneId(null);
  };

  const handleColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnForm.title.trim()) return;

    if (editingColumnId) {
      updateColumnMutation.mutate({
        columnId: editingColumnId,
        title: columnForm.title,
        description: columnForm.description || undefined,
        taskLimit: columnForm.taskLimit,
      });
    } else {
      createColumnMutation.mutate({
        projectId,
        title: columnForm.title,
        description: columnForm.description || undefined,
        taskLimit: columnForm.taskLimit,
      });
    }
  };

  const handleSwimlaneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swimlaneForm.name.trim()) return;

    if (editingSwimlaneId) {
      updateSwimlaneMutation.mutate({
        swimlaneId: editingSwimlaneId,
        name: swimlaneForm.name,
        description: swimlaneForm.description || undefined,
      });
    } else {
      createSwimlaneMutation.mutate({
        projectId,
        name: swimlaneForm.name,
        description: swimlaneForm.description || undefined,
      });
    }
  };

  const startEditColumn = (column: NonNullable<typeof columnsQuery.data>[number]) => {
    setColumnForm({
      title: column.title,
      description: column.description ?? '',
      taskLimit: column.taskLimit,
    });
    setEditingColumnId(column.id);
    setShowColumnForm(true);
  };

  const startEditSwimlane = (swimlane: NonNullable<typeof swimlanesQuery.data>[number]) => {
    setSwimlaneForm({
      name: swimlane.name,
      description: swimlane.description ?? '',
    });
    setEditingSwimlaneId(swimlane.id);
    setShowSwimlaneForm(true);
  };

  const handleMoveColumn = (columnId: number, direction: 'up' | 'down') => {
    const columns = columnsQuery.data ?? [];
    const currentIndex = columns.findIndex((c) => c.id === columnId);
    const newPosition = direction === 'up' ? currentIndex : currentIndex + 2;

    if (newPosition < 1 || newPosition > columns.length) return;

    reorderColumnMutation.mutate({
      projectId,
      columnId,
      newPosition,
    });
  };

  const handleDeleteColumn = (columnId: number, taskCount: number) => {
    if (taskCount > 0) {
      alert(`Cannot delete column: it contains ${taskCount} task(s). Move or delete tasks first.`);
      return;
    }
    if (confirm('Are you sure you want to delete this column?')) {
      deleteColumnMutation.mutate({ columnId });
    }
  };

  const handleDeleteSwimlane = (swimlaneId: number, taskCount: number) => {
    if (taskCount > 0) {
      alert(
        `Cannot delete swimlane: it contains ${taskCount} task(s). Move or delete tasks first.`
      );
      return;
    }
    if (confirm('Are you sure you want to delete this swimlane?')) {
      deleteSwimlaneMutation.mutate({ swimlaneId });
    }
  };

  // Loading state
  if (projectQuery.isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProjectLayout>
    );
  }

  // Error state
  if (projectQuery.error) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-destructive">{projectQuery.error.message}</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            Go back
          </Link>
        </div>
      </ProjectLayout>
    );
  }

  const project = projectQuery.data;
  const columns = columnsQuery.data ?? [];
  const swimlanes = swimlanesQuery.data ?? [];

  return (
    <ProjectLayout>
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <nav className="text-sm text-muted-foreground mb-2">
            <Link
              to={`/workspace/${workspaceSlug}/project/${projectIdentifier}/board`}
              className="hover:text-primary"
            >
              {project?.name}
            </Link>
            {' / '}
            <span>Settings</span>
          </nav>
          <h1 className="text-page-title text-foreground">Board Settings</h1>
          <p className="text-muted-foreground mt-1">Manage columns, swimlanes, and WIP limits</p>
        </div>

        <div className="space-y-8">
          {/* Archive Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle>Archive Column</CardTitle>
              <CardDescription>
                Closed tasks are automatically moved to the Archive column. Toggle visibility to
                show or hide archived tasks on the board.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Show Archive Column</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the Archive column is visible on the board
                  </p>
                </div>
                <ArchiveToggle
                  projectId={projectId}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  initialValue={Boolean((projectQuery.data as any)?.settings?.showArchiveColumn)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Columns Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Columns</CardTitle>
                  <CardDescription>Board columns represent workflow stages</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetColumnForm();
                    setShowColumnForm(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Column
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Column Form */}
              {showColumnForm && (
                <form
                  onSubmit={handleColumnSubmit}
                  className="mb-6 p-4 border rounded-lg bg-muted/50"
                >
                  <h4 className="font-medium mb-3">
                    {editingColumnId ? 'Edit Column' : 'New Column'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={columnForm.title}
                        onChange={(e) => setColumnForm({ ...columnForm, title: e.target.value })}
                        placeholder="e.g., In Progress"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (optional)</label>
                      <Input
                        value={columnForm.description}
                        onChange={(e) =>
                          setColumnForm({ ...columnForm, description: e.target.value })
                        }
                        placeholder="Column description"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">WIP Limit (0 = no limit)</label>
                      <Input
                        type="number"
                        min="0"
                        value={columnForm.taskLimit}
                        onChange={(e) =>
                          setColumnForm({ ...columnForm, taskLimit: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" size="sm">
                        {editingColumnId ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={resetColumnForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Columns List */}
              <div className="space-y-2">
                {columns.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No columns yet</p>
                ) : (
                  columns
                    .filter((col) => !col.isArchive)
                    .map((column, index, filteredCols) => (
                      <div
                        key={column.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMoveColumn(column.id, 'up')}
                              disabled={index === 0}
                              className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                            >
                              <ChevronUpIcon className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleMoveColumn(column.id, 'down')}
                              disabled={index === filteredCols.length - 1}
                              className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                            >
                              <ChevronDownIcon className="h-3 w-3" />
                            </button>
                          </div>
                          <div>
                            <span className="font-medium">{column.title}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{column.taskCount} tasks</span>
                              {column.taskLimit > 0 && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded',
                                    column.isOverLimit
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  )}
                                >
                                  WIP: {column.taskLimit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEditColumn(column)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteColumn(column.id, column.taskCount)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Swimlanes Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Swimlanes</CardTitle>
                  <CardDescription>Horizontal lanes for categorizing tasks</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetSwimlaneForm();
                    setShowSwimlaneForm(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Swimlane
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Swimlane Form */}
              {showSwimlaneForm && (
                <form
                  onSubmit={handleSwimlaneSubmit}
                  className="mb-6 p-4 border rounded-lg bg-muted/50"
                >
                  <h4 className="font-medium mb-3">
                    {editingSwimlaneId ? 'Edit Swimlane' : 'New Swimlane'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={swimlaneForm.name}
                        onChange={(e) => setSwimlaneForm({ ...swimlaneForm, name: e.target.value })}
                        placeholder="e.g., Feature Work"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (optional)</label>
                      <Input
                        value={swimlaneForm.description}
                        onChange={(e) =>
                          setSwimlaneForm({ ...swimlaneForm, description: e.target.value })
                        }
                        placeholder="Swimlane description"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" size="sm">
                        {editingSwimlaneId ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={resetSwimlaneForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Swimlanes List */}
              <div className="space-y-2">
                {swimlanes.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No swimlanes yet</p>
                ) : (
                  swimlanes.map((swimlane) => (
                    <div
                      key={swimlane.id}
                      className={cn(
                        'flex items-center justify-between p-3 border rounded-lg',
                        !swimlane.isActive && 'opacity-60'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{swimlane.name}</span>
                          {!swimlane.isActive && (
                            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded">
                              Hidden
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {swimlane.taskCount} tasks
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSwimlaneMutation.mutate({ swimlaneId: swimlane.id })}
                        >
                          {swimlane.isActive ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditSwimlane(swimlane)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSwimlane(swimlane.id, swimlane.taskCount)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
}

// =============================================================================
// Archive Toggle Component
// =============================================================================

function ArchiveToggle({ projectId, initialValue }: { projectId: number; initialValue: boolean }) {
  const [isEnabled, setIsEnabled] = useState(initialValue);
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.project.updateSettings.useMutation({
    onSuccess: () => {
      utils.project.getByIdentifier.invalidate();
    },
  });

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    updateSettingsMutation.mutate({
      projectId,
      settings: { showArchiveColumn: newValue },
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={updateSettingsMutation.isPending}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
        updateSettingsMutation.isPending && 'opacity-50 cursor-wait'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          isEnabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default BoardSettingsPage;
