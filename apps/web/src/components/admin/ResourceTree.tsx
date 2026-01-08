/*
 * ResourceTree Component
 * Version: 2.0.0
 *
 * VSCode-style tree view for ACL resource selection.
 * Shows full hierarchical structure:
 *   Kanbu (Root)
 *   ├── System > Administration
 *   ├── Workspaces > [Workspace] > Projects > [Project]
 *   └── Security Groups > [Group]
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

export type ResourceType = 'workspace' | 'project' | 'admin' | 'profile' | 'group'

export interface SelectedResource {
  type: ResourceType
  id: number | null
  name: string
  path?: string // Breadcrumb path like "Kanbu > Workspaces > Workspace > Projects > Project"
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

interface SecurityGroup {
  id: number
  name: string
  displayName: string
  groupType?: string
  workspaceId?: number | null
}

interface ResourceTreeProps {
  workspaces: Workspace[]
  projects: Project[]
  groups?: SecurityGroup[]
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

// GlobeIcon removed - no longer used

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L3 7V12C3 16.97 6.84 21.5 12 23C17.16 21.5 21 16.97 21 12V7L12 2Z" />
    </svg>
  )
}

// UsersIcon removed - no longer used

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      <path d="M4 14a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" opacity={0.7} />
      <circle cx="7" cy="7" r="1" fill="white" />
      <circle cx="7" cy="15" r="1" fill="white" />
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
  groups = [],
  isAdmin,
  selectedResource,
  onSelectResource,
}: ResourceTreeProps) {
  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['root', 'workspaces']))
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(new Set())
  const [expandedWorkspaceProjects, setExpandedWorkspaceProjects] = useState<Set<number>>(new Set())

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

  // Group security groups by type (system vs workspace)
  const groupsByScope = useMemo(() => {
    const systemGroups: SecurityGroup[] = []
    const workspaceGroups: SecurityGroup[] = []
    for (const group of groups) {
      if (group.workspaceId) {
        workspaceGroups.push(group)
      } else {
        systemGroups.push(group)
      }
    }
    return { systemGroups, workspaceGroups }
  }, [groups])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

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

  const toggleWorkspaceProjects = (workspaceId: number) => {
    setExpandedWorkspaceProjects((prev) => {
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

  const isSectionExpanded = (section: string) => expandedSections.has(section)
  const isWorkspaceExpanded = (id: number) => expandedWorkspaces.has(id)
  const isProjectsExpanded = (workspaceId: number) => expandedWorkspaceProjects.has(workspaceId)

  return (
    <div className="space-y-0.5">
      {/* ========== KANBU ROOT ========== */}
      <TreeItem
        label="Kanbu"
        icon={<ServerIcon className="w-4 h-4 text-blue-600" />}
        depth={0}
        isSelected={false}
        isExpandable={true}
        isExpanded={isSectionExpanded('root')}
        onClick={() => toggleSection('root')}
      />

      {isSectionExpanded('root') && (
        <>
          {/* ========== SYSTEM SECTION ========== */}
          {isAdmin && (
            <>
              <TreeItem
                label="System"
                icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('system') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('system')} />}
                depth={1}
                isSelected={false}
                isExpandable={true}
                isExpanded={isSectionExpanded('system')}
                onClick={() => toggleSection('system')}
              />

              {isSectionExpanded('system') && (
                <TreeItem
                  label="Administration"
                  icon={<ShieldIcon className="w-4 h-4 text-purple-500" />}
                  depth={2}
                  isSelected={isSelected('admin', null)}
                  onClick={() => onSelectResource({
                    type: 'admin',
                    id: null,
                    name: 'Administration',
                    path: 'Kanbu > System > Administration',
                  })}
                />
              )}
            </>
          )}

          {/* ========== WORKSPACES SECTION ========== */}
          <TreeItem
            label="Workspaces"
            icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('workspaces') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('workspaces')} />}
            depth={1}
            isSelected={isSelected('workspace', null)}
            isExpandable={workspaces.length > 0}
            isExpanded={isSectionExpanded('workspaces')}
            onClick={() => {
              toggleSection('workspaces')
              onSelectResource({
                type: 'workspace',
                id: null,
                name: 'All Workspaces',
                path: 'Kanbu > Workspaces',
              })
            }}
          />

          {isSectionExpanded('workspaces') && workspaces.map((workspace) => {
            const workspaceProjects = projectsByWorkspace.get(workspace.id) ?? []
            const hasProjects = workspaceProjects.length > 0
            const wsExpanded = isWorkspaceExpanded(workspace.id)
            const projectsExpanded = isProjectsExpanded(workspace.id)

            return (
              <div key={workspace.id}>
                {/* Workspace folder */}
                <TreeItem
                  label={workspace.name}
                  icon={<FolderIcon className={cn('w-4 h-4', wsExpanded ? 'text-yellow-500' : 'text-yellow-600')} open={wsExpanded} />}
                  depth={2}
                  isSelected={isSelected('workspace', workspace.id)}
                  isExpandable={hasProjects}
                  isExpanded={wsExpanded}
                  onClick={() => {
                    if (hasProjects) {
                      toggleWorkspace(workspace.id)
                    }
                    onSelectResource({
                      type: 'workspace',
                      id: workspace.id,
                      name: workspace.name,
                      path: `Kanbu > Workspaces > ${workspace.name}`,
                    })
                  }}
                />

                {/* Projects container under workspace */}
                {wsExpanded && hasProjects && (
                  <>
                    <TreeItem
                      label="Projects"
                      icon={<FolderIcon className={cn('w-4 h-4', projectsExpanded ? 'text-yellow-500' : 'text-yellow-600')} open={projectsExpanded} />}
                      depth={3}
                      isSelected={false}
                      isExpandable={true}
                      isExpanded={projectsExpanded}
                      onClick={() => toggleWorkspaceProjects(workspace.id)}
                    />

                    {projectsExpanded && workspaceProjects.map((project) => (
                      <TreeItem
                        key={project.id}
                        label={project.name}
                        icon={<FileIcon className="w-4 h-4 text-green-500" />}
                        depth={4}
                        isSelected={isSelected('project', project.id)}
                        onClick={() =>
                          onSelectResource({
                            type: 'project',
                            id: project.id,
                            name: project.name,
                            path: `Kanbu > Workspaces > ${workspace.name} > Projects > ${project.name}`,
                          })
                        }
                        suffix={project.identifier}
                      />
                    ))}
                  </>
                )}
              </div>
            )
          })}

          {isSectionExpanded('workspaces') && workspaces.length === 0 && (
            <div className="text-sm text-gray-400 italic px-2 py-2" style={{ paddingLeft: '48px' }}>
              No workspaces found
            </div>
          )}

          {/* ========== SECURITY GROUPS SECTION ========== */}
          {groups.length > 0 && (
            <>
              <TreeItem
                label="Security Groups"
                icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('groups') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('groups')} />}
                depth={1}
                isSelected={isSelected('group', null)}
                isExpandable={true}
                isExpanded={isSectionExpanded('groups')}
                onClick={() => {
                  toggleSection('groups')
                  onSelectResource({
                    type: 'group',
                    id: null,
                    name: 'All Security Groups',
                    path: 'Kanbu > Security Groups',
                  })
                }}
              />

              {isSectionExpanded('groups') && (
                <>
                  {/* System-level groups */}
                  {groupsByScope.systemGroups.length > 0 && (
                    <>
                      <TreeItem
                        label="System Groups"
                        icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('groups-system') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('groups-system')} />}
                        depth={2}
                        isSelected={false}
                        isExpandable={true}
                        isExpanded={isSectionExpanded('groups-system')}
                        onClick={() => toggleSection('groups-system')}
                      />

                      {isSectionExpanded('groups-system') && groupsByScope.systemGroups.map((group) => (
                        <TreeItem
                          key={group.id}
                          label={group.displayName}
                          icon={<UserGroupIcon className="w-4 h-4 text-indigo-500" />}
                          depth={3}
                          isSelected={isSelected('group', group.id)}
                          onClick={() =>
                            onSelectResource({
                              type: 'group',
                              id: group.id,
                              name: group.displayName,
                              path: `Kanbu > Security Groups > System > ${group.displayName}`,
                            })
                          }
                          suffix={group.name}
                        />
                      ))}
                    </>
                  )}

                  {/* Workspace-scoped groups */}
                  {groupsByScope.workspaceGroups.length > 0 && (
                    <>
                      <TreeItem
                        label="Workspace Groups"
                        icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('groups-workspace') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('groups-workspace')} />}
                        depth={2}
                        isSelected={false}
                        isExpandable={true}
                        isExpanded={isSectionExpanded('groups-workspace')}
                        onClick={() => toggleSection('groups-workspace')}
                      />

                      {isSectionExpanded('groups-workspace') && groupsByScope.workspaceGroups.map((group) => (
                        <TreeItem
                          key={group.id}
                          label={group.displayName}
                          icon={<UserGroupIcon className="w-4 h-4 text-teal-500" />}
                          depth={3}
                          isSelected={isSelected('group', group.id)}
                          onClick={() =>
                            onSelectResource({
                              type: 'group',
                              id: group.id,
                              name: group.displayName,
                              path: `Kanbu > Security Groups > Workspace > ${group.displayName}`,
                            })
                          }
                          suffix={group.name}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default ResourceTree
