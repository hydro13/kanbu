/*
 * tRPC App Router
 * Version: 1.3.0
 *
 * Combines all procedure routers into one app router.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:01 CET
 * Change: Added workspaceRouter and userRouter
 *
 * Modified by:
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Signed: 2025-12-28T12:27 CET
 * Change: Added projectRouter
 *
 * Modified by:
 * Session: 1d704110-bdc1-417f-a584-942696f49132
 * Signed: 2025-12-28T12:46 CET
 * Change: Added columnRouter and swimlaneRouter
 *
 * Modified by:
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Signed: 2025-12-28T13:02 CET
 * Change: Added taskRouter, subtaskRouter, commentRouter
 *
 * Modified by:
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Signed: 2025-12-28T19:37 CET
 * Change: Added tagRouter and categoryRouter
 *
 * Modified by:
 * Session: 91ee674b-91f8-407e-950b-e02721eb0de6
 * Signed: 2025-12-28T19:35 CET
 * Change: Added taskLinkRouter
 *
 * Modified by:
 * Session: abe602e0-56a9-4461-9c9f-84bdc854d640
 * Signed: 2025-12-28T19:45 CET
 * Change: Added activityRouter
 *
 * Modified by:
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Signed: 2025-12-28T21:40 CET
 * Change: Added searchRouter (EXT-02)
 *
 * Modified by:
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Signed: 2025-12-28T23:25 CET
 * Change: Added attachmentRouter (EXT-06)
 *
 * Modified by:
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Signed: 2025-12-28T22:25 CET
 * Change: Added notificationRouter (EXT-08)
 *
 * Modified by:
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Signed: 2025-12-28T23:30 CET
 * Change: Added sprintRouter (EXT-10)
 *
 * Modified by:
 * Session: 114f11bf-23b9-4a07-bc94-a4e80ec0c02e
 * Signed: 2025-12-28T23:16 CET
 * Change: Added milestoneRouter (EXT-11)
 *
 * Modified by:
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Signed: 2025-12-28T23:31 CET
 * Change: Added analyticsRouter (EXT-12)
 *
 * Modified by:
 * Session: 42983b33-d4f8-473b-ac66-0e07dad05515
 * Signed: 2025-12-28T23:59 CET
 * Change: Added importRouter and exportRouter (EXT-13)
 *
 * Modified by:
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Signed: 2025-12-29T00:16 CET
 * Change: Added apiKeyRouter and webhookRouter (EXT-14)
 *
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added adminRouter (ADMIN-01)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T01:10 CET
 * Change: Added stickyNoteRouter (USER-03)
 *
 * Modified: 2026-01-05
 * Change: Added groupRouter for AD-style group management
 *
 * Modified: 2026-01-09
 * Change: Added assistantRouter for Claude Code MCP integration (Fase 9.7)
 * ═══════════════════════════════════════════════════════════════════
 */

import { router } from './router';
import { systemRouter } from './procedures/system';
import { authRouter } from './procedures/auth';
import { workspaceRouter } from './procedures/workspace';
import { userRouter } from './procedures/user';
import { projectRouter } from './procedures/project';
import { columnRouter } from './procedures/column';
import { swimlaneRouter } from './procedures/swimlane';
import { taskRouter } from './procedures/task';
import { subtaskRouter } from './procedures/subtask';
import { commentRouter } from './procedures/comment';
import { activityRouter } from './procedures/activity';
import { tagRouter } from './procedures/tag';
import { categoryRouter } from './procedures/category';
import { taskLinkRouter } from './procedures/taskLink';
import { searchRouter } from './procedures/search';
import { attachmentRouter } from './procedures/attachment';
import { notificationRouter } from './procedures/notification';
import { sprintRouter } from './procedures/sprint';
import { milestoneRouter } from './procedures/milestone';
import { analyticsRouter } from './procedures/analytics';
import { importRouter } from './procedures/import';
import { exportRouter } from './procedures/export';
import { apiKeyRouter } from './procedures/apiKey';
import { webhookRouter } from './procedures/webhook';
import { adminRouter } from './procedures/admin';
import { stickyNoteRouter } from './procedures/stickyNote';
import { groupRouter } from './procedures/group';
import { roleAssignmentRouter } from './procedures/roleAssignment';
import { youtubeRouter } from './procedures/youtube';
import { aclRouter } from './procedures/acl';
import { auditLogRouter } from './procedures/auditLog';
import { assistantRouter } from './procedures/assistant';
import { githubAdminRouter } from './procedures/githubAdmin';
import { githubRouter } from './procedures/github';
import { dashboardRouter } from './procedures/dashboard';
import { workspaceWikiRouter } from './procedures/workspaceWiki';
import { projectWikiRouter } from './procedures/projectWiki';
import { projectGroupRouter } from './procedures/projectGroup';
import { favoriteRouter } from './procedures/favorite';

/**
 * Main app router
 * All procedure routers are merged here
 */
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  workspace: workspaceRouter,
  user: userRouter,
  project: projectRouter,
  column: columnRouter,
  swimlane: swimlaneRouter,
  task: taskRouter,
  subtask: subtaskRouter,
  comment: commentRouter,
  activity: activityRouter,
  tag: tagRouter,
  category: categoryRouter,
  taskLink: taskLinkRouter,
  search: searchRouter,
  attachment: attachmentRouter,
  notification: notificationRouter,
  sprint: sprintRouter,
  milestone: milestoneRouter,
  analytics: analyticsRouter,
  import: importRouter,
  export: exportRouter,
  apiKey: apiKeyRouter,
  webhook: webhookRouter,
  admin: adminRouter,
  stickyNote: stickyNoteRouter,
  group: groupRouter,
  roleAssignment: roleAssignmentRouter,
  youtube: youtubeRouter,
  acl: aclRouter,
  auditLog: auditLogRouter,
  assistant: assistantRouter,
  githubAdmin: githubAdminRouter,
  github: githubRouter,
  dashboard: dashboardRouter,
  workspaceWiki: workspaceWikiRouter,
  projectWiki: projectWikiRouter,
  projectGroup: projectGroupRouter,
  favorite: favoriteRouter,
});

/**
 * Export type for client usage
 */
export type AppRouter = typeof appRouter;

/**
 * Re-export for convenience
 */
export { createContext } from './context';
export type { Context } from './context';
