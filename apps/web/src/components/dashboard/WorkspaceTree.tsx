/*
 * WorkspaceTree Component
 * Version: 1.1.0
 *
 * A collapsible workspace node in the dashboard sidebar tree.
 * Contains sections for Kanbu projects, GitHub repos, and Project Groups.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-10
 * Change: Initial implementation - Fase 1.3 of Dashboard Roadmap
 *
 * Modified: 2026-01-10
 * Change: Added smooth expand/collapse animations - Fase 2.3
 * ═══════════════════════════════════════════════════════════════════
 */

import { ChevronRight, Building2 } from 'lucide-react'
import { useDashboardTreeStore } from '@/stores/dashboardTreeStore'
import { TreeSection } from './TreeSection'
import { ProjectNode } from './ProjectNode'
import { GitHubRepoNode } from './GitHubRepoNode'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface KanbuProject {
  id: number
  name: string
  identifier: string
  taskCount: number
  hasGitHub: boolean
}

interface GitHubRepo {
  id: number
  name: string
  fullName: string
  owner: string
  syncStatus: 'synced' | 'pending' | 'error' | 'never'
  lastSyncAt: string | null
  projectId: number | null
  projectIdentifier: string | null
}

interface ProjectGroup {
  id: number
  name: string
  color: string
  projectCount: number
}

export interface WorkspaceTreeProps {
  workspace: {
    id: number
    name: string
    slug: string
    logoUrl: string | null
    kanbuProjects: KanbuProject[]
    githubRepos: GitHubRepo[]
    projectGroups: ProjectGroup[]
  }
  collapsed?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceTree({ workspace, collapsed = false }: WorkspaceTreeProps) {
  const { toggleWorkspace, isWorkspaceExpanded } = useDashboardTreeStore()
  const isExpanded = isWorkspaceExpanded(workspace.id)

  // Total count for collapsed mode
  const totalItems =
    workspace.kanbuProjects.length +
    workspace.githubRepos.length +
    workspace.projectGroups.length

  return (
    <div className="select-none">
      {/* Workspace Header */}
      <button
        onClick={() => toggleWorkspace(workspace.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
          'hover:bg-accent text-sm font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        )}
        aria-expanded={isExpanded}
        aria-label={`${workspace.name} workspace, ${totalItems} items`}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150',
            isExpanded && 'rotate-90'
          )}
        />
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        {!collapsed && (
          <span className="truncate">{workspace.name}</span>
        )}
        {collapsed && totalItems > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{totalItems}</span>
        )}
      </button>

      {/* Children - animated expand/collapse using CSS Grid */}
      {!collapsed && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-150 ease-out',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden min-h-0 ml-4 border-l border-border pl-2">
          {/* Kanbu Projects Section */}
          {workspace.kanbuProjects.length > 0 && (
            <TreeSection
              workspaceId={workspace.id}
              section="kanbu"
              label="KANBU"
              count={workspace.kanbuProjects.length}
            >
              {workspace.kanbuProjects.map((project) => (
                <ProjectNode
                  key={project.id}
                  project={project}
                  workspaceSlug={workspace.slug}
                />
              ))}
            </TreeSection>
          )}

          {/* GitHub Section */}
          {workspace.githubRepos.length > 0 && (
            <TreeSection
              workspaceId={workspace.id}
              section="github"
              label="GITHUB"
              count={workspace.githubRepos.length}
            >
              {workspace.githubRepos.map((repo) => (
                <GitHubRepoNode
                  key={repo.id}
                  repo={repo}
                  workspaceSlug={workspace.slug}
                />
              ))}
            </TreeSection>
          )}

          {/* Groups Section - Placeholder for Fase 4 */}
          {workspace.projectGroups.length > 0 && (
            <TreeSection
              workspaceId={workspace.id}
              section="groups"
              label="GROUPS"
              count={workspace.projectGroups.length}
            >
              {/* Group nodes will be added in Fase 4 */}
              <div className="px-2 py-1 text-xs text-muted-foreground italic">
                {workspace.projectGroups.length} groups
              </div>
            </TreeSection>
          )}

          {/* Empty state */}
          {workspace.kanbuProjects.length === 0 &&
            workspace.githubRepos.length === 0 &&
            workspace.projectGroups.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground italic">
                No projects yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkspaceTree
