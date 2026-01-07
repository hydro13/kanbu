/*
 * ProjectRedirect Component
 * Version: 1.0.0
 *
 * Redirects legacy /project/:identifier/* URLs to new /workspace/:slug/project/:identifier/* URLs.
 * Fetches project info to determine the workspace slug.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-07
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { trpc } from '@/lib/trpc'

export function ProjectRedirect() {
  const { projectIdentifier, '*': rest } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Fetch project info to get workspace slug
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Extract workspace slug to avoid deep type inference in dependency array
  const workspaceSlug = projectQuery.data?.workspace?.slug

  useEffect(() => {
    if (workspaceSlug) {
      // Build the new URL with workspace slug
      const pathSuffix = rest || 'board'
      const newPath = `/workspace/${workspaceSlug}/project/${projectIdentifier}/${pathSuffix}`
      // Preserve query string and hash
      const newUrl = `${newPath}${location.search}${location.hash}`
      navigate(newUrl, { replace: true })
    }
  }, [workspaceSlug, projectIdentifier, rest, location.search, location.hash, navigate])

  const isLoading = projectQuery.isLoading
  const error = projectQuery.error

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-destructive">Project not found</p>
      </div>
    )
  }

  return null
}

export default ProjectRedirect
