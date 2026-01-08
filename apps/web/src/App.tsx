/*
 * App Router
 * Version: 1.2.0
 *
 * Main application router with public and protected routes.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:01 CET
 * Change: Added WorkspaceSettings and UserProfile routes
 *
 * Modified by:
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Signed: 2025-12-28T13:40 CET
 * Change: Added BoardView and project routes
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:25 CET
 * Change: Added /workspaces route for workspace overview
 *
 * Session: de75c403-118c-4293-8d05-c2e3147fd7c8
 * Signed: 2025-12-28T22:35 CET
 * Change: Added ListView, CalendarView, TimelineView routes (EXT-09)
 *
 * Modified by:
 * Session: 114f11bf-23b9-4a07-bc94-a4e80ec0c02e
 * Signed: 2025-12-28T23:16 CET
 * Change: Added MilestoneView route (EXT-11)
 *
 * Modified by:
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Signed: 2025-12-28T23:31 CET
 * Change: Added AnalyticsDashboard route (EXT-12)
 *
 * Modified by:
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Signed: 2025-12-29T00:20 CET
 * Change: Added ImportExportPage route (EXT-13)
 *
 * Modified by:
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Signed: 2025-12-29T00:40 CET
 * Change: Added ApiSettingsPage and WebhookSettingsPage routes (EXT-14)
 *
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T02:07 CET
 * Change: Added BoardSettings route and sidebar link (ISSUE-001)
 *
 * Modified by:
 * Session: 9a49de0d-74ae-4a76-a6f6-53c7e3f2218b
 * Signed: 2025-12-29T18:05 CET
 * Change: Added ChangePassword page and /profile/password route (USER-01)
 *
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added admin routes and AcceptInvite page (ADMIN-01)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:30 CET
 * Change: Added dashboard routes for MyTasks and MySubtasks (USER-02)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:55 CET
 * Change: Use DashboardOverview with sidebar for /dashboard route
 * ═══════════════════════════════════════════════════════════════════
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CommandPaletteProvider } from './components/command'
// HomePage removed - now redirects to /dashboard
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { WorkspaceSettingsRedirect } from './pages/WorkspaceSettingsRedirect'
import { ProjectListPage } from './pages/ProjectList'
import { WorkspacePage } from './pages/WorkspacePage'
import { ProjectRedirect } from './pages/ProjectRedirect'
import { BoardViewPage } from './pages/BoardView'
import { ListViewPage } from './pages/ListView'
import { CalendarViewPage } from './pages/CalendarView'
import { TimelineViewPage } from './pages/TimelineView'
import { MilestoneViewPage } from './pages/MilestoneView'
import { AnalyticsDashboard } from './pages/AnalyticsDashboard'
import { ImportExportPage } from './pages/ImportExport'
import { ApiSettings } from './pages/ApiSettings'
import { WebhookSettings } from './pages/WebhookSettings'
import { BoardSettingsPage } from './pages/BoardSettings'
import { ProjectMembersPage } from './pages/ProjectMembers'
// Sprint pages
import { SprintPlanning } from './pages/SprintPlanning'
import { SprintBoard } from './pages/SprintBoard'
import { SprintBurndown } from './pages/SprintBurndown'
// Profile pages
import { ProfileSummary } from './pages/profile/ProfileSummary'
import { TimeTracking } from './pages/profile/TimeTracking'
import { LastLogins } from './pages/profile/LastLogins'
import { Sessions } from './pages/profile/Sessions'
import { PasswordHistory } from './pages/profile/PasswordHistory'
import { Metadata } from './pages/profile/Metadata'
import { EditProfile } from './pages/profile/EditProfile'
import { Avatar } from './pages/profile/Avatar'
import { TwoFactorAuth } from './pages/profile/TwoFactorAuth'
import { PublicAccess } from './pages/profile/PublicAccess'
import { NotificationPreferences } from './pages/profile/NotificationPreferences'
import { ExternalAccounts } from './pages/profile/ExternalAccounts'
import { Integrations } from './pages/profile/Integrations'
import { ApiTokens } from './pages/profile/ApiTokens'
import { HourlyRate } from './pages/profile/HourlyRate'
import { ChangePassword } from './pages/profile/ChangePassword'
// Admin pages
import { UserListPage, UserCreatePage, UserEditPage, InvitesPage, SystemSettingsPage, WorkspaceListPage, WorkspaceCreatePage, WorkspaceEditPage, BackupPage, GroupListPage, GroupEditPage, PermissionTreePage, AclPage } from './pages/admin'
// Dashboard pages
import { DashboardOverview, MyTasks, MySubtasks } from './pages/dashboard'
import { AcceptInvitePage } from './pages/AcceptInvite'
// Demo pages
import { EditorDemoPage } from './pages/EditorDemo'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AdminRoute } from './components/auth/AdminRoute'
import { useAppSelector } from './store'
import { selectIsAuthenticated } from './store/authSlice'

/**
 * Auth-aware redirect component
 * Redirects authenticated users away from auth pages
 */
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <CommandPaletteProvider>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <AuthRedirect>
              <LoginPage />
            </AuthRedirect>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRedirect>
              <RegisterPage />
            </AuthRedirect>
          }
        />
        <Route
          path="/invite/:token"
          element={
            <AuthRedirect>
              <AcceptInvitePage />
            </AuthRedirect>
          }
        />

        {/* Protected routes */}
        {/* Redirect root to dashboard - single homepage with sidebar */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <ProjectListPage />
            </ProtectedRoute>
          }
        />
        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tasks"
          element={
            <ProtectedRoute>
              <MyTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/subtasks"
          element={
            <ProtectedRoute>
              <MySubtasks />
            </ProtectedRoute>
          }
        />
        {/* Workspace page (SEO-friendly slug URL) */}
        <Route
          path="/workspace/:slug"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/settings"
          element={
            <ProtectedRoute>
              <WorkspaceSettingsRedirect />
            </ProtectedRoute>
          }
        />
        {/* Profile routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/timetracking"
          element={
            <ProtectedRoute>
              <TimeTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/logins"
          element={
            <ProtectedRoute>
              <LastLogins />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/sessions"
          element={
            <ProtectedRoute>
              <Sessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/password-history"
          element={
            <ProtectedRoute>
              <PasswordHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/metadata"
          element={
            <ProtectedRoute>
              <Metadata />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/avatar"
          element={
            <ProtectedRoute>
              <Avatar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/2fa"
          element={
            <ProtectedRoute>
              <TwoFactorAuth />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/public"
          element={
            <ProtectedRoute>
              <PublicAccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/notifications"
          element={
            <ProtectedRoute>
              <NotificationPreferences />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/external"
          element={
            <ProtectedRoute>
              <ExternalAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/integrations"
          element={
            <ProtectedRoute>
              <Integrations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/api"
          element={
            <ProtectedRoute>
              <ApiTokens />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/hourly-rate"
          element={
            <ProtectedRoute>
              <HourlyRate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Project routes - uses workspace slug + project identifier for SEO-friendly URLs */}
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/board"
          element={
            <ProtectedRoute>
              <BoardViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/list"
          element={
            <ProtectedRoute>
              <ListViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/calendar"
          element={
            <ProtectedRoute>
              <CalendarViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/timeline"
          element={
            <ProtectedRoute>
              <TimelineViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/milestones"
          element={
            <ProtectedRoute>
              <MilestoneViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/import-export"
          element={
            <ProtectedRoute>
              <ImportExportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/webhooks"
          element={
            <ProtectedRoute>
              <WebhookSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/api"
          element={
            <ProtectedRoute>
              <ApiSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/settings"
          element={
            <ProtectedRoute>
              <BoardSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/members"
          element={
            <ProtectedRoute>
              <ProjectMembersPage />
            </ProtectedRoute>
          }
        />
        {/* Sprint routes */}
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/sprints"
          element={
            <ProtectedRoute>
              <SprintPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/sprint/:sprintId"
          element={
            <ProtectedRoute>
              <SprintBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceSlug/project/:projectIdentifier/sprint/:sprintId/burndown"
          element={
            <ProtectedRoute>
              <SprintBurndown />
            </ProtectedRoute>
          }
        />
        {/* Legacy project routes - redirect to workspace-prefixed URLs */}
        <Route
          path="/project/:projectIdentifier/*"
          element={
            <ProtectedRoute>
              <ProjectRedirect />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <UserListPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/create"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <UserCreatePage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <UserEditPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invites"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <InvitesPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <SystemSettingsPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workspaces"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <WorkspaceListPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workspaces/new"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <WorkspaceCreatePage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workspaces/:id"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <WorkspaceEditPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <BackupPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <GroupListPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/groups/:groupId"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <GroupEditPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <PermissionTreePage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/acl"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AclPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Demo routes (development) */}
        <Route path="/demo/editor" element={<EditorDemoPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </CommandPaletteProvider>
    </BrowserRouter>
  )
}

export default App
