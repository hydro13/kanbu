/*
 * WorkspaceEditPage Component
 * Version: 2.0.0
 *
 * Admin page for complete workspace management.
 * Consolidates all workspace settings into one admin-only location.
 * Super Admins can manage all workspaces.
 * Regular Admins can only manage workspaces they are members of.
 *
 * Task: 262 - Workspace Settings consolidatie
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { trpc, getApiHost } from '@/lib/trpc'
import {
  MemberFilters,
  filterAndSortMembers,
  paginateMembers,
  getTotalPages,
  type MemberFiltersState,
  type PaginationState,
} from '@/components/workspace/MemberFilters'
import { CanDoIfDomainAdmin } from '@/components/CanDo'

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const DEFAULT_PAGE_SIZE = 10

// =============================================================================
// Types
// =============================================================================

// Role badge styling helper
function getRoleBadgeStyle(role: string): string {
  switch (role) {
    case 'SYSTEM':
      return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium'
    case 'ADMIN':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    case 'MEMBER':
      return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
    case 'VIEWER':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    default:
      return 'text-muted-foreground'
  }
}

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

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const workspaceId = parseInt(id || '0', 10)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Logo states
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<{ base64: string; mimeType: string } | null>(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now())
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null)


  // Member filters and pagination state
  const [memberFilters, setMemberFilters] = useState<MemberFiltersState>({
    search: '',
    role: 'ALL',
    sortField: 'name',
    sortOrder: 'asc',
  })
  const [memberPagination, setMemberPagination] = useState<PaginationState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  // Status messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Fetch workspace data
  const { data: workspace, isLoading: loadingWorkspace } = trpc.workspace.get.useQuery(
    { workspaceId },
    { enabled: workspaceId > 0 }
  )

  // Set form values when workspace is loaded
  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setDescription(workspace.description || '')
      setIsActive(workspace.isActive)
      if (workspace.logoUrl) {
        setCurrentLogoUrl(workspace.logoUrl)
      }
    }
  }, [workspace])

  // Queries
  const membersQuery = trpc.workspace.getMembers.useQuery(
    { workspaceId },
    { enabled: workspaceId > 0 }
  )

  // Mutations
  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate({ workspaceId })
      utils.admin.listAllWorkspaces.invalidate()
      setSuccess('Workspace updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    },
    onError: (err: { message: string }) => {
      setError(err.message)
    },
  })

  const deleteMutation = trpc.workspace.delete.useMutation({
    onSuccess: () => {
      navigate('/admin/workspaces')
    },
    onError: (err: { message: string }) => {
      setError(err.message)
    },
  })

  const uploadLogoMutation = trpc.workspace.uploadLogo.useMutation({
    onSuccess: (data) => {
      utils.workspace.get.invalidate({ workspaceId })
      utils.admin.listAllWorkspaces.invalidate()
      setCurrentLogoUrl(data.logoUrl)
      setLogoTimestamp(Date.now())
      setLogoPreview(null)
      setSelectedLogo(null)
      setLogoSuccess('Logo uploaded successfully')
      setTimeout(() => setLogoSuccess(null), 3000)
    },
    onError: (err: { message: string }) => {
      setLogoError(err.message)
    },
  })

  const removeLogoMutation = trpc.workspace.removeLogo.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate({ workspaceId })
      utils.admin.listAllWorkspaces.invalidate()
      setCurrentLogoUrl(null)
      setLogoSuccess('Logo removed successfully')
      setTimeout(() => setLogoSuccess(null), 3000)
    },
    onError: (err: { message: string }) => {
      setLogoError(err.message)
    },
  })

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setLogoError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setLogoError('File size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
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

  const handleUploadLogo = () => {
    if (selectedLogo) {
      uploadLogoMutation.mutate({
        workspaceId,
        base64: selectedLogo.base64,
        mimeType: selectedLogo.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      })
    }
  }

  const handleRemoveLogo = () => {
    if (currentLogoUrl) {
      removeLogoMutation.mutate({ workspaceId })
    }
    setLogoPreview(null)
    setSelectedLogo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCancelLogoChange = () => {
    setLogoPreview(null)
    setSelectedLogo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpdateWorkspace = () => {
    updateMutation.mutate({
      workspaceId,
      name,
      description: description || undefined,
    })
  }

  const handleToggleActive = () => {
    const newStatus = !isActive
    setIsActive(newStatus)
    updateMutation.mutate({
      workspaceId,
      isActive: newStatus,
    })
  }

  const handleDeleteWorkspace = () => {
    if (!workspace) return
    if (!confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) return
    deleteMutation.mutate({ workspaceId })
  }

  // Loading state
  if (loadingWorkspace) {
    return (
      <AdminLayout title="Edit Workspace" description="Loading...">
        <div className="text-center py-12 text-gray-500">Loading workspace...</div>
      </AdminLayout>
    )
  }

  // Not found state
  if (!workspace) {
    return (
      <AdminLayout title="Edit Workspace" description="Workspace not found">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Workspace not found</p>
          <button
            onClick={() => navigate('/admin/workspaces')}
            className="text-blue-600 hover:underline"
          >
            Back to workspaces
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Workspace Settings"
      description={`Manage: ${workspace.name}`}
    >
      <div className="max-w-4xl space-y-6">
        {/* Back Link */}
        <Link
          to="/admin/workspaces"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Workspaces
        </Link>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Workspace Details */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>Update workspace name, description, and logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="flex items-start gap-4 pb-6 border-b">
              <div className="relative">
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {logoPreview || currentLogoUrl ? (
                    <img
                      src={logoPreview || `${getApiHost()}${currentLogoUrl}?t=${logoTimestamp}`}
                      alt="Logo"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <BuildingIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Workspace Logo</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a logo (JPEG, PNG, GIF, WebP - max 5MB)
                </p>
                {logoError && (
                  <p className="text-sm text-destructive mb-2">{logoError}</p>
                )}
                {logoSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">{logoSuccess}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  {logoPreview ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadLogo}
                        disabled={uploadLogoMutation.isPending}
                      >
                        {uploadLogoMutation.isPending ? 'Uploading...' : 'Save Logo'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelLogoChange}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadIcon className="h-4 w-4 mr-2" />
                        {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      {currentLogoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={removeLogoMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          {removeLogoMutation.isPending ? 'Removing...' : 'Remove'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Name & Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleUpdateWorkspace}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Admin-only system settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Workspace Active</p>
                <p className="text-sm text-muted-foreground">
                  Inactive workspaces are hidden from non-admin users
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={updateMutation.isPending}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  isActive ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {membersQuery.data?.length ?? 0} members in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {membersQuery.isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <>
                {/* Filters */}
                {(membersQuery.data?.length ?? 0) > 0 && (
                  <MemberFilters
                    filters={memberFilters}
                    onFiltersChange={(newFilters) => {
                      setMemberFilters(newFilters)
                      setMemberPagination({ ...memberPagination, page: 1 })
                    }}
                    totalCount={membersQuery.data?.length ?? 0}
                    filteredCount={
                      filterAndSortMembers(membersQuery.data ?? [], memberFilters).length
                    }
                  />
                )}

                {/* Member List */}
                <div className="space-y-3">
                  {(() => {
                    const allMembers = membersQuery.data ?? []
                    const filteredMembers = filterAndSortMembers(allMembers, memberFilters)
                    const paginatedMembers = paginateMembers(filteredMembers, memberPagination)
                    const totalPages = getTotalPages(filteredMembers.length, memberPagination.pageSize)

                    if (paginatedMembers.length === 0) {
                      return (
                        <p className="text-muted-foreground text-center py-4">
                          {allMembers.length === 0
                            ? 'No members yet'
                            : 'No members match your filters'}
                        </p>
                      )
                    }

                    return (
                      <>
                        {paginatedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <span className={`text-sm px-2 py-1 rounded ${getRoleBadgeStyle(member.role)}`}>
                              {member.role === 'SYSTEM' ? 'System' : member.role}
                            </span>
                          </div>
                        ))}

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                              Page {memberPagination.page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberPagination({
                                  ...memberPagination,
                                  page: memberPagination.page - 1,
                                })}
                                disabled={memberPagination.page <= 1}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberPagination({
                                  ...memberPagination,
                                  page: memberPagination.page + 1,
                                })}
                                disabled={memberPagination.page >= totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Technical details about this workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono">{workspace.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono">{workspace.slug}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>
                  {new Date(workspace.createdAt).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd>
                  {workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : '-'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Danger Zone - Only visible to Domain Admins */}
        <CanDoIfDomainAdmin>
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions - Domain Admin only</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive">
                <div>
                  <p className="font-medium">Delete Workspace</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this workspace and all its data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </CanDoIfDomainAdmin>
      </div>
    </AdminLayout>
  )
}

export default WorkspaceEditPage
