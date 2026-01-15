/*
 * UserPopover Component
 * Version: 1.1.0
 *
 * Hover popover showing user details: full name, username, email, avatar,
 * and social links (WhatsApp, LinkedIn, GitHub, Reddit).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 *
 * Modified: 2026-01-03
 * Change: Added social links with WhatsApp task context support
 * ═══════════════════════════════════════════════════════════════════
 */

import { MessageCircle, Linkedin, Github, Video, Users } from 'lucide-react'
import { HoverPopover } from '@/components/ui/HoverPopover'
import { trpc, getMediaUrl } from '@/lib/trpc'
import { useTaskContext, generateWhatsAppUrl } from '@/contexts/TaskContext'

// =============================================================================
// Types
// =============================================================================

interface UserInfo {
  id: number
  username: string
  name: string | null
  email?: string | null
  avatarUrl: string | null
  role?: string
}

interface UserPopoverProps {
  user: UserInfo
  children: React.ReactNode
  /** Optional callback when user is clicked */
  onUserClick?: (userId: number) => void
}

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
// Social Links Component
// =============================================================================

function SocialLinks({ userId }: { userId: number }) {
  const taskContext = useTaskContext()
  const { data: socialLinks } = trpc.user.getUserSocialLinks.useQuery({ userId })

  if (!socialLinks) return null

  const hasAnyLinks =
    socialLinks.whatsapp || socialLinks.slack || socialLinks.discord ||
    socialLinks.linkedin || socialLinks.github || socialLinks.reddit ||
    socialLinks.gitlab || socialLinks.zoom || socialLinks.googlemeet || socialLinks.teams

  if (!hasAnyLinks) return null

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      {/* Messaging */}
      {socialLinks.whatsapp && (
        <a
          href={generateWhatsAppUrl(socialLinks.whatsapp, taskContext)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4 text-green-500" />
        </a>
      )}
      {socialLinks.slack && (
        <a
          href={`slack://user?team=&id=${socialLinks.slack}`}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          title="Slack"
        >
          <SlackIcon className="h-4 w-4 text-purple-600" />
        </a>
      )}
      {socialLinks.discord && (
        <a
          href={`https://discord.com/users/${socialLinks.discord}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          title="Discord"
        >
          <DiscordIcon className="h-4 w-4 text-indigo-500" />
        </a>
      )}

      {/* Professional */}
      {socialLinks.linkedin && (
        <a
          href={`https://linkedin.com/in/${socialLinks.linkedin}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          title="LinkedIn"
        >
          <Linkedin className="h-4 w-4 text-blue-600" />
        </a>
      )}
      {socialLinks.github && (
        <a
          href={`https://github.com/${socialLinks.github}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-accent transition-colors"
          title="GitHub"
        >
          <Github className="h-4 w-4 text-gray-800 dark:text-gray-200" />
        </a>
      )}
      {socialLinks.gitlab && (
        <a
          href={`https://gitlab.com/${socialLinks.gitlab}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          title="GitLab"
        >
          <GitlabIcon className="h-4 w-4 text-orange-600" />
        </a>
      )}
      {socialLinks.reddit && (
        <a
          href={`https://reddit.com/user/${socialLinks.reddit}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          title="Reddit"
        >
          <RedditIcon className="h-4 w-4 text-orange-500" />
        </a>
      )}

      {/* Video Calls */}
      {socialLinks.zoom && (
        <a
          href={socialLinks.zoom.startsWith('http') ? socialLinks.zoom : `https://zoom.us/j/${socialLinks.zoom}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          title="Zoom"
        >
          <Video className="h-4 w-4 text-blue-500" />
        </a>
      )}
      {socialLinks.googlemeet && (
        <a
          href={socialLinks.googlemeet.startsWith('http') ? socialLinks.googlemeet : `https://meet.google.com/${socialLinks.googlemeet}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          title="Google Meet"
        >
          <GoogleMeetIcon className="h-4 w-4 text-green-600" />
        </a>
      )}
      {socialLinks.teams && (
        <a
          href={socialLinks.teams.startsWith('http') ? socialLinks.teams : `https://teams.microsoft.com/l/meetup-join/${socialLinks.teams}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          title="Microsoft Teams"
        >
          <Users className="h-4 w-4 text-purple-700" />
        </a>
      )}
    </div>
  )
}

// =============================================================================
// User Content Component
// =============================================================================

function UserContent({ user, onUserClick }: { user: UserInfo; onUserClick?: (userId: number) => void }) {
  const initials = (user.name ?? user.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleClick = () => {
    if (onUserClick) {
      onUserClick(user.id)
    }
  }

  return (
    <div
      className={`p-4 ${onUserClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
      onClick={onUserClick ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={getMediaUrl(user.avatarUrl)}
            alt={user.name ?? user.username}
            className="h-12 w-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-600"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-lg font-medium text-white ring-2 ring-gray-200 dark:ring-gray-600">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h4 className="text-sm font-semibold text-foreground truncate">
            {user.name ?? user.username}
          </h4>

          {/* Username */}
          {user.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              @{user.username}
            </p>
          )}

          {/* Email */}
          {user.email && (
            <a
              href={`mailto:${user.email}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              {user.email}
            </a>
          )}

          {/* Role badge */}
          {user.role && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${
              user.role === 'OWNER'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : user.role === 'MANAGER'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : user.role === 'MEMBER'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {user.role}
            </span>
          )}

          {/* Social Links */}
          <SocialLinks userId={user.id} />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// UserPopover Component
// =============================================================================

export function UserPopover({ user, children, onUserClick }: UserPopoverProps) {
  return (
    <HoverPopover
      content={<UserContent user={user} onUserClick={onUserClick} />}
      width={280}
      maxHeight={280}
    >
      {children}
    </HoverPopover>
  )
}

export default UserPopover
