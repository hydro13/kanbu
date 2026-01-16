/*
 * Workspace Settings Wrapper
 * Version: 1.0.0
 *
 * Wraps the existing WorkspaceSettings page with WorkspaceLayout.
 * Uses URL slug to set the current workspace in Redux before rendering.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 * ===================================================================
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { trpc } from '@/lib/trpc'
import { useAppDispatch } from '@/store'
import { setCurrentWorkspace } from '@/store/workspaceSlice'
import { WorkspaceSettingsPage } from '../WorkspaceSettings'
import { ArrowLeft } from 'lucide-react'

// =============================================================================
// Component
// =============================================================================

export function WorkspaceSettingsWrapper() {
  const { slug } = useParams<{ slug: string }>()
  const dispatch = useAppDispatch()

  // Fetch workspace by slug
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Set current workspace in Redux when loaded
  // Using workspace?.id as dependency to avoid deep type instantiation
  useEffect(() => {
    if (workspace) {
      dispatch(setCurrentWorkspace({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        logoUrl: workspace.logoUrl,
        role: workspace.role,
        projectCount: workspace.projectCount,
        memberCount: workspace.memberCount,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, dispatch])

  // Loading state
  if (workspaceQuery.isLoading) {
    return (
      <WorkspaceLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-64 bg-muted rounded" />
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

  // Render the settings page (it uses Redux for current workspace and has its own WorkspaceLayout)
  return <WorkspaceSettingsPage />
}

export default WorkspaceSettingsWrapper
