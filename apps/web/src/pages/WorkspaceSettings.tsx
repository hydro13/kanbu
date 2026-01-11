/*
 * Workspace Settings Page
 * Version: 2.0.0
 *
 * Manage workspace: members, invitations, logo, and settings.
 * Now uses RichTextEditor for rich text description support.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T04:10 CET
 *
 * Modified by:
 * Session: MAX-2026-01-09
 * Change: Upgraded to RichTextEditor (Lexical) for rich text support
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card'
import { useAppSelector } from '../store'
import { selectCurrentWorkspace } from '../store/workspaceSlice'
import { trpc, getApiHost } from '../lib/trpc'
import { useNavigate } from 'react-router-dom'
import { UserSearchDropdown } from '../components/workspace/UserSearchDropdown'
import { AddMembersModal } from '../components/workspace/AddMembersModal'
import {
  MemberFilters,
  filterAndSortMembers,
  paginateMembers,
  getTotalPages,
  type MemberFiltersState,
  type PaginationState,
} from '../components/workspace/MemberFilters'
import { RichTextEditor, getDisplayContent, isLexicalContent, lexicalToPlainText } from '../components/editor'
import type { EditorState, LexicalEditor } from 'lexical'

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const DEFAULT_PAGE_SIZE = 10

// =============================================================================
// Types
// =============================================================================

type InviteRole = 'ADMIN' | 'MEMBER' | 'VIEWER'

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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceSettingsPage() {
  const navigate = useNavigate()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [name, setName] = useState(currentWorkspace?.name ?? '')
  const [description, setDescription] = useState(
    getDisplayContent(currentWorkspace?.description ?? '')
  )
  const [editorKey] = useState(0)

  // Logo states
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<{ base64: string; mimeType: string } | null>(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now())
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('MEMBER')
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false)

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

  // Fetch workspace details with logo
  const workspaceQuery = trpc.workspace.get.useQuery(
    { workspaceId: currentWorkspace?.id ?? 0 },
    { enabled: !!currentWorkspace }
  )

  // Initialize logo URL from fetched data
  useEffect(() => {
    if (workspaceQuery.data?.logoUrl) {
      setCurrentLogoUrl(workspaceQuery.data.logoUrl)
    }
  }, [workspaceQuery.data])

  // Queries
  const membersQuery = trpc.workspace.getMembers.useQuery(
    { workspaceId: currentWorkspace?.id ?? 0 },
    { enabled: !!currentWorkspace }
  )

  const invitationsQuery = trpc.workspace.getInvitations.useQuery(
    { workspaceId: currentWorkspace?.id ?? 0 },
    { enabled: !!currentWorkspace && (currentWorkspace.role === 'OWNER' || currentWorkspace.role === 'ADMIN') }
  )

  // Mutations
  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate()
    },
  })

  const inviteMutation = trpc.workspace.invite.useMutation({
    onSuccess: () => {
      setInviteEmail('')
      utils.workspace.getInvitations.invalidate()
    },
  })

  const removeMemberMutation = trpc.workspace.removeMember.useMutation({
    onSuccess: () => {
      utils.workspace.getMembers.invalidate()
    },
  })

  const updateRoleMutation = trpc.workspace.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.workspace.getMembers.invalidate()
    },
  })

  const cancelInvitationMutation = trpc.workspace.cancelInvitation.useMutation({
    onSuccess: () => {
      utils.workspace.getInvitations.invalidate()
    },
  })

  const deleteMutation = trpc.workspace.delete.useMutation({
    onSuccess: () => {
      navigate('/')
    },
  })

  const uploadLogoMutation = trpc.workspace.uploadLogo.useMutation({
    onSuccess: (data) => {
      utils.workspace.get.invalidate({ workspaceId: currentWorkspace?.id ?? 0 })
      utils.workspace.list.invalidate()
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
      utils.workspace.get.invalidate({ workspaceId: currentWorkspace?.id ?? 0 })
      utils.workspace.list.invalidate()
      setCurrentLogoUrl(null)
      setLogoSuccess('Logo removed successfully')
      setTimeout(() => setLogoSuccess(null), 3000)
    },
    onError: (err: { message: string }) => {
      setLogoError(err.message)
    },
  })

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (_editorState: EditorState, _editor: LexicalEditor, jsonString: string) => {
      setDescription(jsonString)
    },
    []
  )

  // Check if description content is empty
  const isDescriptionEmpty = useCallback((content: string) => {
    if (!content) return true
    if (!isLexicalContent(content)) return !content.trim()
    const plainText = lexicalToPlainText(content)
    return !plainText.trim()
  }, [])

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
    if (selectedLogo && currentWorkspace) {
      uploadLogoMutation.mutate({
        workspaceId: currentWorkspace.id,
        base64: selectedLogo.base64,
        mimeType: selectedLogo.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      })
    }
  }

  const handleRemoveLogo = () => {
    if (currentLogoUrl && currentWorkspace) {
      removeLogoMutation.mutate({ workspaceId: currentWorkspace.id })
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
    if (!currentWorkspace) return
    updateMutation.mutate({
      workspaceId: currentWorkspace.id,
      name,
      description: isDescriptionEmpty(description) ? undefined : description,
    })
  }

  const handleInvite = () => {
    if (!currentWorkspace || !inviteEmail) return
    inviteMutation.mutate({
      workspaceId: currentWorkspace.id,
      email: inviteEmail,
      role: inviteRole,
    })
  }

  const handleRemoveMember = (memberId: number) => {
    if (!currentWorkspace) return
    if (!confirm('Are you sure you want to remove this member?')) return
    removeMemberMutation.mutate({
      workspaceId: currentWorkspace.id,
      userId: memberId,
    })
  }

  const handleUpdateRole = (memberId: number, newRole: InviteRole) => {
    if (!currentWorkspace) return
    updateRoleMutation.mutate({
      workspaceId: currentWorkspace.id,
      userId: memberId,
      role: newRole,
    })
  }

  const handleCancelInvitation = (invitationId: number) => {
    if (!currentWorkspace) return
    cancelInvitationMutation.mutate({
      invitationId,
    })
  }

  const handleDeleteWorkspace = () => {
    if (!currentWorkspace) return
    if (!confirm(`Are you sure you want to delete "${currentWorkspace.name}"? This action cannot be undone.`)) return
    deleteMutation.mutate({ workspaceId: currentWorkspace.id })
  }

  // Loading/error states
  if (!currentWorkspace) {
    return (
      <WorkspaceLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No workspace selected</p>
        </div>
      </WorkspaceLayout>
    )
  }

  const isAdmin = currentWorkspace.role === 'OWNER' || currentWorkspace.role === 'ADMIN'
  const isOwner = currentWorkspace.role === 'OWNER'

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
          <p className="text-muted-foreground">
            Manage {currentWorkspace.name}
          </p>
        </div>

        {/* Workspace Details */}
        {isAdmin && (
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
                <RichTextEditor
                  key={editorKey}
                  initialContent={description || undefined}
                  onChange={handleEditorChange}
                  placeholder="Add a description... Use **bold**, *italic*, lists, and more!"
                  minHeight="120px"
                  maxHeight="300px"
                  namespace={`workspace-description-${currentWorkspace?.id}-${editorKey}`}
                />
                <p className="text-xs text-muted-foreground">Rich text formatting supported</p>
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
        )}

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
                            <div className="flex items-center gap-2">
                              {isAdmin && member.role !== 'OWNER' ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateRole(member.id, e.target.value as InviteRole)}
                                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                >
                                  <option value="VIEWER">Viewer</option>
                                  <option value="MEMBER">Member</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                              ) : (
                                <span className="text-sm text-muted-foreground capitalize">
                                  {member.role.toLowerCase()}
                                </span>
                              )}
                              {isAdmin && member.role !== 'OWNER' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  disabled={removeMemberMutation.isPending}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
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

        {/* Add Existing Users */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add Existing Users</CardTitle>
                  <CardDescription>Add users who already have an account</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMembersModalOpen(true)}
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Bulk Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UserSearchDropdown
                workspaceId={currentWorkspace.id}
                onMemberAdded={() => {
                  utils.workspace.getMembers.invalidate({ workspaceId: currentWorkspace.id })
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Invite Members */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Invite New Members</CardTitle>
              <CardDescription>Send an email invitation to join this workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="w-40 space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !inviteEmail}
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Pending Invitations */}
        {isAdmin && invitationsQuery.data && invitationsQuery.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                {invitationsQuery.data.length} pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitationsQuery.data.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {invitation.role.toLowerCase()} · Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={cancelInvitationMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        {isOwner && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
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
        )}
      </div>

      {/* Add Members Modal */}
      <AddMembersModal
        workspaceId={currentWorkspace.id}
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        onMembersAdded={() => {
          utils.workspace.getMembers.invalidate({ workspaceId: currentWorkspace.id })
        }}
      />
    </WorkspaceLayout>
  )
}
