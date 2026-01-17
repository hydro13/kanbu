/*
 * ProjectSidebar Component
 * Version: 1.2.0
 *
 * Sidebar navigation for project-specific pages.
 * Shows links to all project views and features.
 * Uses ACL-based feature visibility (Fase 8B).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:30 CET
 *
 * Modified by:
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T02:07 CET
 * Change: Added SettingsIcon and Board Settings link (ISSUE-001)
 *
 * Modified by:
 * Host: MAX
 * Date: 2026-01-07
 * Change: Updated URLs to include workspace slug for SEO-friendly paths
 *
 * Modified by:
 * Host: MAX
 * Date: 2026-01-08
 * Change: Fase 8B - ACL-based feature visibility
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProjectFeatureAccess, type FeatureSlug } from '@/hooks/useProjectFeatureAccess'

// =============================================================================
// Icons
// =============================================================================

function BoardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function MilestoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  )
}

function SprintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ImportExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function WebhookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function MembersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

function WikiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  slug: FeatureSlug // Fase 8B: map to feature slug for ACL checks
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export interface ProjectSidebarProps {
  projectIdentifier: string
  projectId: number
  projectName?: string
  workspaceSlug: string
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

// =============================================================================
// Navigation Config
// =============================================================================

function getNavSections(workspaceSlug: string, projectIdentifier: string): NavSection[] {
  const basePath = `/workspace/${workspaceSlug}/project/${projectIdentifier}`
  return [
    {
      title: 'Views',
      items: [
        { label: 'Board', path: `${basePath}/board`, icon: BoardIcon, slug: 'board' },
        { label: 'List', path: `${basePath}/list`, icon: ListIcon, slug: 'list' },
        { label: 'Calendar', path: `${basePath}/calendar`, icon: CalendarIcon, slug: 'calendar' },
        { label: 'Timeline', path: `${basePath}/timeline`, icon: TimelineIcon, slug: 'timeline' },
      ],
    },
    {
      title: 'Knowledge',
      items: [
        { label: 'Wiki', path: `${basePath}/wiki`, icon: WikiIcon, slug: 'wiki' },
      ],
    },
    {
      title: 'Planning',
      items: [
        { label: 'Sprints', path: `${basePath}/sprints`, icon: SprintIcon, slug: 'sprints' },
        { label: 'Milestones', path: `${basePath}/milestones`, icon: MilestoneIcon, slug: 'milestones' },
        { label: 'Analytics', path: `${basePath}/analytics`, icon: AnalyticsIcon, slug: 'analytics' },
      ],
    },
    {
      title: 'Manage',
      items: [
        { label: 'Project Details', path: `${basePath}/details`, icon: PencilIcon, slug: 'details' },
        { label: 'Board Settings', path: `${basePath}/settings`, icon: SettingsIcon, slug: 'settings' },
        { label: 'Members', path: `${basePath}/members`, icon: MembersIcon, slug: 'members' },
        { label: 'Import/Export', path: `${basePath}/import-export`, icon: ImportExportIcon, slug: 'import-export' },
        { label: 'Webhooks', path: `${basePath}/webhooks`, icon: WebhookIcon, slug: 'webhooks' },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { label: 'GitHub', path: `${basePath}/github`, icon: GitHubIcon, slug: 'github' },
      ],
    },
  ]
}

// =============================================================================
// Component
// =============================================================================

export function ProjectSidebar({ projectIdentifier, projectId, workspaceSlug, collapsed = false }: ProjectSidebarProps) {
  const location = useLocation()
  const { canSeeFeature, isLoading } = useProjectFeatureAccess(projectId)
  const navSections = getNavSections(workspaceSlug, projectIdentifier)

  // Fase 8B: Filter items based on ACL permissions
  const filteredSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isLoading || canSeeFeature(item.slug)),
    }))
    .filter(section => section.items.length > 0)

  const isActive = (path: string) => location.pathname === path

  return (
    <aside
      className="flex flex-col h-full"
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filteredSections.map((section, idx) => (
          <div key={idx} className="mb-2">
            {/* Section Title */}
            {section.title && !collapsed && (
              <div className="px-4 py-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {section.title}
                </span>
              </div>
            )}

            {/* Section Items */}
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-accent'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default ProjectSidebar
