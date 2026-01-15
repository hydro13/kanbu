/*
 * EditProfile Page
 * Version: 1.3.0
 *
 * User profile editing page with form for basic info, theme, and preferences.
 * Compact 2-column layout to fit on 1920x1080 without scrolling.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 *
 * Modified: 2026-01-15
 * Change: Integrated useTheme hook for theme management (Fase 3.1)
 * Change: Added accent color picker (Fase 3.2)
 */

import { useState, useEffect } from 'react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { SocialLinksEditor } from '../../components/profile/SocialLinksEditor'
import { AccentPicker } from '../../components/theme'
import { trpc } from '../../lib/trpc'
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext'

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
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-9 px-3 text-sm rounded-md border border-input
          ${disabled ? 'bg-muted text-muted-foreground' : 'bg-background'}
          focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent`}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
  const [hasChanges, setHasChanges] = useState(false)

  // Theme is managed by ThemeContext - changes are applied immediately
  const { theme, setTheme: setThemeGlobal, isSyncing: isThemeSyncing } = useTheme()

  const utils = trpc.useUtils()
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery()

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate()
      setHasChanges(false)
    },
  })

  // Initialize form with profile data (excluding theme - handled by ThemeContext)
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setTimezone(profile.timezone ?? '')
      setLanguage(profile.language ?? '')
    }
  }, [profile])

  // Track changes (excluding theme - it's saved immediately via ThemeContext)
  useEffect(() => {
    if (profile) {
      const changed =
        name !== (profile.name ?? '') ||
        timezone !== (profile.timezone ?? '') ||
        language !== (profile.language ?? '')
      setHasChanges(changed)
    }
  }, [name, timezone, language, profile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Note: theme is NOT included here - it's saved immediately via ThemeContext
    updateProfile.mutate({
      name: name || undefined,
      timezone: timezone || undefined,
      language: language || undefined,
    })
  }

  // Handle theme change - this saves immediately to backend via ThemeContext
  const handleThemeChange = (newTheme: string) => {
    setThemeGlobal(newTheme as ThemeMode)
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
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
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
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Preferences</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label htmlFor="theme" className="text-sm font-medium text-muted-foreground">
                  Theme {isThemeSyncing && <span className="text-xs">(saving...)</span>}
                </label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  disabled={isThemeSyncing}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input
                    bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="system">System Default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Accent Color {isThemeSyncing && <span className="text-xs">(saving...)</span>}
                </label>
                <AccentPicker layout="inline" size="sm" showLabels={false} />
                <p className="text-xs text-muted-foreground">Choose your preferred accent color</p>
              </div>
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
                  // Note: theme is not reset here - it's managed separately
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
