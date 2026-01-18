/*
 * WorkspaceLayout Component
 * Version: 1.0.0
 *
 * Layout wrapper for workspace-level pages with WorkspaceSidebar.
 * Uses BaseLayout for shared header functionality.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation for container-aware navigation
 * ===================================================================
 */

import { type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { WorkspaceSidebar } from './WorkspaceSidebar';

// =============================================================================
// Types
// =============================================================================

export interface WorkspaceLayoutProps {
  children?: ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <BaseLayout
      sidebar={<WorkspaceSidebar collapsed={false} />}
      sidebarKey="workspace"
      contentPadding={true}
    >
      {children ?? <Outlet />}
    </BaseLayout>
  );
}

export default WorkspaceLayout;
