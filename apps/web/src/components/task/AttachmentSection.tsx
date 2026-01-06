/*
 * AttachmentSection Component
 * Version: 1.0.0
 *
 * Displays task attachments with preview, download, and delete.
 * Includes file upload component.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { FileUpload } from './FileUpload';

// =============================================================================
// Types
// =============================================================================

interface AttachmentSectionProps {
  taskId: number;
  canEdit?: boolean;
  className?: string;
}

interface Attachment {
  id: number;
  name: string;
  path: string;
  url: string;
  mimeType: string | null;
  size: number;
  isImage: boolean;
  createdAt: string;
  user: {
    id: number;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

// =============================================================================
// Icons
// =============================================================================

function PaperClipIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function DownloadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ImageIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DocumentIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function VideoIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileTypeIcon(mimeType: string | null) {
  if (!mimeType) return DocumentIcon;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return VideoIcon;
  return DocumentIcon;
}

function getFileTypeColor(mimeType: string | null): string {
  if (!mimeType) return 'text-gray-400';
  if (mimeType.startsWith('image/')) return 'text-blue-400';
  if (mimeType.startsWith('video/')) return 'text-purple-400';
  if (mimeType.includes('pdf')) return 'text-red-400';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-500';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'text-green-500';
  return 'text-gray-400';
}

// =============================================================================
// AttachmentItem Component
// =============================================================================

interface AttachmentItemProps {
  attachment: Attachment;
  canDelete: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function AttachmentItem({ attachment, canDelete, onDelete, isDeleting }: AttachmentItemProps) {
  const [showPreview, setShowPreview] = useState(false);
  const IconComponent = getFileTypeIcon(attachment.mimeType);
  const iconColor = getFileTypeColor(attachment.mimeType);

  const handleDownload = useCallback(() => {
    window.open(attachment.url, '_blank');
  }, [attachment.url]);

  return (
    <>
      <div className="group flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
        {/* Preview / Icon */}
        {attachment.isImage ? (
          <button
            onClick={() => setShowPreview(true)}
            className="flex-shrink-0 w-12 h-12 rounded overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className={`flex-shrink-0 ${iconColor}`}>
            <IconComponent className="h-10 w-10" />
          </div>
        )}

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {attachment.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(attachment.size)} • {formatDate(attachment.createdAt)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            by {attachment.user.name || attachment.user.username}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-gray-700"
            title="Download"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(attachment.id)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {showPreview && attachment.isImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowPreview(false)}
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </>
  );
}

// =============================================================================
// AttachmentSection Component
// =============================================================================

export function AttachmentSection({
  taskId,
  canEdit = true,
  className = '',
}: AttachmentSectionProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch attachments
  const { data: attachments, refetch } = trpc.attachment.list.useQuery(
    { taskId },
    { staleTime: 30 * 1000 }
  );

  // Delete mutation
  const deleteMutation = trpc.attachment.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeletingId(null);
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = useCallback(
    async (attachmentId: number) => {
      if (window.confirm('Are you sure you want to delete this attachment?')) {
        setDeletingId(attachmentId);
        deleteMutation.mutate({ attachmentId });
      }
    },
    [deleteMutation]
  );

  const handleUploadComplete = useCallback(() => {
    refetch();
  }, [refetch]);

  const attachmentList = attachments ?? [];
  const hasAttachments = attachmentList.length > 0;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <PaperClipIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Attachments
          {hasAttachments && (
            <span className="ml-1.5 text-gray-400">({attachmentList.length})</span>
          )}
        </h3>
      </div>

      {/* Upload Component */}
      {canEdit && (
        <FileUpload
          taskId={taskId}
          onUploadComplete={handleUploadComplete}
          className="mb-4"
        />
      )}

      {/* Attachments List */}
      {hasAttachments ? (
        <div className="space-y-2">
          {attachmentList.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              canDelete={canEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === attachment.id}
            />
          ))}
        </div>
      ) : (
        !canEdit && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No attachments
          </p>
        )
      )}
    </div>
  );
}

export default AttachmentSection;
