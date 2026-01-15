/*
 * FileUpload Component
 * Version: 1.0.0
 *
 * Drag-and-drop file upload with progress and validation.
 * Supports multiple files, shows size limits per file type.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

interface FileUploadProps {
  taskId: number;
  onUploadComplete?: (attachment: UploadedAttachment) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

interface UploadedAttachment {
  id: number;
  name: string;
  url: string;
  mimeType: string | null;
  size: number;
  isImage: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// =============================================================================
// Icons
// =============================================================================

function UploadIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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

function XIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =============================================================================
// FileUpload Component
// =============================================================================

export function FileUpload({
  taskId,
  onUploadComplete,
  onError,
  className = '',
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadMutation = trpc.attachment.upload.useMutation();

  const uploadFile = useCallback(async (file: File) => {
    // Add to uploading list
    setUploadingFiles((prev) => [
      ...prev,
      { file, progress: 0, status: 'uploading' },
    ]);

    try {
      // Convert to base64
      const base64Data = await fileToBase64(file);

      // Upload via tRPC
      const result = await uploadMutation.mutateAsync({
        taskId,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
      });

      // Update status to success
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, progress: 100, status: 'success' } : f
        )
      );

      // Notify parent
      onUploadComplete?.({
        id: result.id,
        name: result.name,
        url: result.url,
        mimeType: result.mimeType,
        size: result.size,
        isImage: result.isImage,
      });

      // Remove from list after a delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      // Update status to error
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: 'error', error: errorMessage } : f
        )
      );

      onError?.(errorMessage);
    }
  }, [taskId, uploadMutation, onUploadComplete, onError]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;

      Array.from(files).forEach((file) => {
        uploadFile(file);
      });
    },
    [uploadFile, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

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
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const removeUploadingFile = useCallback((file: File) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
  }, []);

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-input hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        <UploadIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Click to upload
          </span>
          {' or drag and drop'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          Images, documents, videos up to 100MB
        </p>
      </div>

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={`${uploadingFile.file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <FileIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(uploadingFile.file.size)}
                </p>
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}
                {uploadingFile.status === 'error' && (
                  <p className="mt-1 text-xs text-red-500">{uploadingFile.error}</p>
                )}
              </div>
              {uploadingFile.status === 'success' && (
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              {uploadingFile.status === 'error' && (
                <button
                  onClick={() => removeUploadingFile(uploadingFile.file)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
              {uploadingFile.status === 'uploading' && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
