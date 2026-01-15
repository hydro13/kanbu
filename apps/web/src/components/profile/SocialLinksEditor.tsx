/*
 * SocialLinksEditor Component
 * Version: 1.0.0
 *
 * Allows users to manage their social links (WhatsApp, LinkedIn, GitHub, Reddit).
 * Each platform has a value input and visibility toggle.
 */

import { useState, useEffect } from 'react'
import { MessageCircle, Linkedin, Github, Video, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Types
// =============================================================================

interface SocialLink {
  value: string
  visible: boolean
}

interface SocialLinks {
  // Messaging
  whatsapp: SocialLink | null
  slack: SocialLink | null
  discord: SocialLink | null
  // Professional/Social
  linkedin: SocialLink | null
  github: SocialLink | null
  reddit: SocialLink | null
  // Video calls
  zoom: SocialLink | null
  googlemeet: SocialLink | null
  teams: SocialLink | null
  // Code collaboration
  gitlab: SocialLink | null
}

// =============================================================================
// Platform Config
// =============================================================================

const PLATFORM_SECTIONS = [
  {
    title: 'Messaging',
    platforms: [
      {
        key: 'whatsapp' as const,
        label: 'WhatsApp',
        icon: MessageCircle,
        color: 'text-green-500',
        placeholder: '+31 6 12345678',
        hint: 'Phone number with country code',
      },
      {
        key: 'slack' as const,
        label: 'Slack',
        icon: SlackIcon,
        color: 'text-purple-600',
        placeholder: 'UXXXXXXXX',
        hint: 'Your Slack member ID (find in profile settings)',
      },
      {
        key: 'discord' as const,
        label: 'Discord',
        icon: DiscordIcon,
        color: 'text-indigo-500',
        placeholder: 'username',
        hint: 'Your Discord username',
      },
    ],
  },
  {
    title: 'Professional',
    platforms: [
      {
        key: 'linkedin' as const,
        label: 'LinkedIn',
        icon: Linkedin,
        color: 'text-blue-600',
        placeholder: 'robin-waslander',
        hint: 'Your LinkedIn profile handle',
      },
      {
        key: 'github' as const,
        label: 'GitHub',
        icon: Github,
        color: 'text-gray-800 dark:text-gray-200',
        placeholder: 'robinwaslander',
        hint: 'Your GitHub username',
      },
      {
        key: 'gitlab' as const,
        label: 'GitLab',
        icon: GitlabIcon,
        color: 'text-orange-600',
        placeholder: 'robinwaslander',
        hint: 'Your GitLab username',
      },
      {
        key: 'reddit' as const,
        label: 'Reddit',
        icon: RedditIcon,
        color: 'text-orange-500',
        placeholder: 'robinw',
        hint: 'Your Reddit username (without u/)',
      },
    ],
  },
  {
    title: 'Video Calls',
    platforms: [
      {
        key: 'zoom' as const,
        label: 'Zoom',
        icon: Video,
        color: 'text-blue-500',
        placeholder: 'your-personal-meeting-id',
        hint: 'Personal Meeting ID or link',
      },
      {
        key: 'googlemeet' as const,
        label: 'Google Meet',
        icon: GoogleMeetIcon,
        color: 'text-green-600',
        placeholder: 'xxx-xxxx-xxx',
        hint: 'Personal meeting code',
      },
      {
        key: 'teams' as const,
        label: 'Microsoft Teams',
        icon: Users,
        color: 'text-purple-700',
        placeholder: 'meeting-link',
        hint: 'Personal meeting link',
      },
    ],
  },
]

// =============================================================================
// Custom Icons
// =============================================================================

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  )
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function GitlabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 0 0-.336-.405.87.87 0 0 0-.52-.144.87.87 0 0 0-.52.144.85.85 0 0 0-.334.405l-2.217 6.748H7.629L5.41.98a.851.851 0 0 0-.336-.405.87.87 0 0 0-.52-.144.87.87 0 0 0-.52.144.85.85 0 0 0-.335.405L.432 9.507l-.033.086a6.066 6.066 0 0 0 2.012 7.01l.012.009.03.022 4.98 3.727 2.462 1.863 1.5 1.132a1.008 1.008 0 0 0 1.22 0l1.5-1.132 2.461-1.863 5.01-3.749.013-.01a6.068 6.068 0 0 0 2.001-7.01z" />
    </svg>
  )
}

function GoogleMeetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C6.28 0 1.636 4.641 1.636 10.364c0 3.409 1.65 6.436 4.196 8.318V24l5.318-2.909c.273.027.554.046.85.046 5.72 0 10.364-4.641 10.364-10.364S17.72 0 12 0zm1.091 13.636l-2.727-2.727-5.091 2.727V7.636l5.091 2.728 2.727-2.728v6z" />
    </svg>
  )
}

// =============================================================================
// Toggle Component
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
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// =============================================================================
// SocialLinksEditor Component
// =============================================================================

export function SocialLinksEditor() {
  const [links, setLinks] = useState<SocialLinks>({
    whatsapp: null,
    slack: null,
    discord: null,
    linkedin: null,
    github: null,
    reddit: null,
    zoom: null,
    googlemeet: null,
    teams: null,
    gitlab: null,
  })
  const [hasChanges, setHasChanges] = useState(false)

  const utils = trpc.useUtils()
  const { data: savedLinks, isLoading } = trpc.user.getSocialLinks.useQuery()

  const updateMutation = trpc.user.updateSocialLinks.useMutation({
    onSuccess: () => {
      utils.user.getSocialLinks.invalidate()
      setHasChanges(false)
    },
  })

  // Initialize form with saved data
  useEffect(() => {
    if (savedLinks) {
      setLinks(savedLinks)
    }
  }, [savedLinks])

  // Track changes
  useEffect(() => {
    if (savedLinks) {
      const changed = JSON.stringify(links) !== JSON.stringify(savedLinks)
      setHasChanges(changed)
    }
  }, [links, savedLinks])

  const handleValueChange = (platform: keyof SocialLinks, value: string) => {
    setLinks((prev) => ({
      ...prev,
      [platform]: value ? { value, visible: prev[platform]?.visible ?? true } : null,
    }))
  }

  const handleVisibilityChange = (platform: keyof SocialLinks, visible: boolean) => {
    setLinks((prev) => ({
      ...prev,
      [platform]: prev[platform] ? { ...prev[platform]!, visible } : null,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(links)
  }

  const handleReset = () => {
    if (savedLinks) {
      setLinks(savedLinks)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-card border border-border p-4">
        <p className="text-sm text-muted-foreground">Loading social links...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Social Links
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add contact links visible to your teammates
          </p>
        </div>

        <div className="p-4 space-y-6">
          {PLATFORM_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {section.title}
              </h4>
              <div className="space-y-4">
                {section.platforms.map((platform) => {
                  const Icon = platform.icon
                  const currentValue = links[platform.key]?.value ?? ''
                  const isVisible = links[platform.key]?.visible ?? true

                  return (
                    <div key={platform.key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${platform.color}`} />
                        <label
                          htmlFor={`social-${platform.key}`}
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {platform.label}
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={`social-${platform.key}`}
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleValueChange(platform.key, e.target.value)}
                          placeholder={platform.placeholder}
                          className="flex-1 h-9 px-3 text-sm rounded-md border border-input
                            bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span>Visible</span>
                          <Toggle
                            checked={isVisible}
                            onChange={(checked) => handleVisibilityChange(platform.key, checked)}
                            disabled={!currentValue}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">{platform.hint}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            {updateMutation.isSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Social links saved!
              </span>
            )}
            {updateMutation.isError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Failed to save.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Reset
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default SocialLinksEditor
