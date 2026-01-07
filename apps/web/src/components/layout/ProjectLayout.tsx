/*
 * ProjectLayout Component
 * Version: 2.0.0
 *
 * Layout wrapper for project-specific pages.
 * Uses BaseLayout for shared header functionality.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { BaseLayout } from './BaseLayout'
import { ProjectSidebar } from './ProjectSidebar'
import { PresenceIndicator } from '@/components/board/PresenceIndicator'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface ProjectLayoutProps {
  children: ReactNode
}

// =============================================================================
// Component
// =============================================================================

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const user = useAppSelector(selectUser)

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    {
      enabled: !!projectIdentifier,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Get project ID from the fetched project data
  const projectIdNum = projectQuery.data?.id ?? null
  const projectName = projectQuery.data?.name

  // Sidebar for this project
  const sidebar = projectIdNum && projectIdentifier ? (
    <ProjectSidebar
      projectIdentifier={projectIdentifier}
      projectId={projectIdNum}
      projectName={projectName}
      collapsed={false}
    />
  ) : undefined

  // Header extras: presence indicator
  const headerExtras = projectIdNum && user ? (
    <PresenceIndicator
      projectId={projectIdNum}
      currentUserId={user.id}
    />
  ) : undefined

  return (
    <BaseLayout
      sidebar={sidebar}
      headerExtras={headerExtras}
      contentPadding={false}
    >
      {children}
    </BaseLayout>
  )
}

export default ProjectLayout
