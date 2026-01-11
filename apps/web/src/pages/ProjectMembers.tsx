/*
 * Project Members Page
 * Version: 1.1.0
 *
 * Manage project members: add, remove, change roles.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: member-management-fix
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: MAX
 * Signed: 2026-01-04T12:00 CET
 *
 * Modified: 2026-01-11
 * Change: Fixed avatar rendering using getMediaUrl() helper
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { Button } from '@/components/ui/button'
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
import { trpc, getMediaUrl } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

type ProjectMemberRole = 'MANAGER' | 'MEMBER' | 'VIEWER'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get initials from a name (first letter of first and last word)
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0)
  if (parts.length === 0) return '?'
  const first = parts[0]
  if (parts.length === 1 || !first) {
    return first ? first.charAt(0).toUpperCase() : '?'
  }
  const last = parts[parts.length - 1]
  return (first.charAt(0) + (last ? last.charAt(0) : '')).toUpperCase()
}

// =============================================================================
// Component
// =============================================================================

export function ProjectMembersPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const navigate = useNavigate()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const utils = trpc.useUtils()

  // Form states
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

  // Mutations
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

  // Handlers
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

  // Get workspace members not already in project
  const availableMembers = workspaceMembersQuery.data?.filter(
    (wm) => !membersQuery.data?.some((pm) => pm.id === wm.id)
  ) ?? []

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Members</h1>
            <p className="text-muted-foreground">
              Manage members of {project.name}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}/board`)}>
            Back to Board
          </Button>
        </div>

        {/* Current Members */}
        <Card>
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
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium overflow-hidden">
                        {getMediaUrl(member.avatarUrl) ? (
                          <img
                            src={getMediaUrl(member.avatarUrl)}
                            alt={member.name ?? member.username}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          getInitials(member.name ?? member.username)
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.name ?? member.username}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
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
                        <span className="text-sm text-muted-foreground capitalize px-3">
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
                {membersQuery.data?.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No members yet
                  </p>
                )}
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
                        {member.name ?? member.username} ({member.email})
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

        {/* No available members message */}
        {isManager && availableMembers.length === 0 && workspaceMembersQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle>Add Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                All workspace members are already part of this project.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Non-manager info */}
        {!isManager && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm text-center">
                Only project managers can add or remove members.
              </p>
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

export default ProjectMembersPage
