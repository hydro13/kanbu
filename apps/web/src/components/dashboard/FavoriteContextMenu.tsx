/*
 * FavoriteContextMenu Component
 * Version: 1.0.0
 *
 * Right-click context menu for favorite items in the sidebar.
 * Quick actions: open, remove from favorites, copy link.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-11
 * ═══════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import {
  ContextMenu,
  useContextMenu,
  type MenuItemProps,
  OpenIcon,
  StarIcon,
  CopyIcon,
  ExternalLinkIcon,
} from '@/components/common/ContextMenu';

// =============================================================================
// Types
// =============================================================================

export interface FavoriteContextMenuProps {
  favoriteId: number;
  projectId: number;
  projectName: string;
  projectPath: string;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function FavoriteContextMenu({
  favoriteId: _favoriteId,
  projectId,
  projectName: _projectName,
  projectPath,
  isOpen,
  position,
  onClose,
}: FavoriteContextMenuProps) {
  // _favoriteId and _projectName reserved for future use (e.g., confirm dialogs)
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Remove from favorites mutation
  const removeFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: () => {
      utils.favorite.list.invalidate();
      utils.favorite.isFavorite.invalidate({ projectId });
      onClose();
    },
  });

  // Build menu items
  const menuItems: MenuItemProps[] = [
    {
      id: 'open',
      label: 'Open Project',
      icon: <OpenIcon />,
      onClick: () => {
        navigate(projectPath);
      },
    },
    {
      id: 'open-new-tab',
      label: 'Open in New Tab',
      icon: <ExternalLinkIcon />,
      onClick: () => {
        window.open(projectPath, '_blank');
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
        const url = `${window.location.origin}${projectPath}`;
        navigator.clipboard.writeText(url);
      },
    },
    {
      id: 'divider-2',
      label: '',
      divider: true,
    },
    {
      id: 'remove',
      label: 'Remove from Favorites',
      icon: <StarIcon />,
      danger: true,
      onClick: () => {
        removeFavorite.mutate({ projectId });
      },
    },
  ];

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      items={menuItems}
      onClose={onClose}
      minWidth={160}
    />
  );
}

// Re-export useContextMenu for convenience
export { useContextMenu };

export default FavoriteContextMenu;
