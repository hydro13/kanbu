/*
 * WorkspaceSettingsRedirect Component
 * Version: 1.0.0
 *
 * Redirects from old /workspace/settings route to admin panel.
 * Part of Task 262 - Workspace Settings consolidatie.
 *
 * Task: 262 - Workspace Settings consolidatie
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { selectCurrentWorkspace } from '../store/workspaceSlice';
import { Layout } from '../components/layout/Layout';

export function WorkspaceSettingsRedirect() {
  const navigate = useNavigate();
  const currentWorkspace = useAppSelector(selectCurrentWorkspace);

  useEffect(() => {
    if (currentWorkspace?.id) {
      // Redirect to admin workspace edit page
      navigate(`/admin/workspaces/${currentWorkspace.id}`, { replace: true });
    } else {
      // No workspace selected, go to admin workspace list
      navigate('/admin/workspaces', { replace: true });
    }
  }, [currentWorkspace, navigate]);

  // Show loading while redirecting
  return (
    <Layout>
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to workspace settings...</p>
        </div>
      </div>
    </Layout>
  );
}
