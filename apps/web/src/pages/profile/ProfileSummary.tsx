/*
 * ProfileSummary Page
 * Version: 1.3.0
 *
 * Summary view of user profile with compact, professional layout.
 * Designed to fit on 1920x1080 at 100% zoom without scrolling.
 *
 * Task: 264 - Profile Summary pagina compacter maken
 */

import { Link } from 'react-router-dom'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

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

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

// =============================================================================
// Helper Components
// =============================================================================

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      active
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    }`}>
      {label || (active ? 'Active' : 'Inactive')}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors = {
    OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    MEMBER: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[role as keyof typeof colors] || colors.MEMBER}`}>
      {role.toLowerCase()}
    </span>
  )
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-card border border-border ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function ProfileSummary() {
  const utils = trpc.useUtils()
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery()
  const verifyEmail = trpc.user.verifyEmail.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate()
    },
  })

  if (isLoading) {
    return (
      <ProfileLayout title="Profile Summary" description="Overview of your account">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </ProfileLayout>
    )
  }

  if (!profile) {
    return (
      <ProfileLayout title="Profile Summary" description="Overview of your account">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </ProfileLayout>
    )
  }

  const notificationFilterLabels: Record<number, string> = {
    1: 'All tasks',
    2: 'Assigned to me',
    3: 'Created by me',
    4: 'Assigned or created',
  }

  return (
    <ProfileLayout title="Profile Summary" description="Overview of your account">
      {/* Top Row: Profile Card + Workspaces + Projects */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Profile Card */}
        <div className="bg-card rounded-card border border-border p-4">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {profile.name?.charAt(0)?.toUpperCase() || profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{profile.name}</p>
              <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
        </div>

        {/* Workspaces */}
        <div className="bg-card rounded-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Workspaces</span>
          </div>
          {profile.workspaces && profile.workspaces.length > 0 ? (
            <div className="space-y-2">
              {profile.workspaces.slice(0, 3).map((ws) => (
                <div key={ws.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{ws.name}</span>
                  <RoleBadge role={ws.role} />
                </div>
              ))}
              {profile.workspaces.length > 3 && (
                <p className="text-xs text-muted-foreground">+{profile.workspaces.length - 3} more</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No workspaces</p>
          )}
        </div>

        {/* Recent Projects */}
        <div className="bg-card rounded-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recent Projects</span>
          </div>
          {profile.recentProjects && profile.recentProjects.length > 0 ? (
            <div className="space-y-2">
              {profile.recentProjects.slice(0, 3).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <Link
                    to={`/project/${project.id}/board`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                  >
                    {project.name}
                  </Link>
                  <span className="text-xs text-muted-foreground truncate ml-2">{project.workspace.name}</span>
                </div>
              ))}
              {profile.recentProjects.length > 3 && (
                <Link to="/workspaces" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  View all projects →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No projects yet</p>
          )}
        </div>
      </div>

      {/* Bottom Row: 3 Equal Sections */}
      <div className="grid grid-cols-3 gap-4">
        {/* Account Details */}
        <Section title="Account Details">
          <InfoRow label="Username" value={`@${profile.username}`} />
          <InfoRow label="Display Name" value={profile.name} />
          <InfoRow label="Status" value={<StatusBadge active={profile.isActive} />} />
          <InfoRow
            label="Email Verified"
            value={
              profile.emailVerified ? (
                <StatusBadge active={true} label="Verified" />
              ) : (
                <div className="flex items-center gap-2">
                  <StatusBadge active={false} label="No" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyEmail.mutate()}
                    disabled={verifyEmail.isPending}
                    className="h-6 text-xs px-2"
                  >
                    {verifyEmail.isPending ? '...' : 'Verify'}
                  </Button>
                </div>
              )
            }
          />
          <InfoRow label="Member Since" value={new Date(profile.createdAt).toLocaleDateString()} />
        </Section>

        {/* Security */}
        <Section title="Security">
          <InfoRow
            label="Two-Factor Auth"
            value={<StatusBadge active={profile.twofactorActivated} label={profile.twofactorActivated ? 'Enabled' : 'Disabled'} />}
          />
          <InfoRow
            label="Last Login"
            value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : 'Never'}
          />
          <InfoRow label="Failed Logins" value={profile.failedLoginCount} />
          <InfoRow label="Account Locked" value={profile.lockedUntil ? 'Yes' : 'No'} />

          {/* Connected Accounts sub-section */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-muted-foreground mb-3">Connected Accounts</p>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                profile.googleId
                  ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}>
                Google
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                profile.githubId
                  ? 'bg-gray-900 text-white border border-gray-700'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}>
                GitHub
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                profile.gitlabId
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}>
                GitLab
              </span>
            </div>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <InfoRow label="Theme" value={profile.theme || 'system'} />
          <InfoRow label="Timezone" value={profile.timezone} />
          <InfoRow label="Language" value={profile.language} />
          <InfoRow
            label="Notifications"
            value={<StatusBadge active={profile.notificationsEnabled} label={profile.notificationsEnabled ? 'On' : 'Off'} />}
          />
          <InfoRow label="Filter" value={notificationFilterLabels[profile.notificationFilter] || '-'} />
          {profile.hourlyRate && (
            <InfoRow label="Hourly Rate" value={`€${profile.hourlyRate}`} />
          )}

          {/* Public Access sub-section */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-muted-foreground mb-3">Public Access</p>
            {profile.publicToken ? (
              <div>
                <StatusBadge active={true} label="Enabled" />
                <p className="text-xs text-muted-foreground mt-2">RSS & iCal feeds available</p>
              </div>
            ) : (
              <StatusBadge active={false} label="Disabled" />
            )}
          </div>
        </Section>
      </div>
    </ProfileLayout>
  )
}

export default ProfileSummary
