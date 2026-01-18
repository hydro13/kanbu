/*
 * Avatar Page
 * Version: 1.1.0
 *
 * User profile page for uploading and managing avatar image.
 * Compact layout with smaller avatar and horizontal buttons.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState, useRef } from 'react';
import { ProfileLayout } from '../../components/profile/ProfileLayout';
import { Button } from '../../components/ui/button';
import { trpc } from '../../lib/trpc';
import { useAppDispatch } from '../../store';
import { updateUser } from '../../store/authSlice';

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// =============================================================================
// Component
// =============================================================================

export function Avatar() {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ base64: string; mimeType: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();

  const uploadAvatar = trpc.user.uploadAvatar.useMutation({
    onSuccess: (data) => {
      utils.user.getProfile.invalidate();
      // Update Redux store so header avatar updates immediately
      dispatch(updateUser({ avatarUrl: data.avatarUrl }));
      setPreview(null);
      setSelectedFile(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const removeAvatar = trpc.user.removeAvatar.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate();
      // Update Redux store to remove avatar
      dispatch(updateUser({ avatarUrl: null }));
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // Remove data URL prefix to get pure base64
      const base64 = result.split(',')[1];
      if (base64) {
        setPreview(result);
        setSelectedFile({
          base64,
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadAvatar.mutate({
        base64: selectedFile.base64,
        mimeType: selectedFile.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      });
    }
  };

  const handleRemove = () => {
    removeAvatar.mutate();
    setPreview(null);
    setSelectedFile(null);
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <ProfileLayout title="Avatar" description="Manage your profile picture">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    );
  }

  const currentAvatar = profile?.avatarUrl;
  const displayImage = preview || currentAvatar;

  return (
    <ProfileLayout title="Avatar" description="Manage your profile picture">
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-foreground">Profile Picture</h3>
          <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, GIF, WebP. Max 5MB.</p>
        </div>
        <div className="p-4">
          {/* Horizontal layout: Avatar + Actions */}
          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="flex-shrink-0">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold border-2 border-gray-200 dark:border-gray-700">
                  {profile?.name?.charAt(0)?.toUpperCase() ||
                    profile?.username?.charAt(0)?.toUpperCase() ||
                    '?'}
                </div>
              )}
            </div>

            {/* Actions + Messages */}
            <div className="flex-1 space-y-3">
              {/* File Input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Buttons Row */}
              <div className="flex gap-2">
                {!preview ? (
                  <>
                    <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                      {currentAvatar ? 'Change' : 'Upload'}
                    </Button>
                    {currentAvatar && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRemove}
                        disabled={removeAvatar.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        {removeAvatar.isPending ? 'Removing...' : 'Remove'}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={handleUpload} disabled={uploadAvatar.isPending}>
                      {uploadAvatar.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={uploadAvatar.isPending}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Status Messages */}
              {preview && <p className="text-xs text-muted-foreground">Preview - not saved yet</p>}
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              {uploadAvatar.isSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">Avatar uploaded!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}

export default Avatar;
