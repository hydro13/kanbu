/*
 * Workspace Members Page
 * Version: 1.0.0
 *
 * Shows all members of a workspace with their roles and permissions.
 * Workspace admins can invite/remove members.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 * ===================================================================
 */

import { useParams, Link } from 'react-router-dom'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Card, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { Users, Crown, Shield, User, ArrowLeft, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface Member {
  id: number
  username: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: string
  isDomainAdmin: boolean
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceMembersPage() {
  const { slug } = useParams<{ slug: string }>()

  // Fetch workspace
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Fetch members
  const membersQuery = trpc.workspace.getMembers.useQuery(
    { workspaceId: workspace?.id ?? 0 },
    { enabled: !!workspace?.id }
  )
  const members = (membersQuery.data ?? []) as Member[]

  // Group members by role
  const systemAdmins = members.filter((m) => m.role === 'SYSTEM')
  const admins = members.filter((m) => m.role === 'ADMIN')
  const regularMembers = members.filter((m) => m.role === 'MEMBER')
  const viewers = members.filter((m) => m.role === 'VIEWER')

  // Loading state
  if (workspaceQuery.isLoading || membersQuery.isLoading) {
    return (
      <WorkspaceLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </WorkspaceLayout>
    )
  }

  // Workspace not found
  if (!workspace) {
    return (
      <WorkspaceLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Workspace not found</p>
          <Link to="/workspaces" className="text-primary hover:underline flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Link>
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" />
            Members
          </h1>
          <p className="text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''} in {workspace.name}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 max-w-xl">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{systemAdmins.length}</p>
              <p className="text-xs text-muted-foreground">Domain Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{admins.length}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{regularMembers.length}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{viewers.length}</p>
              <p className="text-xs text-muted-foreground">Viewers</p>
            </CardContent>
          </Card>
        </div>

        {/* System Admins */}
        {systemAdmins.length > 0 && (
          <MemberSection
            title="Domain Administrators"
            description="Full system access across all workspaces"
            members={systemAdmins}
            icon={<Star className="h-5 w-5 text-purple-600" />}
          />
        )}

        {/* Admins */}
        {admins.length > 0 && (
          <MemberSection
            title="Workspace Administrators"
            description="Can manage workspace settings, members, and projects"
            members={admins}
            icon={<Crown className="h-5 w-5 text-amber-600" />}
          />
        )}

        {/* Members */}
        {regularMembers.length > 0 && (
          <MemberSection
            title="Members"
            description="Can create and manage tasks in assigned projects"
            members={regularMembers}
            icon={<Shield className="h-5 w-5 text-blue-600" />}
          />
        )}

        {/* Viewers */}
        {viewers.length > 0 && (
          <MemberSection
            title="Viewers"
            description="Can view workspace content (read-only)"
            members={viewers}
            icon={<User className="h-5 w-5 text-gray-600" />}
          />
        )}

        {/* Empty state */}
        {members.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No members found</p>
                <p className="text-sm mt-2">This workspace has no members yet</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WorkspaceLayout>
  )
}

// =============================================================================
// Member Section Component
// =============================================================================

interface MemberSectionProps {
  title: string
  description: string
  members: Member[]
  icon: React.ReactNode
}

function MemberSection({ title, description, members, icon }: MemberSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-3">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Member Card Component
// =============================================================================

interface MemberCardProps {
  member: Member
}

function MemberCard({ member }: MemberCardProps) {
  const roleStyles: Record<string, string> = {
    SYSTEM: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    ADMIN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    MEMBER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name || member.username}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {(member.name || member.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{member.name || member.username}</p>
                {member.isDomainAdmin && (
                  <Star className="h-3.5 w-3.5 text-purple-500 fill-purple-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>

          {/* Role Badge */}
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-medium',
              roleStyles[member.role] || roleStyles.VIEWER
            )}
          >
            {member.role}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default WorkspaceMembersPage
