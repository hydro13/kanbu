/*
 * Project Settings Page
 * Version: 1.0.0
 *
 * Manage project: members, settings, archive/delete.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
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
import { useAppSelector } from '@/store'
import { selectCurrentWorkspace } from '@/store/workspaceSlice'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

type ProjectMemberRole = 'MANAGER' | 'MEMBER' | 'VIEWER'

// =============================================================================
// Component
// =============================================================================

export function ProjectSettingsPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const utils = trpc.useUtils()

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [addMemberId, setAddMemberId] = useState('')
  const [addMemberRole, setAddMemberRole] = useState<ProjectMemberRole>('MEMBER')

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectId = projectQuery.data?.id ?? 0

  const membersQuery = trpc.project.getMembers.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  )

  const workspaceMembersQuery = trpc.workspace.getMembers.useQuery(
    { workspaceId: currentWorkspace?.id ?? 0 },
    { enabled: !!currentWorkspace }
  )

  // Sync project data to form
  useEffect(() => {
    if (projectQuery.data) {
      setName(projectQuery.data.name)
      setDescription(projectQuery.data.description ?? '')
      setStartDate(projectQuery.data.startDate ? projectQuery.data.startDate.split('T')[0] ?? '' : '')
      setEndDate(projectQuery.data.endDate ? projectQuery.data.endDate.split('T')[0] ?? '' : '')
    }
  }, [projectQuery.data])

  // Scroll to anchor (e.g., #members) when URL hash changes
  useEffect(() => {
    const hash = location.hash
    const isDataLoaded = !!projectQuery.data
    if (hash && isDataLoaded) {
      const element = document.querySelector(hash)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [location.hash, projectQuery.data !== null])

  // Mutations
  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ projectId })
      utils.project.list.invalidate()
    },
  })

  const addMemberMutation = trpc.project.addMember.useMutation({
    onSuccess: () => {
      setAddMemberId('')
      utils.project.getMembers.invalidate({ projectId })
    },
  })

  const removeMemberMutation = trpc.project.removeMember.useMutation({
    onSuccess: () => {
      utils.project.getMembers.invalidate({ projectId })
    },
  })

  const updateRoleMutation = trpc.project.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.project.getMembers.invalidate({ projectId })
    },
  })

  const archiveMutation = trpc.project.archive.useMutation({
    onSuccess: () => {
      navigate('/workspaces')
    },
  })

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      navigate('/workspaces')
    },
  })

  // Handlers
  const handleUpdateProject = () => {
    updateMutation.mutate({
      projectId,
      name,
      description: description || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  const handleAddMember = () => {
    const userId = parseInt(addMemberId, 10)
    if (isNaN(userId)) return
    addMemberMutation.mutate({
      projectId,
      userId,
      role: addMemberRole,
    })
  }

  const handleRemoveMember = (memberId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    removeMemberMutation.mutate({
      projectId,
      userId: memberId,
    })
  }

  const handleUpdateRole = (memberId: number, newRole: ProjectMemberRole) => {
    updateRoleMutation.mutate({
      projectId,
      userId: memberId,
      role: newRole,
    })
  }

  const handleArchive = () => {
    if (!confirm(`Are you sure you want to archive "${name}"?`)) return
    archiveMutation.mutate({ projectId })
  }

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to DELETE "${name}"? This cannot be undone.`)) return
    deleteMutation.mutate({ projectId })
  }

  // Loading/error states
  if (projectQuery.isLoading) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </ProjectLayout>
    )
  }

  if (!projectQuery.data) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </ProjectLayout>
    )
  }

  const project = projectQuery.data
  const userRole = project.userRole
  const isManager = userRole === 'OWNER' || userRole === 'MANAGER'
  const isOwner = userRole === 'OWNER'

  // Get workspace members not already in project
  const availableMembers = workspaceMembersQuery.data?.filter(
    (wm) => !membersQuery.data?.some((pm) => pm.id === wm.id)
  ) ?? []

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
            <p className="text-muted-foreground">
              Manage {project.name}{' '}
              {project.identifier && (
                <span className="font-mono text-xs">({project.identifier})</span>
              )}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}`)}>
            Back to Project
          </Button>
        </div>

        {/* Project Details */}
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Update project information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleUpdateProject}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Project Info (read-only for non-managers) */}
        {!isManager && (
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <p>{project.name}</p>
              </div>
              {project.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p>{project.description}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Your role:</span>
                <p className="capitalize">{userRole?.toLowerCase()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members */}
        <Card id="members">
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {membersQuery.data?.length ?? 0} members in this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-3">
                {membersQuery.data?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isManager && member.role !== 'OWNER' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as ProjectMemberRole)}
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                      ) : (
                        <span className="text-sm text-muted-foreground capitalize">
                          {member.role.toLowerCase()}
                        </span>
                      )}
                      {isManager && member.role !== 'OWNER' && (
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Members */}
        {isManager && availableMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Add Members</CardTitle>
              <CardDescription>Add workspace members to this project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Member</label>
                  <select
                    value={addMemberId}
                    onChange={(e) => setAddMemberId(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a member...</option>
                    {availableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40 space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value as ProjectMemberRole)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleAddMember}
                disabled={addMemberMutation.isPending || !addMemberId}
              >
                {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Danger Zone */}
        {isManager && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Careful - these actions may be irreversible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Archive */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Archive Project</p>
                  <p className="text-sm text-muted-foreground">
                    Hide this project from active view. Can be unarchived later.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending ? 'Archiving...' : 'Archive Project'}
                </Button>
              </div>

              {/* Delete (owner only) */}
              {isOwner && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-destructive">
                  <div>
                    <p className="font-medium">Delete Project</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this project and all its data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectLayout>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ProjectSettingsPage
