/*
 * ProjectContextMenu Component
 * Version: 1.0.0
 *
 * Right-click context menu for project cards with quick actions:
 * open, favorite, settings, archive, delete.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-11
 * ═══════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import {
  ContextMenu,
  useContextMenu,
  type MenuItemProps,
  OpenIcon,
  StarIcon,
  SettingsIcon,
  CopyIcon,
  ArchiveIcon,
  UsersIcon,
  TrashIcon,
} from '@/components/common/ContextMenu'

// =============================================================================
// Types
// =============================================================================

export interface ProjectContextMenuProps {
  projectId: number
  projectIdentifier: string
  projectName: string
  workspaceSlug: string
  isFavorite: boolean
  isArchived?: boolean
  canEdit: boolean
  canDelete: boolean
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
}

// =============================================================================
// Component
// =============================================================================

export function ProjectContextMenu({
  projectId,
  projectIdentifier,
  projectName,
  workspaceSlug,
  isFavorite,
  isArchived = false,
  canEdit,
  canDelete,
  isOpen,
  position,
  onClose,
}: ProjectContextMenuProps) {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  // Mutations
  const toggleFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: () => {
      utils.favorite.list.invalidate()
      utils.favorite.isFavorite.invalidate({ projectId })
      onClose()
    },
  })

  const archiveProject = trpc.project.archive.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      onClose()
    },
  })

  const unarchiveProject = trpc.project.unarchive.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      onClose()
    },
  })

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      onClose()
    },
  })

  // Build menu items
  const menuItems: MenuItemProps[] = [
    {
      id: 'open',
      label: 'Open Project',
      icon: <OpenIcon />,
      onClick: () => {
        navigate(`/workspace/${workspaceSlug}/project/${projectIdentifier}/board`)
      },
    },
    {
      id: 'favorite',
      label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      icon: <StarIcon />,
      onClick: () => {
        toggleFavorite.mutate({ projectId })
      },
    },
    {
      id: 'divider-1',
      label: '',
      divider: true,
    },
    {
      id: 'copy-link',
      label: 'Copy Link',
      icon: <CopyIcon />,
      onClick: () => {
        const url = `${window.location.origin}/workspace/${workspaceSlug}/project/${projectIdentifier}/board`
        navigator.clipboard.writeText(url)
        // Could add a toast notification here
      },
    },
    {
      id: 'copy-id',
      label: 'Copy Project ID',
      icon: <CopyIcon />,
      onClick: () => {
        navigator.clipboard.writeText(projectIdentifier)
      },
    },
    {
      id: 'divider-2',
      label: '',
      divider: true,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <UsersIcon />,
      onClick: () => {
        navigate(`/workspace/${workspaceSlug}/project/${projectIdentifier}/members`)
      },
      disabled: !canEdit,
    },
    {
      id: 'settings',
      label: 'Project Settings',
      icon: <SettingsIcon />,
      onClick: () => {
        navigate(`/workspace/${workspaceSlug}/project/${projectIdentifier}/details`)
      },
      disabled: !canEdit,
    },
    {
      id: 'divider-3',
      label: '',
      divider: true,
    },
    {
      id: 'archive',
      label: isArchived ? 'Unarchive Project' : 'Archive Project',
      icon: <ArchiveIcon />,
      onClick: () => {
        if (isArchived) {
          unarchiveProject.mutate({ projectId })
        } else {
          archiveProject.mutate({ projectId })
        }
      },
      disabled: !canEdit,
    },
    {
      id: 'delete',
      label: 'Delete Project',
      icon: <TrashIcon />,
      danger: true,
      disabled: !canDelete,
      onClick: () => {
        if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
          deleteProject.mutate({ projectId })
        }
      },
    },
  ]

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      items={menuItems}
      onClose={onClose}
    />
  )
}

// Re-export useContextMenu for convenience
export { useContextMenu }

export default ProjectContextMenu
