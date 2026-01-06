/*
 * EditProfile Page
 * Version: 1.1.0
 *
 * User profile editing page with form for basic info, theme, and preferences.
 * Compact 2-column layout to fit on 1920x1080 without scrolling.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState, useEffect } from 'react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { SocialLinksEditor } from '../../components/profile/SocialLinksEditor'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Compact Input Components
// =============================================================================

function CompactInput({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  hint,
  type = 'text',
}: {
  id: string
  label: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  hint?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600
          ${disabled ? 'bg-gray-50 dark:bg-gray-800 text-gray-500' : 'bg-white dark:bg-gray-900'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function CompactSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function EditProfile() {
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [language, setLanguage] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [hasChanges, setHasChanges] = useState(false)

  const utils = trpc.useUtils()
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery()

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate()
      setHasChanges(false)
    },
  })

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setTimezone(profile.timezone ?? '')
      setLanguage(profile.language ?? '')
      setTheme((profile.theme as 'light' | 'dark' | 'system') ?? 'system')
    }
  }, [profile])

  // Track changes
  useEffect(() => {
    if (profile) {
      const changed =
        name !== (profile.name ?? '') ||
        timezone !== (profile.timezone ?? '') ||
        language !== (profile.language ?? '') ||
        theme !== ((profile.theme as 'light' | 'dark' | 'system') ?? 'system')
      setHasChanges(changed)
    }
  }, [name, timezone, language, theme, profile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({
      name: name || undefined,
      timezone: timezone || undefined,
      language: language || undefined,
      theme,
    })
  }

  if (isLoading) {
    return (
      <ProfileLayout title="Edit Profile" description="Update your profile information">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </ProfileLayout>
    )
  }

  if (!profile) {
    return (
      <ProfileLayout title="Edit Profile" description="Update your profile information">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Could not load profile</p>
        </div>
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout title="Edit Profile" description="Update your profile information">
      <form onSubmit={handleSubmit}>
        {/* 2-Column Layout */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Left Column: Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Basic Information</h3>
            </div>
            <div className="p-4 space-y-3">
              <CompactInput
                id="email"
                label="Email"
                type="email"
                value={profile.email}
                disabled
                hint="Email cannot be changed"
              />
              <CompactInput
                id="username"
                label="Username"
                value={profile.username}
                disabled
                hint="Username cannot be changed"
              />
              <CompactInput
                id="name"
                label="Display Name"
                value={name}
                onChange={setName}
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Right Column: Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Preferences</h3>
            </div>
            <div className="p-4 space-y-3">
              <CompactSelect
                id="theme"
                label="Theme"
                value={theme}
                onChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                options={[
                  { value: 'system', label: 'System Default' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
              <CompactInput
                id="timezone"
                label="Timezone"
                value={timezone}
                onChange={setTimezone}
                placeholder="e.g., Europe/Amsterdam"
              />
              <CompactInput
                id="language"
                label="Language"
                value={language}
                onChange={setLanguage}
                placeholder="e.g., en, nl"
              />
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between">
          <div>
            {updateProfile.isSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Profile updated successfully!
              </span>
            )}
            {updateProfile.isError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Failed to update profile.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (profile) {
                  setName(profile.name ?? '')
                  setTimezone(profile.timezone ?? '')
                  setLanguage(profile.language ?? '')
                  setTheme((profile.theme as 'light' | 'dark' | 'system') ?? 'system')
                }
              }}
              disabled={!hasChanges}
            >
              Reset
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!hasChanges || updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Social Links Section */}
      <div className="mt-4">
        <SocialLinksEditor />
      </div>
    </ProfileLayout>
  )
}

export default EditProfile
