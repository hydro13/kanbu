/*
 * NotificationPreferences Page
 * Version: 1.1.0
 *
 * User profile page for managing notification settings.
 * Compact layout with smaller radio buttons and tighter spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Helper Components
// =============================================================================

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-offset-1
        ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

// =============================================================================
// Component
// =============================================================================

export function NotificationPreferences() {
  const utils = trpc.useUtils()
  const { data: settings, isLoading } = trpc.notification.getSettings.useQuery()

  const updateSettings = trpc.notification.updateSettings.useMutation({
    onSuccess: () => {
      utils.notification.getSettings.invalidate()
    },
  })

  const updateTypeSetting = trpc.notification.updateTypeSetting.useMutation({
    onSuccess: () => {
      utils.notification.getSettings.invalidate()
    },
  })

  if (isLoading) {
    return (
      <ProfileLayout title="Notifications" description="Manage your notification preferences">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    )
  }

  const filterOptions = [
    { value: 1, label: 'All tasks' },
    { value: 2, label: 'Assigned to me' },
    { value: 3, label: 'Created by me' },
    { value: 4, label: 'Assigned or created' },
  ]

  const typeLabels: Record<string, string> = {
    email: 'Email',
    web: 'Web',
    push: 'Push',
  }

  return (
    <ProfileLayout title="Notifications" description="Manage your notification preferences">
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: Filter + Delivery */}
        <div className="space-y-4">
          {/* Task Filter */}
          <div className={`bg-card rounded-card border border-border ${!settings?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground">Task Filter</h3>
            </div>
            <div className="p-4 space-y-1.5">
              {filterOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                    settings?.filter === option.value
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="notificationFilter"
                    value={option.value}
                    checked={settings?.filter === option.value}
                    onChange={() => updateSettings.mutate({ notificationFilter: option.value })}
                    className="h-3.5 w-3.5"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Methods */}
          <div className={`bg-card rounded-card border border-border ${!settings?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground">Delivery Methods</h3>
            </div>
            <div className="p-4 space-y-2">
              {settings?.types.map((typeSetting) => (
                <div key={typeSetting.type} className="flex items-center justify-between py-1">
                  <span className="text-sm">{typeLabels[typeSetting.type] ?? typeSetting.type}</span>
                  <Toggle
                    checked={typeSetting.enabled}
                    onChange={(checked) =>
                      updateTypeSetting.mutate({
                        notificationType: typeSetting.type as 'email' | 'web' | 'push',
                        isEnabled: checked,
                      })
                    }
                    disabled={updateTypeSetting.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Master toggle */}
        <div className="bg-card rounded-card border border-border h-fit">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings?.enabled ? 'Active' : 'All disabled'}
              </p>
            </div>
            <Toggle
              checked={settings?.enabled ?? true}
              onChange={(checked) => updateSettings.mutate({ notificationsEnabled: checked })}
              disabled={updateSettings.isPending}
            />
          </div>
          <div className="p-4 text-xs text-muted-foreground space-y-1">
            <p><strong>Task:</strong> Assignments, due dates, comments</p>
            <p><strong>Project:</strong> Invitations, member changes</p>
            <p><strong>System:</strong> Security alerts, announcements</p>
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}

export default NotificationPreferences
