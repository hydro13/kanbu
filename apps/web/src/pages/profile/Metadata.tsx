/*
 * Metadata Page
 * Version: 1.1.0
 *
 * User profile page for viewing and managing custom metadata.
 * Compact layout with inline form and tighter spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState } from 'react';
import { ProfileLayout } from '../../components/profile/ProfileLayout';
import { Button } from '../../components/ui/button';
import { trpc } from '../../lib/trpc';

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Component
// =============================================================================

export function Metadata() {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const utils = trpc.useUtils();
  const { data: metadata, isLoading } = trpc.user.getMetadata.useQuery();

  const setMetadata = trpc.user.setMetadata.useMutation({
    onSuccess: () => {
      utils.user.getMetadata.invalidate();
      setNewKey('');
      setNewValue('');
      setEditingKey(null);
      setEditValue('');
    },
  });

  const deleteMetadata = trpc.user.deleteMetadata.useMutation({
    onSuccess: () => {
      utils.user.getMetadata.invalidate();
    },
  });

  const handleAdd = () => {
    if (newKey.trim() && newValue.trim()) {
      setMetadata.mutate({ key: newKey.trim(), value: newValue.trim() });
    }
  };

  const handleEdit = (key: string) => {
    if (editValue.trim()) {
      setMetadata.mutate({ key, value: editValue.trim() });
    }
  };

  const startEditing = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  if (isLoading) {
    return (
      <ProfileLayout title="Metadata" description="Custom key-value data for your profile">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading metadata...</p>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout title="Metadata" description="Custom key-value data for your profile">
      <div className="bg-card rounded-card border border-border">
        {/* Add New Metadata - inline form */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <input
              placeholder="Key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-32 h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newKey.trim() || !newValue.trim() || setMetadata.isPending}
              className="h-8"
            >
              {setMetadata.isPending ? '...' : 'Add'}
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              {metadata?.length ?? 0} items
            </span>
          </div>
        </div>

        {/* Existing Metadata */}
        <div className="p-4">
          {!metadata || metadata.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No metadata stored yet</p>
          ) : (
            <div className="space-y-2">
              {metadata.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  {editingKey === item.key ? (
                    <>
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-28 truncate">
                        {item.key}
                      </span>
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 h-7 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEdit(item.key)}
                        disabled={setMetadata.isPending}
                        className="h-7 px-2 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingKey(null)}
                        className="h-7 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-28 truncate">
                        {item.key}
                      </span>
                      <span className="flex-1 text-sm truncate">{item.value}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(item.key, item.value)}
                        className="h-7 px-2 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => deleteMetadata.mutate({ key: item.key })}
                        disabled={deleteMetadata.isPending}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProfileLayout>
  );
}

export default Metadata;
