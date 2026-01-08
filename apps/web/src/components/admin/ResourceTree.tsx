/*
 * ResourceTree Component
 * Version: 1.0.0
 *
 * VSCode-style tree view for ACL resource selection.
 * Shows hierarchical structure: Workspaces > Projects
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type ResourceType = 'workspace' | 'project' | 'admin' | 'profile'

export interface SelectedResource {
  type: ResourceType
  id: number | null
  name: string
  path?: string // Breadcrumb path like "Workspace > Project"
}

interface Workspace {
  id: number
  name: string
  slug: string
  resourceType: 'workspace'
}

interface Project {
  id: number
  name: string
  identifier: string | null
  workspaceId: number
  workspaceName: string
  resourceType: 'project'
}

interface ResourceTreeProps {
  workspaces: Workspace[]
  projects: Project[]
  isAdmin: boolean
  selectedResource: SelectedResource | null
  onSelectResource: (resource: SelectedResource) => void
}

// =============================================================================
// Icons
// =============================================================================

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function FolderIcon({ className, open }: { className?: string; open?: boolean }) {
  if (open) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 6C2 4.89543 2.89543 4 4 4H9L11 6H20C21.1046 6 22 6.89543 22 8V10H2V6Z" />
        <path d="M2 10H22V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V10Z" opacity={0.7} />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6H11L9 4H4Z" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2C14.5 4.5 15.5 8 15.5 12C15.5 16 14.5 19.5 12 22C9.5 19.5 8.5 16 8.5 12C8.5 8 9.5 4.5 12 2Z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L3 7V12C3 16.97 6.84 21.5 12 23C17.16 21.5 21 16.97 21 12V7L12 2Z" />
    </svg>
  )
}

// =============================================================================
// Tree Item Components
// =============================================================================

interface TreeItemProps {
  label: string
  icon: React.ReactNode
  depth: number
  isSelected: boolean
  isExpandable?: boolean
  isExpanded?: boolean
  onClick: () => void
  suffix?: React.ReactNode
  className?: string
}

function TreeItem({
  label,
  icon,
  depth,
  isSelected,
  isExpandable,
  isExpanded,
  onClick,
  suffix,
  className,
}: TreeItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors group',
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300',
        className
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {/* Expand/Collapse indicator (visual only, click handled by parent) */}
      {isExpandable ? (
        <span className="w-4 h-4 flex items-center justify-center -ml-0.5">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </span>
      ) : (
        <span className="w-4" /> // Spacer for alignment
      )}

      {/* Icon */}
      <span className="flex-shrink-0">{icon}</span>

      {/* Label */}
      <span className="truncate flex-1 text-sm">{label}</span>

      {/* Suffix (e.g., identifier) */}
      {suffix && (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          {suffix}
        </span>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ResourceTree({
  workspaces,
  projects,
  isAdmin,
  selectedResource,
  onSelectResource,
}: ResourceTreeProps) {
  // Track expanded workspaces
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(new Set())

  // Group projects by workspace
  const projectsByWorkspace = useMemo(() => {
    const map = new Map<number, Project[]>()
    for (const project of projects) {
      const existing = map.get(project.workspaceId) ?? []
      existing.push(project)
      map.set(project.workspaceId, existing)
    }
    return map
  }, [projects])

  const toggleWorkspace = (workspaceId: number) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev)
      if (next.has(workspaceId)) {
        next.delete(workspaceId)
      } else {
        next.add(workspaceId)
      }
      return next
    })
  }

  const isSelected = (type: ResourceType, id: number | null) => {
    return selectedResource?.type === type && selectedResource?.id === id
  }

  return (
    <div className="space-y-1">
      {/* Root: All Resources */}
      <div className="mb-2">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mb-1">
          Resources
        </div>

        {/* Administration (Super Admin only) */}
        {isAdmin && (
          <TreeItem
            label="Administration"
            icon={<ShieldIcon className="w-4 h-4 text-purple-500" />}
            depth={0}
            isSelected={isSelected('admin', null)}
            onClick={() => onSelectResource({ type: 'admin', id: null, name: 'Administration' })}
          />
        )}

        {/* All Workspaces (Root) */}
        <TreeItem
          label="All Workspaces"
          icon={<GlobeIcon className="w-4 h-4 text-blue-500" />}
          depth={0}
          isSelected={isSelected('workspace', null)}
          onClick={() => onSelectResource({ type: 'workspace', id: null, name: 'All Workspaces (Root)' })}
        />
      </div>

      {/* Workspaces with nested Projects */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mb-1">
          Workspaces
        </div>

        {workspaces.map((workspace) => {
          const workspaceProjects = projectsByWorkspace.get(workspace.id) ?? []
          const hasProjects = workspaceProjects.length > 0
          const isExpanded = expandedWorkspaces.has(workspace.id)

          return (
            <div key={workspace.id}>
              {/* Workspace folder */}
              <TreeItem
                label={workspace.name}
                icon={
                  <FolderIcon
                    className={cn(
                      'w-4 h-4',
                      isExpanded ? 'text-yellow-500' : 'text-yellow-600'
                    )}
                    open={isExpanded}
                  />
                }
                depth={0}
                isSelected={isSelected('workspace', workspace.id)}
                isExpandable={hasProjects}
                isExpanded={isExpanded}
                onClick={() => {
                  // VSCode-style: clicking on folder both expands and selects
                  if (hasProjects) {
                    toggleWorkspace(workspace.id)
                  }
                  onSelectResource({
                    type: 'workspace',
                    id: workspace.id,
                    name: workspace.name,
                  })
                }}
              />

              {/* Projects under this workspace */}
              {isExpanded && workspaceProjects.map((project) => (
                <TreeItem
                  key={project.id}
                  label={project.name}
                  icon={<FileIcon className="w-4 h-4 text-green-500" />}
                  depth={1}
                  isSelected={isSelected('project', project.id)}
                  onClick={() =>
                    onSelectResource({
                      type: 'project',
                      id: project.id,
                      name: project.name,
                      path: `${workspace.name} > ${project.name}`,
                    })
                  }
                  suffix={project.identifier}
                />
              ))}
            </div>
          )
        })}

        {/* Empty state */}
        {workspaces.length === 0 && (
          <div className="text-sm text-gray-400 italic px-2 py-2">
            No workspaces found
          </div>
        )}
      </div>
    </div>
  )
}

export default ResourceTree
