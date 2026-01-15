/*
 * Project Details Page
 * Version: 1.0.0
 *
 * Edit project name and description.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Host: MAX
 * Date: 2026-01-10
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Component
// =============================================================================

export function ProjectDetailsPage() {
  const { projectIdentifier, workspaceSlug } = useParams<{
    projectIdentifier: string
    workspaceSlug: string
  }>()
  const utils = trpc.useUtils()

  // Form states
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Sync project data to form
  useEffect(() => {
    if (projectQuery.data) {
      setProjectName(projectQuery.data.name)
      setProjectDescription(projectQuery.data.description ?? '')
    }
  }, [projectQuery.data])

  // Get project ID from fetched data
  const projectId = projectQuery.data?.id ?? 0

  // Project update mutation
  const updateProjectMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.getByIdentifier.invalidate({ identifier: projectIdentifier! })
      utils.project.list.invalidate()
    },
  })

  // Update handler
  const handleUpdateProject = () => {
    if (!projectName.trim()) return
    updateProjectMutation.mutate({
      projectId,
      name: projectName,
      description: projectDescription || undefined,
    })
  }

  // Loading state
  if (projectQuery.isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProjectLayout>
    )
  }

  // Error state
  if (projectQuery.error) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-destructive">{projectQuery.error.message}</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            Go back
          </Link>
        </div>
      </ProjectLayout>
    )
  }

  const project = projectQuery.data

  return (
    <ProjectLayout>
      <div className="container mx-auto py-6 px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <nav className="text-sm text-muted-foreground mb-2">
            <Link to={`/workspace/${workspaceSlug}/project/${projectIdentifier}/board`} className="hover:text-primary">
              {project?.name}
            </Link>
            {' / '}
            <span>Details</span>
          </nav>
          <h1 className="text-page-title text-foreground">Project Details</h1>
          <p className="text-muted-foreground mt-1">
            Edit project name and description
          </p>
        </div>

        {/* Project Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Update the basic information for this project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Identifier</label>
              <Input
                value={project?.identifier ?? ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Used for task references (e.g., {project?.identifier}-123). Cannot be changed.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleUpdateProject}
              disabled={updateProjectMutation.isPending || !projectName.trim()}
            >
              {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ProjectLayout>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ProjectDetailsPage
