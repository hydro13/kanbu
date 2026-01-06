"use strict";
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
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = exports.appRouter = void 0;
const router_1 = require("./router");
const system_1 = require("./procedures/system");
const auth_1 = require("./procedures/auth");
const workspace_1 = require("./procedures/workspace");
const user_1 = require("./procedures/user");
const project_1 = require("./procedures/project");
const column_1 = require("./procedures/column");
const swimlane_1 = require("./procedures/swimlane");
const task_1 = require("./procedures/task");
const subtask_1 = require("./procedures/subtask");
const comment_1 = require("./procedures/comment");
const activity_1 = require("./procedures/activity");
const tag_1 = require("./procedures/tag");
const category_1 = require("./procedures/category");
const taskLink_1 = require("./procedures/taskLink");
const search_1 = require("./procedures/search");
const attachment_1 = require("./procedures/attachment");
const notification_1 = require("./procedures/notification");
const sprint_1 = require("./procedures/sprint");
const milestone_1 = require("./procedures/milestone");
const analytics_1 = require("./procedures/analytics");
const import_1 = require("./procedures/import");
const export_1 = require("./procedures/export");
const apiKey_1 = require("./procedures/apiKey");
const webhook_1 = require("./procedures/webhook");
/**
 * Main app router
 * All procedure routers are merged here
 */
exports.appRouter = (0, router_1.router)({
    system: system_1.systemRouter,
    auth: auth_1.authRouter,
    workspace: workspace_1.workspaceRouter,
    user: user_1.userRouter,
    project: project_1.projectRouter,
    column: column_1.columnRouter,
    swimlane: swimlane_1.swimlaneRouter,
    task: task_1.taskRouter,
    subtask: subtask_1.subtaskRouter,
    comment: comment_1.commentRouter,
    activity: activity_1.activityRouter,
    tag: tag_1.tagRouter,
    category: category_1.categoryRouter,
    taskLink: taskLink_1.taskLinkRouter,
    search: search_1.searchRouter,
    attachment: attachment_1.attachmentRouter,
    notification: notification_1.notificationRouter,
    sprint: sprint_1.sprintRouter,
    milestone: milestone_1.milestoneRouter,
    analytics: analytics_1.analyticsRouter,
    import: import_1.importRouter,
    export: export_1.exportRouter,
    apiKey: apiKey_1.apiKeyRouter,
    webhook: webhook_1.webhookRouter,
});
/**
 * Re-export for convenience
 */
var context_1 = require("./context");
Object.defineProperty(exports, "createContext", { enumerable: true, get: function () { return context_1.createContext; } });
//# sourceMappingURL=index.js.map