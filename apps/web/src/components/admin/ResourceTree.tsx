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

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

// Extended resource types (Fase 4C + Fase 8B)
// root → system/dashboard/workspaces → workspace:{id} → project:{id} → feature:{id}
export type ResourceType = 'root' | 'system' | 'dashboard' | 'workspace' | 'project' | 'feature' | 'admin' | 'profile' | 'group'

export interface SelectedResource {
  type: ResourceType
  id: number | null
  name: string
  path?: string // Breadcrumb path like "Kanbu > Workspaces > Workspace > Projects > Project"
}

// Tree state for controlled mode - allows parent to persist state
export interface TreeState {
  expandedSections: Set<string>
  expandedWorkspaces: Set<number>
  expandedWorkspaceProjects: Set<number>
  expandedProjectFeatures: Set<number> // Fase 8B: track expanded projects for features
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
  memberCount?: number
}

// Fase 8C: Feature interface with scope for grouping
export type FeatureScope = 'dashboard' | 'profile' | 'admin' | 'project'

interface Feature {
  id: number
  scope: string  // API returns string, we cast to FeatureScope at runtime
  slug: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
}

interface ResourceTreeProps {
  workspaces: Workspace[]
  projects: Project[]
  groups?: SecurityGroup[]
  features?: Feature[] // Fase 8B: system-wide features
  isAdmin: boolean
  selectedResource: SelectedResource | null
  onSelectResource: (resource: SelectedResource) => void
  // Optional controlled tree state for persistence
  treeState?: TreeState
  onTreeStateChange?: (state: TreeState) => void
  // Callback to create a new Security Group
  onCreateGroup?: () => void
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

// Fase 8B: Feature icon (menu/grid icon)
function FeatureIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
      <path d="M14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
      <path d="M4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
      <path d="M14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
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
  features = [],
  isAdmin,
  selectedResource,
  onSelectResource,
  treeState: controlledTreeState,
  onTreeStateChange,
  onCreateGroup,
}: ResourceTreeProps) {
  // Internal state for uncontrolled mode
  const [internalState, setInternalState] = useState<TreeState>({
    expandedSections: new Set(['root', 'workspaces']),
    expandedWorkspaces: new Set(),
    expandedWorkspaceProjects: new Set(),
    expandedProjectFeatures: new Set(),
  })

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledTreeState !== undefined
  const currentState = isControlled ? controlledTreeState : internalState

  // Update state - either call parent callback or set internal state
  const updateState = useCallback((updater: (prev: TreeState) => TreeState) => {
    if (isControlled && onTreeStateChange) {
      onTreeStateChange(updater(currentState))
    } else {
      setInternalState(updater)
    }
  }, [isControlled, onTreeStateChange, currentState])

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

  // Fase 8C: Group features by scope
  const featuresByScope = useMemo(() => {
    const map: Record<string, Feature[]> = {
      dashboard: [],
      profile: [],
      admin: [],
      project: [],
    }
    for (const feature of features) {
      const scope = feature.scope as FeatureScope
      if (scope && map[scope]) {
        map[scope].push(feature)
      }
    }
    return map as Record<FeatureScope, Feature[]>
  }, [features])

  const toggleSection = useCallback((section: string) => {
    updateState((prev) => {
      const next = new Set(prev.expandedSections)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return { ...prev, expandedSections: next }
    })
  }, [updateState])

  const toggleWorkspace = useCallback((workspaceId: number) => {
    updateState((prev) => {
      const next = new Set(prev.expandedWorkspaces)
      if (next.has(workspaceId)) {
        next.delete(workspaceId)
      } else {
        next.add(workspaceId)
      }
      return { ...prev, expandedWorkspaces: next }
    })
  }, [updateState])

  const toggleWorkspaceProjects = useCallback((workspaceId: number) => {
    updateState((prev) => {
      const next = new Set(prev.expandedWorkspaceProjects)
      if (next.has(workspaceId)) {
        next.delete(workspaceId)
      } else {
        next.add(workspaceId)
      }
      return { ...prev, expandedWorkspaceProjects: next }
    })
  }, [updateState])

  // Fase 8B: Toggle features under a project
  const toggleProjectFeatures = useCallback((projectId: number) => {
    updateState((prev) => {
      const next = new Set(prev.expandedProjectFeatures)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return { ...prev, expandedProjectFeatures: next }
    })
  }, [updateState])

  const isSelected = (type: ResourceType, id: number | null) => {
    return selectedResource?.type === type && selectedResource?.id === id
  }

  const isSectionExpanded = (section: string) => currentState.expandedSections.has(section)
  const isWorkspaceExpanded = (id: number) => currentState.expandedWorkspaces.has(id)
  const isProjectsExpanded = (workspaceId: number) => currentState.expandedWorkspaceProjects.has(workspaceId)
  const isFeaturesExpanded = (projectId: number) => currentState.expandedProjectFeatures.has(projectId)

  return (
    <div className="space-y-0.5">
      {/* ========== KANBU ROOT ========== */}
      {/* Root is now selectable for ACL - permissions here inherit to ALL children (Fase 4C) */}
      <TreeItem
        label="Kanbu"
        icon={<ServerIcon className="w-4 h-4 text-blue-600" />}
        depth={0}
        isSelected={isSelected('root', null)}
        isExpandable={true}
        isExpanded={isSectionExpanded('root')}
        onClick={() => {
          toggleSection('root')
          onSelectResource({
            type: 'root',
            id: null,
            name: 'Kanbu (Root)',
            path: 'Kanbu',
          })
        }}
      />

      {isSectionExpanded('root') && (
        <>
          {/* ========== SYSTEM SECTION ========== */}
          {/* System is selectable for ACL - permissions inherit to admin (Fase 4C) */}
          {isAdmin && (
            <>
              <TreeItem
                label="System"
                icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('system') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('system')} />}
                depth={1}
                isSelected={isSelected('system', null)}
                isExpandable={true}
                isExpanded={isSectionExpanded('system')}
                onClick={() => {
                  toggleSection('system')
                  onSelectResource({
                    type: 'system',
                    id: null,
                    name: 'System',
                    path: 'Kanbu > System',
                  })
                }}
              />

              {isSectionExpanded('system') && (
                <>
                  {/* Administration section - now expandable for admin features */}
                  <TreeItem
                    label="Administration"
                    icon={featuresByScope.admin.length > 0
                      ? <FolderIcon className={cn('w-4 h-4', isSectionExpanded('admin') ? 'text-purple-400' : 'text-purple-500')} open={isSectionExpanded('admin')} />
                      : <ShieldIcon className="w-4 h-4 text-purple-500" />
                    }
                    depth={2}
                    isSelected={isSelected('admin', null)}
                    isExpandable={featuresByScope.admin.length > 0}
                    isExpanded={isSectionExpanded('admin')}
                    onClick={() => {
                      if (featuresByScope.admin.length > 0) {
                        toggleSection('admin')
                      }
                      onSelectResource({
                        type: 'admin',
                        id: null,
                        name: 'Administration',
                        path: 'Kanbu > System > Administration',
                      })
                    }}
                  />

                  {/* Fase 8C: Admin features under Administration */}
                  {isSectionExpanded('admin') && featuresByScope.admin.length > 0 && (
                    <>
                      <TreeItem
                        label="Features"
                        icon={<FolderIcon className="w-4 h-4 text-yellow-500" open={true} />}
                        depth={3}
                        isSelected={false}
                        isExpandable={false}
                        onClick={() => {}}
                      />
                      {featuresByScope.admin.map((feature) => (
                        <TreeItem
                          key={feature.id}
                          label={feature.name}
                          icon={<FeatureIcon className="w-4 h-4 text-orange-500" />}
                          depth={4}
                          isSelected={isSelected('feature', feature.id)}
                          onClick={() =>
                            onSelectResource({
                              type: 'feature',
                              id: feature.id,
                              name: feature.name,
                              path: `Kanbu > System > Administration > Features > ${feature.name}`,
                            })
                          }
                          suffix={feature.slug}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ========== DASHBOARD SECTION ========== */}
          {/* Dashboard is a separate container under root (Fase 4C + 8C: now with features) */}
          <TreeItem
            label="Dashboard"
            icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('dashboard') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('dashboard')} />}
            depth={1}
            isSelected={isSelected('dashboard', null)}
            isExpandable={featuresByScope.dashboard.length > 0}
            isExpanded={isSectionExpanded('dashboard')}
            onClick={() => {
              if (featuresByScope.dashboard.length > 0) {
                toggleSection('dashboard')
              }
              onSelectResource({
                type: 'dashboard',
                id: null,
                name: 'Dashboard',
                path: 'Kanbu > Dashboard',
              })
            }}
          />

          {/* Fase 8C: Dashboard features */}
          {isSectionExpanded('dashboard') && featuresByScope.dashboard.length > 0 && (
            <>
              <TreeItem
                label="Features"
                icon={<FolderIcon className="w-4 h-4 text-yellow-500" open={true} />}
                depth={2}
                isSelected={false}
                isExpandable={false}
                onClick={() => {}}
              />
              {featuresByScope.dashboard.map((feature) => (
                <TreeItem
                  key={feature.id}
                  label={feature.name}
                  icon={<FeatureIcon className="w-4 h-4 text-orange-500" />}
                  depth={3}
                  isSelected={isSelected('feature', feature.id)}
                  onClick={() =>
                    onSelectResource({
                      type: 'feature',
                      id: feature.id,
                      name: feature.name,
                      path: `Kanbu > Dashboard > Features > ${feature.name}`,
                    })
                  }
                  suffix={feature.slug}
                />
              ))}
            </>
          )}

          {/* ========== PROFILE SECTION (Fase 8C) ========== */}
          {/* Profile features - user profile settings */}
          <TreeItem
            label="Profile"
            icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('profile') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('profile')} />}
            depth={1}
            isSelected={isSelected('profile', null)}
            isExpandable={featuresByScope.profile.length > 0}
            isExpanded={isSectionExpanded('profile')}
            onClick={() => {
              if (featuresByScope.profile.length > 0) {
                toggleSection('profile')
              }
              onSelectResource({
                type: 'profile',
                id: null,
                name: 'Profile',
                path: 'Kanbu > Profile',
              })
            }}
          />

          {/* Fase 8C: Profile features */}
          {isSectionExpanded('profile') && featuresByScope.profile.length > 0 && (
            <>
              <TreeItem
                label="Features"
                icon={<FolderIcon className="w-4 h-4 text-yellow-500" open={true} />}
                depth={2}
                isSelected={false}
                isExpandable={false}
                onClick={() => {}}
              />
              {featuresByScope.profile.map((feature) => (
                <TreeItem
                  key={feature.id}
                  label={feature.name}
                  icon={<FeatureIcon className="w-4 h-4 text-orange-500" />}
                  depth={3}
                  isSelected={isSelected('feature', feature.id)}
                  onClick={() =>
                    onSelectResource({
                      type: 'feature',
                      id: feature.id,
                      name: feature.name,
                      path: `Kanbu > Profile > Features > ${feature.name}`,
                    })
                  }
                  suffix={feature.slug}
                />
              ))}
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

                    {projectsExpanded && workspaceProjects.map((project) => {
                      // Fase 8C: Only show project-scoped features under projects
                      const projectFeatures = featuresByScope.project
                      const hasFeatures = projectFeatures.length > 0
                      const featuresExpanded = isFeaturesExpanded(project.id)

                      return (
                        <div key={project.id}>
                          {/* Project item - now expandable when features exist */}
                          <TreeItem
                            label={project.name}
                            icon={hasFeatures
                              ? <FolderIcon className={cn('w-4 h-4', featuresExpanded ? 'text-green-400' : 'text-green-500')} open={featuresExpanded} />
                              : <FileIcon className="w-4 h-4 text-green-500" />
                            }
                            depth={4}
                            isSelected={isSelected('project', project.id)}
                            isExpandable={hasFeatures}
                            isExpanded={featuresExpanded}
                            onClick={() => {
                              if (hasFeatures) {
                                toggleProjectFeatures(project.id)
                              }
                              onSelectResource({
                                type: 'project',
                                id: project.id,
                                name: project.name,
                                path: `Kanbu > Workspaces > ${workspace.name} > Projects > ${project.name}`,
                              })
                            }}
                            suffix={project.identifier}
                          />

                          {/* Fase 8C: Project-scoped features under project */}
                          {featuresExpanded && hasFeatures && (
                            <>
                              <TreeItem
                                label="Features"
                                icon={<FolderIcon className={cn('w-4 h-4', featuresExpanded ? 'text-yellow-500' : 'text-yellow-600')} open={true} />}
                                depth={5}
                                isSelected={false}
                                isExpandable={false}
                                onClick={() => {/* Features folder is always expanded when project is */}}
                              />

                              {projectFeatures.map((feature) => (
                                <TreeItem
                                  key={feature.id}
                                  label={feature.name}
                                  icon={<FeatureIcon className="w-4 h-4 text-orange-500" />}
                                  depth={6}
                                  isSelected={isSelected('feature', feature.id)}
                                  onClick={() =>
                                    onSelectResource({
                                      type: 'feature',
                                      id: feature.id,
                                      name: feature.name,
                                      path: `Kanbu > Workspaces > ${workspace.name} > Projects > ${project.name} > Features > ${feature.name}`,
                                    })
                                  }
                                  suffix={feature.slug}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      )
                    })}
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
          <>
            <TreeItem
              label="Security Groups"
              icon={<FolderIcon className={cn('w-4 h-4', isSectionExpanded('groups') ? 'text-yellow-500' : 'text-yellow-600')} open={isSectionExpanded('groups')} />}
              depth={1}
              isSelected={isSelected('group', null)}
              isExpandable={groups.length > 0}
              isExpanded={isSectionExpanded('groups')}
              onClick={() => {
                if (groups.length > 0) {
                  toggleSection('groups')
                }
                onSelectResource({
                  type: 'group',
                  id: null,
                  name: 'Security Groups',
                  path: 'Kanbu > Security Groups',
                })
              }}
              suffix={
                onCreateGroup && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateGroup()
                    }}
                    className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Create Security Group"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                )
              }
            />

            {/* Flat list of all groups - no sub-folders */}
            {isSectionExpanded('groups') && groups.map((group) => {
                const isSystemGroup = !group.workspaceId
                return (
                  <TreeItem
                    key={group.id}
                    label={group.displayName}
                    icon={<UserGroupIcon className={cn('w-4 h-4', isSystemGroup ? 'text-indigo-500' : 'text-teal-500')} />}
                    depth={2}
                    isSelected={isSelected('group', group.id)}
                    onClick={() =>
                      onSelectResource({
                        type: 'group',
                        id: group.id,
                        name: group.displayName,
                        path: `Kanbu > Security Groups > ${group.displayName}`,
                      })
                    }
                    suffix={
                      <span className="inline-flex items-center gap-1.5">
                        {/* System badge for system groups */}
                        {isSystemGroup && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-medium">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L3 7V12C3 16.97 6.84 21.5 12 23C17.16 21.5 21 16.97 21 12V7L12 2Z" />
                            </svg>
                            SYSTEM
                          </span>
                        )}
                        {/* Member count badge */}
                        {group.memberCount !== undefined && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {group.memberCount}
                          </span>
                        )}
                      </span>
                    }
                  />
                )
              })}

            {/* Empty state for Security Groups */}
            {isSectionExpanded('groups') && groups.length === 0 && (
              <div className="text-sm text-gray-400 italic px-2 py-2" style={{ paddingLeft: '48px' }}>
                No security groups yet
              </div>
            )}
          </>
        </>
      )}
    </div>
  )
}

export default ResourceTree
