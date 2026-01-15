/*
 * WorkspaceCreatePage Component
 * Version: 1.1.0
 *
 * Admin page for creating new workspaces with logo upload.
 *
 * Task: 253 - Multi-Workspace / Organisatie Systeem
 */

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// =============================================================================
// Icons
// =============================================================================

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<{ base64: string; mimeType: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: async (workspace) => {
      // If logo was selected, upload it after workspace creation
      if (selectedLogo) {
        try {
          await uploadLogoMutation.mutateAsync({
            workspaceId: workspace.id,
            base64: selectedLogo.base64,
            mimeType: selectedLogo.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          })
        } catch {
          // Continue even if logo upload fails - workspace was created
        }
      }
      navigate(`/admin/workspaces`)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const uploadLogoMutation = trpc.workspace.uploadLogo.useMutation()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB')
      return
    }

    // Read file as base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      // Remove data URL prefix to get pure base64
      const base64 = result.split(',')[1]
      if (base64) {
        setLogoPreview(result)
        setSelectedLogo({
          base64,
          mimeType: file.type,
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setSelectedLogo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    })
  }

  const isPending = createMutation.isPending || uploadLogoMutation.isPending

  return (
    <AdminLayout
      title="Create Workspace"
      description="Create a new organisation workspace"
    >
      <div className="max-w-2xl">
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-card border border-border p-6">
            {/* Workspace Logo Upload */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <BuildingIcon className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove logo"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Workspace Logo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Upload a logo for your workspace (JPEG, PNG, GIF, WebP - max 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <UploadIcon className="h-4 w-4" />
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Organisation"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The display name for this workspace
              </p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/workspaces')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default WorkspaceCreatePage
