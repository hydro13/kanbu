/*
 * Tag Management Page
 * Version: 1.0.0
 *
 * Project tag overview and management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:45 CET
 *
 * Modified by:
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Signed: 2025-12-28T18:49 CET
 * Change: Fixed TypeScript error - added DEFAULT_COLOR constant
 *
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Tag, Pencil, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_COLOR = '#EF4444'; // Red

const PRESET_COLORS = [
  DEFAULT_COLOR,
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// =============================================================================
// Component
// =============================================================================

export function TagManagementPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // State
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLOR);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  );

  // Get project ID from fetched data
  const projectId = projectQuery.data?.id ?? 0;

  const tagsQuery = trpc.tag.list.useQuery({ projectId }, { enabled: projectId > 0 });

  // Mutations
  const createTagMutation = trpc.tag.create.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate({ projectId });
      setNewTagName('');
      setNewTagColor(DEFAULT_COLOR);
      setIsCreating(false);
    },
  });

  const updateTagMutation = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate({ projectId });
      setEditingTagId(null);
    },
  });

  const deleteTagMutation = trpc.tag.delete.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate({ projectId });
    },
  });

  // Handlers
  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTagMutation.mutate({
      projectId,
      name: newTagName.trim(),
      color: newTagColor,
    });
  };

  const handleStartEdit = (tag: { id: number; name: string; color: string | null }) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color ?? DEFAULT_COLOR);
  };

  const handleSaveEdit = () => {
    if (!editingTagId || !editTagName.trim()) return;
    updateTagMutation.mutate({
      tagId: editingTagId,
      name: editTagName.trim(),
      color: editTagColor,
    });
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditTagName('');
    setEditTagColor('');
  };

  const handleDeleteTag = (tagId: number, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all tasks.`)) return;
    deleteTagMutation.mutate({ tagId });
  };

  // Loading state
  if (projectQuery.isLoading) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </ProjectLayout>
    );
  }

  if (!projectQuery.data) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </ProjectLayout>
    );
  }

  const project = projectQuery.data;
  const tags = tagsQuery.data ?? [];
  const isManager = project.userRole === 'OWNER' || project.userRole === 'MANAGER';

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title-lg tracking-tight text-foreground flex items-center gap-2">
              <Tag className="w-8 h-8" />
              Tag Management
            </h1>
            <p className="text-muted-foreground">Manage tags for {project.name}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}`)}>
            Back to Project
          </Button>
        </div>

        {/* Tags List */}
        <Card>
          <CardHeader>
            <CardTitle>Project Tags</CardTitle>
            <CardDescription>
              {tags.length} tag{tags.length !== 1 ? 's' : ''} in this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tagsQuery.isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : tags.length === 0 && !isCreating ? (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No tags yet</p>
                {isManager && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreating(true)}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create first tag
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {editingTagId === tag.id ? (
                      // Edit mode
                      <>
                        <div
                          className="w-6 h-6 rounded-full cursor-pointer ring-2 ring-offset-2 ring-transparent"
                          style={{ backgroundColor: editTagColor }}
                          title="Select color below"
                        />
                        <Input
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditTagColor(color)}
                              className={`w-5 h-5 rounded-full transition-transform ${
                                editTagColor === color
                                  ? 'ring-2 ring-offset-1 ring-blue-500 scale-110'
                                  : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editTagName.trim() || updateTagMutation.isPending}
                        >
                          {updateTagMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      // View mode
                      <>
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: tag.color ?? '#6B7280' }}
                        />
                        <span className="flex-1 font-medium">{tag.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {tag.taskCount} task{tag.taskCount !== 1 ? 's' : ''}
                        </span>
                        {isManager && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleStartEdit({ id: tag.id, name: tag.name, color: tag.color })
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTag(tag.id, tag.name)}
                              disabled={deleteTagMutation.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              {deleteTagMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* Create New Tag Form */}
                {isCreating && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/50">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: newTagColor }}
                    />
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateTag();
                        if (e.key === 'Escape') setIsCreating(false);
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            newTagColor === color
                              ? 'ring-2 ring-offset-1 ring-blue-500 scale-110'
                              : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || createTagMutation.isPending}
                    >
                      {createTagMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Tag Button */}
        {isManager && tags.length > 0 && !isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tag
          </Button>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Tags</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Tags help you organize and categorize tasks. You can assign multiple tags to a single
              task.
            </p>
            <p>
              Use tags for things like: feature areas, priorities, task types (bug, feature,
              refactor), or any other grouping that makes sense for your project.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default TagManagementPage;
