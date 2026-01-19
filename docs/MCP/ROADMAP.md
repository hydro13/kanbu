# Kanbu MCP Server - Roadmap

## Overview

This document describes the implementation roadmap for the Kanbu MCP Server with one-time setup code pairing.

## Implementation Phases

### Phase 1: Pairing Infrastructure ✅ COMPLETE (2026-01-09)

**Goal:** Setup code system, profile page UI, and MCP server with pairing.

**Status:** Fully implemented and working.

#### 1.1 Database Models

```prisma
// Temporary setup code (5 min TTL, one-time use)
model AssistantSetupCode {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  code        String    @unique  // KNB-XXXX-XXXX
  createdAt   DateTime  @default(now())
  expiresAt   DateTime  // createdAt + 5 min
  consumedAt  DateTime?
  machineId   String?   // Set when consumed

  @@index([code])
  @@index([userId])
}

// Permanent binding (after setup code consumption)
model AssistantBinding {
  id            Int       @id @default(autoincrement())
  userId        Int
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  machineId     String    // Hash of machine identifier
  machineName   String?   // "MAX (Linux)"
  tokenHash     String    @db.VarChar(255)
  tokenPrefix   String    @db.VarChar(8)
  createdAt     DateTime  @default(now())
  lastUsedAt    DateTime?
  revokedAt     DateTime?

  @@unique([userId, machineId])
  @@index([tokenPrefix])
}
```

- [x] Add Prisma schema (`packages/shared/prisma/schema.prisma`)
- [x] Run migration (`prisma db push`)
- [x] Seed data for testing

#### 1.2 Backend API - Setup Code

- [x] `assistant.generateSetupCode` - Generate new setup code
  - Invalidates existing unused codes
  - Format: `KNB-XXXX-XXXX` (uppercase alphanumeric)
  - TTL: 5 minutes
  - Return: code + expiresAt

- [x] `assistant.exchangeSetupCode` - Exchange code for permanent token
  - Input: setup code + machineId
  - Validates: not expired, not consumed
  - Creates: AssistantBinding with permanent token
  - Marks: setup code as consumed
  - Return: permanent token + user info

- [x] `assistant.getBindings` - List connected machines
  - Return: array of machine bindings (without tokens)

- [x] `assistant.revokeBinding` - Disconnect a machine
  - Input: bindingId
  - Sets: revokedAt timestamp

- [x] `assistant.getActiveSetupCode` - Get active setup code (for UI polling)

#### 1.3 Backend API - Token Validation

- [x] `assistant.validateToken` - Validate permanent token
  - Input: token
  - Validates: not revoked, binding exists
  - Updates: lastUsedAt
  - Return: user context

- [x] Rate limiting middleware (Implemented in Phase 5+)
  - 100 req/min per binding
  - 5 setup code attempts per hour

#### 1.4 Profile Page UI

- [x] "AI Assistant" section in profile page (`apps/web/src/pages/profile/AiAssistant.tsx`)
- [x] **Not connected state:**
  - Explanation text
  - "Generate Setup Code" button
- [x] **Setup code generated:**
  - Code display (large, clear)
  - Countdown timer
  - "Copy Code" button
  - Warning text about one-time use
- [x] **Connected state:**
  - List of connected machines
  - Per machine: name, connected date, last used
  - "Disconnect" button per machine with confirmation
  - "Generate New Setup Code" button
- [x] Security information section

#### 1.5 MCP Server Setup

- [x] Package: `packages/mcp-server`
- [x] TypeScript + ESM configuration (NodeNext module)
- [x] MCP SDK dependency (v1.25.2)
- [x] Local token storage (`~/.config/kanbu/mcp.json`)
- [x] Machine ID generation (SHA256 hash of hostname + user)

#### 1.6 MCP Tools - Pairing

- [x] `kanbu_connect` - Connect with setup code
  - Input: setup code
  - Calls: exchangeSetupCode API
  - Stores: permanent token locally
  - Return: user info + permissions summary

- [x] `kanbu_whoami` - Show connection info
  - Return: user, role, permissions, machine

- [x] `kanbu_disconnect` - Disconnect
  - Removes: local token file
  - (Server-side revocation planned for next phase)

**Deliverables Phase 1:** ✅ ALL DELIVERED

- ✅ Working setup code pairing system
- ✅ Profile page AI Assistant section
- ✅ MCP server with 3 pairing tools
- ✅ Multi-machine support

---

### Phase 2: Core Kanbu Tools ✅ COMPLETE (2026-01-09)

**Goal:** Basic project and task management via MCP.

**Status:** Fully implemented and working.

#### 2.1 Workspace & Project Tools

- [x] `kanbu_list_workspaces` - List accessible workspaces
- [x] `kanbu_get_workspace` - Workspace details with projects
- [x] `kanbu_list_projects` - List projects (filtered by ACL)
- [x] `kanbu_get_project` - Project details with columns
- [x] `kanbu_create_project` - New project (W on workspace)

#### 2.2 Task Tools

- [x] `kanbu_list_tasks` - Tasks in project with filters
- [x] `kanbu_get_task` - Task details with subtasks/comments
- [x] `kanbu_create_task` - Create new task
- [x] `kanbu_update_task` - Edit task properties
- [x] `kanbu_move_task` - Change status/column
- [x] `kanbu_my_tasks` - My assigned tasks

#### 2.3 ACL Integration

- [x] Permission check via Bearer token authentication
- [x] Clear error messages on no access
- [x] Audit logging with "via Claude Code" marker (Implemented in Phase 13)

**Deliverables Phase 2:** ✅ ALL DELIVERED

- ✅ 11 core tools (workspace, project, task management)
- ✅ ACL enforcement via tRPC procedures
- ✅ Tools files organized in `src/tools/` directory

---

### Phase 3: Subtasks & Comments ✅ COMPLETE (2026-01-09)

**Goal:** Subtask and comment management.

**Status:** Fully implemented and working.

#### 3.1 Subtask Tools

- [x] `kanbu_list_subtasks` - List subtasks with status/assignee/time
- [x] `kanbu_create_subtask` - Create new subtask
- [x] `kanbu_update_subtask` - Edit subtask properties
- [x] `kanbu_toggle_subtask` - Toggle between TODO and DONE
- [x] `kanbu_delete_subtask` - Delete subtask

#### 3.2 Comment Tools

- [x] `kanbu_list_comments` - Comments on a task
- [x] `kanbu_add_comment` - Add comment
- [x] `kanbu_update_comment` - Edit own comment
- [x] `kanbu_delete_comment` - Delete comment

**Deliverables Phase 3:** ✅ ALL DELIVERED

- ✅ 9 additional tools (5 subtask + 4 comment)
- ✅ Time tracking display in subtasks
- ✅ Status toggle functionality

---

### Phase 4: Search & Smart Features ✅ COMPLETE (2026-01-09)

**Goal:** Search and activity queries.

**Status:** Fully implemented and working.

#### 4.1 Search Tools

- [x] `kanbu_search_tasks` - Full-text search in tasks (title, reference, description)
- [x] `kanbu_search_global` - Search across tasks, comments, and wiki pages

#### 4.2 Activity Tools

- [x] `kanbu_recent_activity` - Recent project activity
- [x] `kanbu_task_activity` - Activity history for a specific task
- [x] `kanbu_activity_stats` - Activity statistics (last 30 days)

**Deliverables Phase 4:** ✅ ALL DELIVERED

- ✅ 5 additional tools (2 search + 3 activity)
- ✅ Full-text search in tasks, comments, wiki
- ✅ Activity timeline and statistics

---

### Phase 5: Analytics & Insights ✅ COMPLETE (2026-01-09)

**Goal:** Insights and reporting.

**Status:** Fully implemented and working.

#### 5.1 Project Analytics

- [x] `kanbu_project_stats` - Task counts, completion rate, trends, time tracking
- [x] `kanbu_velocity` - Tasks completed per week, rolling average
- [x] `kanbu_cycle_time` - Time per column, bottleneck identification
- [x] `kanbu_team_workload` - Tasks per member, overdue counts

**Deliverables Phase 5:** ✅ ALL DELIVERED

- ✅ 4 analytics tools
- ✅ Project statistics and trends
- ✅ Velocity tracking and visualization
- ✅ Cycle time analysis with bottleneck detection
- ✅ Team workload distribution

---

### Phase 5: Analytics & Insights ✅ COMPLETE (2026-01-09)

### Phase 5+ (Hardening): Dry Run & Safety ✅ COMPLETE (2026-01-16)

**Goal:** Add safety mechanisms for destructive actions.

**Status:** Fully implemented.

- [x] `dryRun` parameter added to `kanbu_delete_acl`
- [x] `dryRun` parameter added to `kanbu_bulk_revoke`
- [x] Simulation logic in handlers

### Phase 6: Testing Infrastructure ✅ COMPLETE (2026-01-16)

**Goal:** Unit and integration testing framework.

**Status:** Fully implemented.

- [x] `vitest` configuration
- [x] Unit tests for `tools.ts` helpers
- [x] Integration tests for `client.ts` (with retry logic)

### Phase 6+ (Previous Phase 6): User Management ✅ COMPLETE

**Goal:** User management via MCP.

**Status:** Complete.

#### 6.1 User Query Tools

- [x] `kanbu_list_users` - List all users (with filters)
- [x] `kanbu_get_user` - Get user details
- [x] `kanbu_get_user_logins` - Login history of user

#### 6.2 User Management Tools

- [x] `kanbu_create_user` - Create new user
- [x] `kanbu_update_user` - Update user data
- [x] `kanbu_delete_user` - Deactivate user (soft delete)
- [x] `kanbu_reactivate_user` - Reactivate user
- [x] `kanbu_reset_password` - Reset password
- [x] `kanbu_unlock_user` - Unlock blocked user
- [x] `kanbu_disable_2fa` - Disable 2FA
- [x] `kanbu_revoke_sessions` - End all sessions

**Deliverables Phase 6:**

- [x] 11 user management tools
- [x] Admin-only access via ACL check
- [x] Audit logging for all actions

---

### Phase 7: Groups Management ✅ COMPLETE

**Goal:** Security groups management via MCP.

**Status:** Complete.

#### 7.1 Group Query Tools

- [x] `kanbu_list_groups` - List all groups (with filters)
- [x] `kanbu_get_group` - Get group details
- [x] `kanbu_my_groups` - Get my groups
- [x] `kanbu_list_group_members` - Members of a group

#### 7.2 Group Management Tools

- [x] `kanbu_create_group` - Create new group
- [x] `kanbu_create_security_group` - Create security group (Domain Admin)
- [x] `kanbu_update_group` - Update group
- [x] `kanbu_delete_group` - Delete group
- [x] `kanbu_add_group_member` - Add member to group
- [x] `kanbu_remove_group_member` - Remove member from group

**Deliverables Phase 7:**

- [x] 10 group management tools
- [x] Privilege escalation prevention
- [x] WebSocket events for real-time updates

---

### Phase 8: ACL Manager ✅ COMPLETE

**Goal:** Access Control List management via MCP.

**Status:** Complete.

#### 8.1 ACL Query Tools

- [x] `kanbu_list_acl` - ACL entries for resource
- [x] `kanbu_check_permission` - Check permissions
- [x] `kanbu_my_permission` - My permissions on resource
- [x] `kanbu_get_principals` - All users/groups for ACL
- [x] `kanbu_get_resources` - All resources for ACL
- [x] `kanbu_get_acl_presets` - Available presets and bitmask values
- [x] `kanbu_get_permission_matrix` - Permission matrix view
- [x] `kanbu_calculate_effective` - Calculate effective permissions with breakdown

#### 8.2 ACL Management Tools

- [x] `kanbu_grant_permission` - Grant permissions
- [x] `kanbu_deny_permission` - Deny permissions (DENY entry)
- [x] `kanbu_revoke_permission` - Revoke permissions
- [x] `kanbu_update_acl` - Update ACL entry
- [x] `kanbu_delete_acl` - Delete ACL entry
- [x] `kanbu_bulk_grant` - Bulk grant permissions
- [x] `kanbu_bulk_revoke` - Bulk revoke permissions
- [x] `kanbu_copy_permissions` - Copy permissions to other resources
- [x] `kanbu_apply_template` - Apply permission template
- [x] `kanbu_simulate_change` - What-If analysis for ACL changes
- [x] `kanbu_export_acl` - Export ACL (JSON/CSV)
- [x] `kanbu_import_acl` - Import ACL (JSON/CSV)

**Deliverables Phase 8:**

- [x] 20 ACL management tools (8 query + 12 management)
- [x] RWXDP bitmask support (R=1, W=2, X=4, D=8, P=16)
- [x] Presets: None (0), Read Only (1), Contributor (7), Editor (15), Full Control (31)
- [x] What-If simulator for change preview

---

### Phase 9: Invites ✅ COMPLETE

**Goal:** Invitations management via MCP.

**Status:** Complete.

- [x] `kanbu_list_invites` - List all invitations (with status filter)
- [x] `kanbu_get_invite` - Get invitation details
- [x] `kanbu_send_invite` - Send invitation (max 50 emails per call)
- [x] `kanbu_cancel_invite` - Cancel invitation
- [x] `kanbu_resend_invite` - Resend invitation (with new token)

**Deliverables Phase 9:**

- [x] 5 invite management tools
- [x] Status tracking (pending, accepted, expired)
- [x] Bulk invite support

---

### Phase 10: Audit Logs ✅ COMPLETE

**Goal:** Audit logs querying via MCP.

**Status:** Complete.

- [x] `kanbu_list_audit_logs` - Get audit logs (with filters: category, action, date, workspace)
- [x] `kanbu_get_audit_log` - Single audit log entry with all details
- [x] `kanbu_audit_stats` - Audit statistics (counts by category, top actors, recent actions)
- [x] `kanbu_export_audit_logs` - Export audit logs (CSV/JSON, max 10,000)
- [x] `kanbu_get_audit_categories` - Available categories (ACL, GROUP, USER, WORKSPACE, SETTINGS)

**Deliverables Phase 10:**

- [x] 5 audit log tools
- [x] Scoped access (Domain Admin vs Workspace Admin)
- [x] Export functionality (CSV and JSON)
- [x] Statistics dashboard data

---

### Phase 11: System Settings & Backup ✅ COMPLETE

**Goal:** System settings and backups via MCP.

**Status:** Complete.

#### 11.1 Settings Tools

- [x] `kanbu_get_settings` - Get all settings
- [x] `kanbu_get_setting` - Get single setting
- [x] `kanbu_set_setting` - Update setting (create/update)
- [x] `kanbu_set_settings` - Update multiple settings (bulk)
- [x] `kanbu_delete_setting` - Delete setting

#### 11.2 Backup Tools

- [x] `kanbu_create_db_backup` - Database backup to Google Drive (keeps 10)
- [x] `kanbu_create_source_backup` - Source code backup to Google Drive (keeps 5)

#### 11.3 Admin Workspace Tools

- [x] `kanbu_admin_list_workspaces` - All workspaces (admin view, scoped)
- [x] `kanbu_admin_get_workspace` - Workspace details with stats
- [x] `kanbu_admin_update_workspace` - Update workspace
- [x] `kanbu_admin_delete_workspace` - Deactivate workspace (soft delete)
- [x] `kanbu_admin_reactivate_workspace` - Reactivate workspace

**Deliverables Phase 11:**

- [x] 12 system management tools
- [x] Domain Admin / Workspace Admin scoped access
- [x] Backup to Google Drive with automatic cleanup

---

### Phase 12: Profile Management ✅ COMPLETE

**Goal:** Own profile management via MCP (all functions from Profile Settings sidebar).

**Status:** Complete.

#### 12.1 Profile Information Tools

- [x] `kanbu_get_profile` - Get own profile summary
- [x] `kanbu_get_time_tracking` - Own time tracking overview (per project/period)
- [x] `kanbu_get_logins` - Own login history
- [x] `kanbu_get_sessions` - Get active sessions
- [x] `kanbu_get_password_history` - Password reset history
- [x] `kanbu_get_metadata` - Own user metadata

#### 12.2 Profile Update Tools

- [x] `kanbu_update_profile` - Edit profile (name, display name, email, timezone, etc.)
- [x] `kanbu_remove_avatar` - Remove avatar
- [x] `kanbu_change_password` - Change own password

#### 12.3 Two Factor Authentication Tools

- [x] `kanbu_get_2fa_status` - Get 2FA status (enabled, backup codes count)
- [x] `kanbu_setup_2fa` - Initiate 2FA setup (generates TOTP secret and QR data)
- [x] `kanbu_verify_2fa` - 2FA verification (check code and activate)
- [x] `kanbu_disable_2fa` - Disable own 2FA (requires password)
- [x] `kanbu_regenerate_backup_codes` - Generate new backup codes

#### 12.4 Public Access Tools

- [x] `kanbu_get_public_access` - Get public access settings
- [x] `kanbu_enable_public_access` - Enable public access and generate token
- [x] `kanbu_disable_public_access` - Disable public access and remove token
- [x] `kanbu_regenerate_public_token` - Generate new public access token

#### 12.5 Notification Tools

- [x] `kanbu_get_notification_settings` - Get notification settings
- [x] `kanbu_update_notification_settings` - Update notification settings (email, push, in-app)

#### 12.6 External Accounts Tools

- [x] `kanbu_list_external_accounts` - Linked external accounts (OAuth providers)
- [x] `kanbu_unlink_external_account` - Unlink external account

#### 12.7 API Tokens Tools

- [x] `kanbu_list_api_tokens` - Get own API tokens
- [x] `kanbu_create_api_token` - Create new API token (with scope and expiry)
- [x] `kanbu_revoke_api_token` - Revoke API token
- [x] `kanbu_get_api_permissions` - Get available API permissions for token creation

#### 12.8 AI Assistant Tools (extension)

- [x] `kanbu_list_ai_bindings` - View all AI assistant bindings
- [x] `kanbu_revoke_ai_binding` - Revoke specific AI binding

#### 12.9 Hourly Rate Tools

- [x] `kanbu_get_hourly_rate` - Get own hourly rate
- [x] `kanbu_set_hourly_rate` - Set hourly rate (currency, rate)

#### 12.10 Session Management Tools

- [x] `kanbu_set_metadata` - Set metadata key-value pair on profile
- [x] `kanbu_delete_metadata` - Delete metadata key from profile
- [x] `kanbu_revoke_session` - End specific session
- [x] `kanbu_revoke_all_sessions` - End all sessions

**Deliverables Phase 12:**

- [x] 36 profile management tools
- [x] Self-service profile management
- [x] 2FA setup and management (TOTP)
- [x] API tokens management with scopes
- [x] Notification preferences
- [x] Hourly rate for time tracking
- [x] Public access link management
- [x] Session management

---

### Phase 13: MCP Audit Infrastructure ✅ COMPLETE (2026-01-09)

**Goal:** Extend audit logging infrastructure so ALL MCP actions on behalf of the user are logged with "via Claude Code" marker.

**Status:** Fully implemented and working.

**Problem:** The MCP server executes actions on behalf of the user, but these were NOT logged in audit logs. Only security events (ACL, GROUP, USER, etc.) were logged. Task/project operations were invisible.

#### 13.1 New Audit Categories

Added to `auditService.ts`:

```typescript
export const AUDIT_CATEGORIES = {
  // Existing
  ACL: 'ACL',
  GROUP: 'GROUP',
  USER: 'USER',
  WORKSPACE: 'WORKSPACE',
  SETTINGS: 'SETTINGS',
  API: 'API',
  // New for MCP
  PROJECT: 'PROJECT',
  TASK: 'TASK',
  SUBTASK: 'SUBTASK',
  COMMENT: 'COMMENT',
} as const;
```

#### 13.2 New Audit Actions

```typescript
export const AUDIT_ACTIONS = {
  // ...existing actions...

  // PROJECT
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_ARCHIVED: 'project:archived',
  PROJECT_RESTORED: 'project:restored',

  // TASK
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_MOVED: 'task:moved',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_UNASSIGNED: 'task:unassigned',

  // SUBTASK
  SUBTASK_CREATED: 'subtask:created',
  SUBTASK_UPDATED: 'subtask:updated',
  SUBTASK_TOGGLED: 'subtask:toggled',
  SUBTASK_DELETED: 'subtask:deleted',

  // COMMENT
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
} as const;
```

#### 13.3 AssistantContext Metadata

All audit logs via MCP get extra metadata:

```typescript
metadata: {
  via: 'assistant',           // Marker that action came via Claude Code
  machineId: string,          // Hash of machine identifier
  machineName: string | null, // "MAX (Linux)"
  bindingId: number,          // AssistantBinding ID
}
```

#### 13.4 Helper Functions

```typescript
// In auditService.ts
async logTaskEvent(params: Omit<AuditLogParams, 'category'>): Promise<{ id: number }> {
  return this.log({ ...params, category: 'TASK' })
}

async logProjectEvent(params: Omit<AuditLogParams, 'category'>): Promise<{ id: number }> {
  return this.log({ ...params, category: 'PROJECT' })
}

async logSubtaskEvent(params: Omit<AuditLogParams, 'category'>): Promise<{ id: number }> {
  return this.log({ ...params, category: 'SUBTASK' })
}

async logCommentEvent(params: Omit<AuditLogParams, 'category'>): Promise<{ id: number }> {
  return this.log({ ...params, category: 'COMMENT' })
}
```

**Deliverables Phase 13:**

- [x] 4 new audit categories (PROJECT, TASK, SUBTASK, COMMENT)
- [x] 17 new audit actions
- [x] Helper functions for each category
- [x] AssistantContext metadata schema

---

### Phase 14: MCP Task & Project Logging ✅ COMPLETE (2026-01-09)

**Goal:** Implement audit logging in task.ts and project.ts procedures.

**Status:** Fully implemented and working.

#### 14.1 Task Procedures Logging

| Procedure       | Action            | What to log                           |
| --------------- | ----------------- | ------------------------------------- |
| `task.create`   | `task:created`    | projectId, title, assignees           |
| `task.update`   | `task:updated`    | taskId, changed fields (before/after) |
| `task.move`     | `task:moved`      | taskId, fromColumn, toColumn          |
| `task.delete`   | `task:deleted`    | taskId, title                         |
| `task.assign`   | `task:assigned`   | taskId, userId                        |
| `task.unassign` | `task:unassigned` | taskId, userId                        |

Example implementation:

```typescript
// In task.ts create procedure
await auditService.logTaskEvent({
  action: AUDIT_ACTIONS.TASK_CREATED,
  resourceType: 'task',
  resourceId: task.id,
  resourceName: `${task.ref}: ${task.title}`,
  userId: ctx.user.id,
  workspaceId: project.workspaceId,
  changes: { title: task.title, column: task.columnId },
  metadata: ctx.assistantContext
    ? {
        via: 'assistant',
        machineId: ctx.assistantContext.machineId,
        machineName: ctx.assistantContext.machineName,
        bindingId: ctx.assistantContext.bindingId,
      }
    : undefined,
});
```

#### 14.2 Project Procedures Logging

| Procedure         | Action             | What to log               |
| ----------------- | ------------------ | ------------------------- |
| `project.create`  | `project:created`  | workspaceId, name, prefix |
| `project.update`  | `project:updated`  | projectId, changed fields |
| `project.archive` | `project:archived` | projectId, name           |
| `project.restore` | `project:restored` | projectId, name           |

**Deliverables Phase 14:**

- [x] Audit logging in all task procedures (create, update, move, delete, assign)
- [x] Audit logging in all project procedures (Implemented in Phase 14)
- [x] Before/after change tracking for updates
- [x] AssistantContext metadata in all logs

---

### Phase 15: MCP Subtask & Comment Logging ✅ COMPLETE (2026-01-09)

**Goal:** Implement audit logging in subtask.ts and comment.ts procedures.

**Status:** Fully implemented and working.

#### 15.1 Subtask Procedures Logging

| Procedure        | Action            | What to log                      |
| ---------------- | ----------------- | -------------------------------- |
| `subtask.create` | `subtask:created` | taskId, title                    |
| `subtask.update` | `subtask:updated` | subtaskId, changed fields        |
| `subtask.toggle` | `subtask:toggled` | subtaskId, newStatus (TODO/DONE) |
| `subtask.delete` | `subtask:deleted` | subtaskId, title                 |

#### 15.2 Comment Procedures Logging

| Procedure        | Action            | What to log                         |
| ---------------- | ----------------- | ----------------------------------- |
| `comment.create` | `comment:created` | taskId, content preview (truncated) |
| `comment.update` | `comment:updated` | commentId, before/after             |
| `comment.delete` | `comment:deleted` | commentId, content preview          |

**Deliverables Phase 15:**

- [x] Audit logging in all subtask procedures (create, update, delete)
- [x] Audit logging in all comment procedures (create, update, delete)
- [x] Content preview truncation (max 100 chars)

---

### Phase 16: Audit UI Updates ✅ COMPLETE (2026-01-09)

**Goal:** Update audit logs UI to clearly show MCP actions.

**Status:** Fully implemented and working.

#### 16.1 New Category Filters

Extend UI with filters for:

- PROJECT
- TASK
- SUBTASK
- COMMENT

#### 16.2 "Via Claude Code" Indicator

Show in audit logs table:

```
[USER_AVATAR] Robin Waslander
              via Claude Code (MAX)
```

Or as badge:

```
Robin Waslander [🤖 Claude]
```

#### 16.3 Machine Details in Log Detail View

When clicking on audit entry:

```
Action: task:created
User: Robin Waslander
Via: Claude Code
  Machine: your-machine (Linux)
  Binding ID: 42
  Connected since: 2026-01-09
```

**Deliverables Phase 16:** ✅ ALL DELIVERED

- [x] Category filters for PROJECT, TASK, SUBTASK, COMMENT
- [x] "Via Claude Code" badge/indicator in table
- [x] Machine details in detail view (MCP panel with machine name, ID, binding)
- [x] Filter on "via: assistant" to see only MCP actions

---

## Tool Overview

| Phase          | Tools                        | Cumulative | Status         |
| -------------- | ---------------------------- | ---------- | -------------- |
| Phase 1        | 3 (pairing)                  | 3          | ✅ Complete    |
| Phase 2        | 11 (core)                    | 14         | ✅ Complete    |
| Phase 3        | 9 (subtasks/comments)        | 23         | ✅ Complete    |
| Phase 4        | 5 (search/activity)          | 28         | ✅ Complete    |
| Phase 5        | 4 (analytics)                | 32         | ✅ Complete    |
| Phase 6        | 11 (user management)         | 43         | ✅ Complete    |
| Phase 7        | 10 (groups)                  | 53         | ✅ Complete    |
| Phase 8        | 20 (ACL)                     | 73         | ✅ Complete    |
| Phase 9        | 5 (invites)                  | 78         | ✅ Complete    |
| Phase 10       | 5 (audit)                    | 83         | ✅ Complete    |
| Phase 11       | 12 (system)                  | 95         | ✅ Complete    |
| Phase 12       | 36 (profile)                 | 131        | ✅ Complete    |
| Phase 13       | - (audit infrastructure)     | 131        | ✅ Complete    |
| Phase 14       | - (task/project logging)     | 131        | ✅ Complete    |
| Phase 15       | - (subtask/comment logging)  | 131        | ✅ Complete    |
| Phase 16       | - (audit UI updates)         | 131        | ✅ Complete    |
| GitHub Phase 9 | 10 (github)                  | 141        | ✅ Complete    |
| Phase 17       | 18 (wiki pages)              | 159        | 🔄 In Progress |
| Phase 18       | 157 (remote HTTP endpoint)   | 159        | ✅ Complete    |
| Phase 19       | - (OAuth 2.1 authentication) | 159        | 🔄 In Progress |

> **Note:** Phase 18 exposes ALL tools via HTTP endpoint (157 = local MCP tools + 3 connection tools)
> **Note:** Phase 19 adds OAuth 2.1 authentication for Claude.ai/ChatGPT integration (no new tools, auth infrastructure)

---

### GitHub Connector - Phase 9: MCP Tools ✅ COMPLETE (2026-01-09)

**Goal:** GitHub integration tools for Claude Code.

**Status:** Fully implemented.

**File:** `packages/mcp-server/src/tools/github.ts`

#### Query Tools (5)

| Tool                        | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `kanbu_get_github_repo`     | Get linked GitHub repository for a project           |
| `kanbu_list_github_prs`     | List pull requests for a project (with state filter) |
| `kanbu_list_github_commits` | List commits for a project                           |
| `kanbu_get_task_prs`        | Get PRs linked to a specific task                    |
| `kanbu_get_task_commits`    | Get commits linked to a specific task                |

#### Management Tools (5)

| Tool                         | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `kanbu_link_github_repo`     | Link a GitHub repository to a Kanbu project  |
| `kanbu_unlink_github_repo`   | Unlink a GitHub repository from a project    |
| `kanbu_sync_github_issues`   | Import/sync issues from GitHub to Kanbu      |
| `kanbu_create_github_branch` | Create a feature branch on GitHub for a task |
| `kanbu_link_pr_to_task`      | Manually link a PR to a task                 |

**Deliverables:**

- [x] 10 GitHub MCP tools
- [x] TypeScript compiles without errors
- [x] Tools registered in index.ts

---

### Phase 17: Wiki Pages Management 🔄 IN PROGRESS

**Goal:** Wiki pages CRUD operations for both project and workspace wikis via MCP.

**Status:** Implementation in progress. Tools created, tests passing. Awaiting manual testing.

**Background:** Wiki functionality is fully implemented in the backend (Prisma models, tRPC procedures), including:

- Version control (20 versions per page)
- Lexical JSON content support
- Hierarchical page structure (parent/child)
- Draft/Published/Archived status
- Graphiti knowledge graph sync
- Slug-based permalinks

However, no MCP tools exist yet for creating, updating, or managing wiki pages from Claude Code.

#### 17.1 Project Wiki Tools (9)

| Tool                                  | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| `kanbu_list_project_wiki_pages`       | List wiki pages in a project (with parent filter) |
| `kanbu_get_project_wiki_page`         | Get wiki page by ID                               |
| `kanbu_get_project_wiki_page_by_slug` | Get wiki page by slug (permalink)                 |
| `kanbu_create_project_wiki_page`      | Create new wiki page in project                   |
| `kanbu_update_project_wiki_page`      | Update wiki page (creates new version)            |
| `kanbu_delete_project_wiki_page`      | Delete wiki page                                  |
| `kanbu_get_project_wiki_versions`     | Get version history for a page                    |
| `kanbu_get_project_wiki_version`      | Get specific version of a page                    |
| `kanbu_restore_project_wiki_version`  | Restore old version (creates new version)         |

#### 17.2 Workspace Wiki Tools (9)

| Tool                                    | Description                                       |
| --------------------------------------- | ------------------------------------------------- |
| `kanbu_list_workspace_wiki_pages`       | List wiki pages in workspace (with parent filter) |
| `kanbu_get_workspace_wiki_page`         | Get wiki page by ID                               |
| `kanbu_get_workspace_wiki_page_by_slug` | Get wiki page by slug (permalink)                 |
| `kanbu_create_workspace_wiki_page`      | Create new wiki page in workspace                 |
| `kanbu_update_workspace_wiki_page`      | Update wiki page (creates new version)            |
| `kanbu_delete_workspace_wiki_page`      | Delete wiki page                                  |
| `kanbu_get_workspace_wiki_versions`     | Get version history for a page                    |
| `kanbu_get_workspace_wiki_version`      | Get specific version of a page                    |
| `kanbu_restore_workspace_wiki_version`  | Restore old version (creates new version)         |

#### 17.3 Implementation Notes

**Content Format:**

- Wiki pages support both plain text (`content`) and Lexical JSON (`contentJson`)
- For MCP, plain text is primary interface, Lexical JSON optional
- Auto-generate slug from title on create

**Cross-Reference Support:**
Wiki pages support rich cross-references that are automatically extracted and tracked:

- `[[Wiki Page]]` - Links to other wiki pages (with link resolution and backlinks)
- `#TASK-123` or `#123` - Links to tasks (with status indicators)
- `@username` - User mentions (triggers notifications)
- `#tag-name` - Tags for categorization (distinguishable from task links)
- External URLs - Automatic link detection

**Link Extraction:**

- On save: extract all cross-references from content
- Resolve `[[wiki links]]` to page IDs
- Store link relationships for backlinks
- Send notifications for `@mentions`
- Track broken links (when target doesn't exist)

**Version Control:**

- Each update creates new version (max 20 versions)
- Include `changeNote` parameter for version history
- Restore creates new version (doesn't rewrite history)

**Hierarchy:**

- Pages can have parent pages (`parentId`)
- Support for nested wiki structures
- List pages with optional parent filter

**Status:**

- DRAFT: Work in progress, not visible to non-authors
- PUBLISHED: Visible to all with read access
- ARCHIVED: Hidden but preserved

**ACL Integration:**

- Project wiki: requires READ on project for list/get, WRITE for create/update/delete
- Workspace wiki: requires READ on workspace for list/get, WRITE for create/update/delete
- Audit logging for all wiki operations (category: WIKI)

**Graphiti Sync:**

- Wiki pages are synced to knowledge graph
- Entities and facts are extracted
- Cross-references become graph edges
- Enables semantic search and RAG chat

**Testing & Validation Requirements:**
Before marking Phase 17 as complete, the following must be verified:

**Unit Tests:**

- [x] Test handlers for all 18 wiki tools (71 tests passing)
- [ ] Test cross-reference extraction ([[wiki]], @mention, #task, #tag)
- [ ] Test link resolution logic (project → workspace fallback)
- [ ] Test version control (create, list, restore, max 20 limit)
- [ ] Test slug generation and uniqueness
- [ ] Test ACL permission enforcement
- [ ] Test audit logging for all operations

**Integration Tests:**

- [ ] Test with real tRPC procedures (projectWiki, workspaceWiki)
- [ ] Test Graphiti sync after wiki page creation/update
- [ ] Test notification sending for @mentions
- [ ] Test backlink creation for [[wiki links]]
- [ ] Test broken link detection

**Manual Testing Checklist:**

- [ ] Create wiki page via Claude Code in test project
- [ ] Update page and verify version is created
- [ ] Test [[wiki link]] to another page
- [ ] Test @mention and verify notification
- [ ] Test #task-123 link resolution
- [ ] Test #tag categorization
- [ ] Restore old version and verify
- [ ] Delete page and verify soft delete
- [ ] Test ACL: try creating page without WRITE permission
- [ ] Verify audit log entries for all operations

**Code Quality:**

- [x] TypeScript compiles without errors
- [x] All tools registered in `packages/mcp-server/src/index.ts`
- [ ] Test coverage >80% for wiki tools
- [ ] Documentation with examples in README

**User Approval:**

- [ ] Robin has tested all wiki tools in Claude Code
- [ ] All test cases passed
- [ ] Performance is acceptable
- [ ] No regressions in existing functionality
- [ ] **Explicit approval from Robin before marking complete**

**Deliverables Phase 17:**

- [x] 18 wiki management tools (9 project + 9 workspace)
- [x] Full CRUD operations for wiki pages
- [x] Version control support (list, get, restore)
- [x] Hierarchical page structure
- [x] Status management (draft/published/archived)
- [x] Slug-based permalinks
- [ ] Audit logging for wiki operations (requires integration test)
- [ ] Cross-reference extraction and tracking (requires integration test)
- [ ] Complete test suite (unit + integration)
- [ ] Documentation and usage examples
- [ ] User acceptance testing passed

---

### Phase 18: Remote MCP Endpoint ✅ COMPLETE (2026-01-19)

**Goal:** Enable Claude.ai users to connect directly to Kanbu via HTTP-based MCP protocol.

**Status:** Fully implemented with ALL 157 tools available.

**Background:** The existing MCP server runs locally alongside Claude Code (stdio transport). Phase 18 adds an HTTP endpoint (`/mcp`) directly to the Kanbu API, enabling:

- **Claude.ai web/mobile** users to connect via Custom Connector
- **Voice-driven project management** from any Claude interface (web, iOS, Android)
- **No local installation required** - just an API key

#### 18.1 Architecture

```
Current (stdio):
┌─────────────────┐      stdio       ┌─────────────────┐
│  Claude Code    │ ←──────────────→ │  MCP Server     │
│  (local)        │                  │  (local process)│
└─────────────────┘                  └────────┬────────┘
                                              │ HTTP
                                              ▼
                                     ┌─────────────────┐
                                     │  Kanbu API      │
                                     └─────────────────┘

Phase 18 (HTTP):
┌─────────────────┐      HTTPS       ┌─────────────────┐
│  Claude.ai      │ ←──────────────→ │  Kanbu API      │
│  (web/mobile)   │    /mcp          │  /mcp endpoint  │
└─────────────────┘                  └─────────────────┘
```

#### 18.2 Implementation

**Files Created:**

- `apps/api/src/routes/mcp.ts` - MCP HTTP endpoint (1166 lines, v2.0.0)
- `apps/api/src/services/mcp/toolDefinitions.ts` - 157 tool definitions (v2.0.0)
- `apps/api/src/services/mcp/index.ts` - Barrel export

**Files Modified:**

- `apps/api/src/server.ts` - Register MCP routes

**Endpoints:**

- `GET /mcp` - Server info (tools count, protocol version)
- `POST /mcp` - JSON-RPC 2.0 endpoint with SSE responses

**Supported MCP Methods:**
| Method | Description |
|--------|-------------|
| `initialize` | Initialize session, exchange capabilities |
| `tools/list` | List all 157 available tools |
| `tools/call` | Execute a tool |
| `ping` | Health check |

#### 18.3 Tool Categories (157 total)

| Category    | Tools | Description                                           |
| ----------- | ----- | ----------------------------------------------------- |
| Workspace   | 2     | List and get workspace details                        |
| Project     | 3     | List, get, and create projects                        |
| Task        | 6     | Full task CRUD + move + my tasks                      |
| Subtask     | 5     | Subtask CRUD + toggle                                 |
| Comment     | 4     | Comment CRUD                                          |
| Search      | 2     | Task search + global semantic search                  |
| Activity    | 3     | Recent activity, task activity, stats                 |
| Analytics   | 4     | Project stats, velocity, cycle time, workload         |
| Admin Users | 11    | User management (CRUD, password, 2FA, sessions)       |
| Groups      | 10    | Group management (CRUD, members)                      |
| ACL         | 20    | Permissions (grant, deny, bulk, templates, simulate)  |
| Invites     | 5     | Invitation management                                 |
| Audit       | 5     | Audit logs (list, get, stats, export)                 |
| System      | 12    | Settings, backups, admin workspaces                   |
| Profile     | 36    | Own profile, 2FA, notifications, API tokens, sessions |
| GitHub      | 10    | Repository linking, PRs, commits, branches            |
| Wiki        | 18    | Project + workspace wiki CRUD with versioning         |

#### 18.4 Authentication

Uses existing API key system (`kb_xxxxx` tokens):

```
Authorization: Bearer kb_xxxxxxxxxxxxx
```

- API key validated on every request
- Rate limited (100 req/min per key, configurable via `MCP_RATE_LIMIT`)
- Inherits user's workspace/project permissions via ACL
- Tools route to tRPC procedures internally (no HTTP overhead)

#### 18.5 Claude.ai Configuration

Users configure Custom Connector in Claude.ai:

```
Name: Kanbu
URL: https://<your-kanbu-instance>/mcp
Authentication: Bearer Token
Token: kb_xxxxxxxxxxxxx
```

**Example URLs per deployment:**

| Environment       | URL                           |
| ----------------- | ----------------------------- |
| Production (SaaS) | `https://app.kanbu.be/mcp`    |
| Development       | `https://dev.kanbu.be/mcp`    |
| Demo              | `https://demo.kanbu.be/mcp`   |
| Self-hosted       | `https://your-domain.com/mcp` |

#### 18.6 Environment Variables

```env
MCP_ENABLED=true        # Enable /mcp endpoint (default: true)
MCP_RATE_LIMIT=100      # Requests per minute per API key
```

**Deliverables Phase 18:** ✅ ALL DELIVERED

- [x] HTTP endpoint `/mcp` with JSON-RPC 2.0 + SSE
- [x] API key authentication (Bearer kb_xxx)
- [x] Rate limiting per API key
- [x] **ALL 157 tools available** (feature parity with local MCP server)
- [x] tRPC caller for internal routing (no HTTP overhead)
- [x] Protocol version 2024-11-05
- [x] Works on any Kanbu deployment (SaaS + self-hosted)

---

### Phase 19: OAuth 2.1 Authentication 🔄 IN PROGRESS

**Goal:** Enable Claude.ai and ChatGPT to connect via OAuth 2.1, supporting both local installs and SaaS deployments with multi-instance support.

**Status:** Phases 19.1-19.6 complete. OAuth infrastructure working. Integration testing pending.

**Background:** Phase 18 added HTTP-based MCP with API key authentication. Phase 19 adds OAuth 2.1 support required by Claude.ai (and optionally ChatGPT), enabling:

- **Claude.ai native integration** - OAuth 2.1 + PKCE + DCR (required by Claude)
- **ChatGPT integration** - OAuth 2.0 with static credentials
- **Multi-instance support** - Multiple Kanbu deployments (dev.kanbu.be, app.kanbu.be, demo.kanbu.be)
- **Platform support** - Desktop (stdio+remote), Mobile (remote only), Web (remote only)

#### Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kanbu API                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ OAuth 2.1   │  │ MCP HTTP    │  │ tRPC Procedures         │  │
│  │ Endpoints   │  │ Endpoint    │  │ (existing)              │  │
│  │             │  │ (Phase 18)  │  │                         │  │
│  │ /oauth/*    │  │ /mcp        │  │ task.*, project.*, etc  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
│                    ┌─────▼─────┐                                 │
│                    │ Auth      │                                 │
│                    │ Middleware│                                 │
│                    └───────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Decision:** MCP built into Kanbu API (not separate microservice) for simpler scaling.

#### 19.1 OAuth Database Schema

**Goal:** Database tables for OAuth clients, authorization codes, and tokens.

**Prisma Schema:**

```prisma
// OAuth 2.1 Dynamic Client Registration (RFC 7591)
model OAuthClient {
  id                    Int       @id @default(autoincrement())
  clientId              String    @unique @db.VarChar(64)
  clientSecret          String?   @db.VarChar(255)  // Hashed, null for public clients
  clientName            String    @db.VarChar(255)
  clientUri             String?   @db.VarChar(2048)
  logoUri               String?   @db.VarChar(2048)
  redirectUris          String[]  // Array of allowed redirect URIs
  grantTypes            String[]  // ["authorization_code", "refresh_token"]
  responseTypes         String[]  // ["code"]
  tokenEndpointAuthMethod String  @default("none") @db.VarChar(50)  // none, client_secret_basic, client_secret_post
  scope                 String?   @db.VarChar(1000)

  // Metadata
  registrationToken     String?   @db.VarChar(255)  // For client management
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relations
  codes                 OAuthAuthorizationCode[]
  tokens                OAuthToken[]

  @@index([clientId])
  @@map("oauth_clients")
}

// Authorization codes (short-lived, one-time use)
model OAuthAuthorizationCode {
  id                    Int       @id @default(autoincrement())
  code                  String    @unique @db.VarChar(64)
  clientId              Int
  client                OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  userId                Int
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  redirectUri           String    @db.VarChar(2048)
  scope                 String?   @db.VarChar(1000)
  codeChallenge         String?   @db.VarChar(128)  // PKCE
  codeChallengeMethod   String?   @db.VarChar(10)   // S256
  expiresAt             DateTime
  consumedAt            DateTime?
  createdAt             DateTime  @default(now())

  @@index([code])
  @@index([clientId])
  @@map("oauth_authorization_codes")
}

// Access and refresh tokens
model OAuthToken {
  id                    Int       @id @default(autoincrement())
  tokenType             String    @db.VarChar(20)  // "access" or "refresh"
  tokenHash             String    @unique @db.VarChar(64)
  tokenPrefix           String    @db.VarChar(8)   // For identification
  clientId              Int
  client                OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  userId                Int
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  scope                 String?   @db.VarChar(1000)
  expiresAt             DateTime
  revokedAt             DateTime?
  createdAt             DateTime  @default(now())

  // For refresh token rotation
  parentTokenId         Int?

  @@index([tokenHash])
  @@index([tokenPrefix])
  @@index([clientId])
  @@index([userId])
  @@map("oauth_tokens")
}
```

**Deliverables 19.1:**

- [x] Add OAuthClient, OAuthAuthorizationCode, OAuthToken models to Prisma schema
- [x] Run `prisma db push` to create tables
- [x] Add User relations for OAuth tokens

---

#### 19.2 Metadata Endpoints (Discovery)

**Goal:** RFC 8414 and RFC 9728 compliant discovery endpoints.

**Endpoints:**

| Endpoint                                      | RFC      | Description                                         |
| --------------------------------------------- | -------- | --------------------------------------------------- |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 | Authorization server metadata                       |
| `GET /.well-known/oauth-protected-resource`   | RFC 9728 | Protected resource metadata (required by Claude.ai) |

**OAuth Authorization Server Metadata (RFC 8414):**

```json
{
  "issuer": "https://app.kanbu.be",
  "authorization_endpoint": "https://app.kanbu.be/oauth/authorize",
  "token_endpoint": "https://app.kanbu.be/oauth/token",
  "registration_endpoint": "https://app.kanbu.be/oauth/register",
  "token_endpoint_auth_methods_supported": ["none", "client_secret_basic", "client_secret_post"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "response_types_supported": ["code"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["read", "write", "admin"],
  "service_documentation": "https://docs.kanbu.be/oauth"
}
```

**Protected Resource Metadata (RFC 9728):**

```json
{
  "resource": "https://app.kanbu.be/mcp",
  "authorization_servers": ["https://app.kanbu.be"],
  "scopes_supported": ["read", "write", "admin"],
  "bearer_methods_supported": ["header"]
}
```

**Deliverables 19.2:**

- [x] Create `apps/api/src/routes/oauth/metadata.ts`
- [x] Implement `GET /.well-known/oauth-authorization-server`
- [x] Implement `GET /.well-known/oauth-protected-resource`
- [x] Register routes in server.ts
- [ ] Test with Claude.ai discovery (requires full OAuth flow)

---

#### 19.3 Dynamic Client Registration (DCR)

**Goal:** RFC 7591 compliant client registration endpoint (required by Claude.ai).

**Endpoint:** `POST /oauth/register`

**Request (from Claude.ai):**

```json
{
  "client_name": "Claude.ai",
  "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

**Response:**

```json
{
  "client_id": "kanbu_xxxxxxxxxxxxxxxx",
  "client_secret": null,
  "client_name": "Claude.ai",
  "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "registration_access_token": "rat_xxxxx",
  "registration_client_uri": "https://app.kanbu.be/oauth/register/kanbu_xxxxx"
}
```

**Security:**

- Anonymous registration allowed (required by Claude.ai)
- Rate limit: 10 registrations per IP per hour
- Validate redirect_uris against allowlist patterns
- Generate secure client*id with `kanbu*` prefix

**Deliverables 19.3:**

- [x] Create `apps/api/src/routes/oauth/register.ts`
- [x] Implement `POST /oauth/register` (client registration)
- [x] Implement `GET /oauth/register/:clientId` (client info)
- [x] Implement `PUT /oauth/register/:clientId` (client update)
- [x] Implement `DELETE /oauth/register/:clientId` (client delete)
- [x] Add rate limiting (10 registrations per IP per hour)
- [x] Add redirect_uri validation (claude.ai, chatgpt.com, localhost patterns)

---

#### 19.4 Authorization Endpoint (PKCE)

**Goal:** RFC 6749 + RFC 7636 (PKCE) authorization endpoint.

**Endpoint:** `GET /oauth/authorize`

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Client identifier |
| `redirect_uri` | Yes | Must match registered URI |
| `response_type` | Yes | Must be "code" |
| `state` | Yes | CSRF protection (required by ChatGPT) |
| `code_challenge` | Yes | PKCE challenge (required by Claude.ai) |
| `code_challenge_method` | Yes | Must be "S256" |
| `scope` | No | Requested scopes |

**Flow:**

1. User lands on `/oauth/authorize` with params
2. If not logged in → redirect to `/login?redirect=/oauth/authorize?...`
3. Show consent screen: "Claude.ai wants to access your Kanbu account"
4. User approves → generate authorization code
5. Redirect to `redirect_uri?code=xxx&state=xxx`

**Consent Screen UI:**

```
┌─────────────────────────────────────────────┐
│              [KANBU LOGO]                   │
│                                             │
│   Claude.ai wants to access your account    │
│                                             │
│   This will allow Claude.ai to:             │
│   ✓ Read your projects and tasks            │
│   ✓ Create and update tasks                 │
│   ✓ Access project analytics                │
│                                             │
│   [Cancel]              [Allow Access]      │
└─────────────────────────────────────────────┘
```

**Deliverables 19.4:**

- [x] Create `apps/api/src/routes/oauth/authorize.ts`
- [x] Implement authorization code generation
- [x] Implement PKCE validation (S256)
- [x] Create consent screen UI (`apps/web/src/pages/oauth/Authorize.tsx`)
- [x] Add login redirect flow (updated LoginForm to handle redirect param)
- [x] Store authorization code with PKCE challenge

---

#### 19.5 Token Endpoint

**Goal:** RFC 6749 token exchange with PKCE verification.

**Endpoint:** `POST /oauth/token`

**Grant Type: authorization_code**

Request:

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=xxxxx
&redirect_uri=https://claude.ai/api/mcp/auth_callback
&client_id=kanbu_xxxxx
&code_verifier=yyyyy
```

Response:

```json
{
  "access_token": "kat_xxxxxxxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "krt_xxxxxxxxxxxxx",
  "scope": "read write"
}
```

**Grant Type: refresh_token**

Request:

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=krt_xxxxxxxxxxxxx
&client_id=kanbu_xxxxx
```

**Token Introspection (RFC 7662):**

`POST /oauth/token/introspect`

```json
{
  "token": "kat_xxxxx",
  "token_type_hint": "access_token"
}
```

Response:

```json
{
  "active": true,
  "client_id": "kanbu_xxxxx",
  "username": "robin",
  "scope": "read write",
  "exp": 1234567890
}
```

**Token Revocation (RFC 7009):**

`POST /oauth/token/revoke`

```json
{
  "token": "kat_xxxxx",
  "token_type_hint": "access_token"
}
```

**Token Format:**

- Access token: `kat_` prefix, 1 hour expiry
- Refresh token: `krt_` prefix, 30 days expiry
- Stored as SHA-256 hash in database

**Deliverables 19.5:**

- [x] Create `apps/api/src/routes/oauth/token.ts`
- [x] Implement authorization_code grant with PKCE verification
- [x] Implement refresh_token grant with rotation
- [x] Implement token introspection endpoint (RFC 7662)
- [x] Implement token revocation endpoint (RFC 7009)
- [ ] Add token expiry and cleanup job (optional - tokens have expiry)

---

#### 19.6 MCP OAuth Middleware

**Goal:** Accept OAuth bearer tokens on `/mcp` endpoint.

**Current (Phase 18):**

```
Authorization: Bearer kb_xxxxx  (API key)
```

**Phase 19 (additional):**

```
Authorization: Bearer kat_xxxxx  (OAuth access token)
```

**Detection Logic:**

```typescript
const authHeader = request.headers.authorization;
const token = authHeader?.replace('Bearer ', '');

if (token?.startsWith('kb_')) {
  // API key auth (existing)
  return validateApiKey(token);
} else if (token?.startsWith('kat_')) {
  // OAuth access token (new)
  return validateOAuthToken(token);
} else {
  throw new UnauthorizedError('Invalid token format');
}
```

**OAuth Token Validation:**

1. Hash token with SHA-256
2. Lookup in OAuthToken table
3. Check not expired, not revoked
4. Get associated user and scopes
5. Return user context for tRPC caller

**Deliverables 19.6:**

- [x] Update `apps/api/src/routes/mcp.ts` auth middleware
- [x] Add OAuth token validation (authenticateOAuthToken function)
- [x] Support both API keys and OAuth tokens (unified authenticate function)
- [ ] Add scope enforcement per tool (future enhancement - scopes stored but not enforced)
- [x] Update rate limiting for OAuth tokens (separate rate limit keys: `mcp:key:` vs `mcp:oauth:`)

---

#### 19.7 Claude.ai Integration Testing

**Goal:** Verify OAuth flow works with Claude.ai.

**Test Checklist:**

| Step | Test                         | Expected Result                                              |
| ---- | ---------------------------- | ------------------------------------------------------------ |
| 1    | Claude.ai discovers metadata | Fetches `/.well-known/oauth-protected-resource` successfully |
| 2    | Claude.ai registers client   | Receives client_id via DCR                                   |
| 3    | User authorizes              | Redirected to consent screen, can approve                    |
| 4    | Token exchange               | Claude.ai receives access_token                              |
| 5    | MCP tools work               | Claude.ai can list/call tools on `/mcp`                      |
| 6    | Token refresh                | New access_token issued without re-auth                      |
| 7    | Token revocation             | User can disconnect Claude.ai from profile                   |

**Known Issue:** Claude.ai OAuth is reportedly broken since December 18, 2025 (GitHub Issue #5). Monitor for fixes.

**Deliverables 19.7:**

- [ ] Test with Claude.ai Custom Connector (blocked: OAuth reportedly broken since Dec 2025)
- [x] Document any workarounds needed (API key authentication workaround documented)
- [x] Add Claude.ai setup guide to docs (`docs/MCP/OAUTH-CONFIGURATION.md`)
- [x] Add troubleshooting section (comprehensive troubleshooting with 7 error scenarios)

---

#### 19.8 ChatGPT Integration Testing

**Goal:** Verify OAuth flow works with ChatGPT.

**ChatGPT Differences:**

- Uses OAuth 2.0 (not 2.1)
- Requires static client credentials (no DCR)
- State parameter is mandatory
- Different redirect URI pattern

**ChatGPT Configuration:**

```
Name: Kanbu
Auth Type: OAuth
Client ID: (static, from Kanbu admin)
Client Secret: (static, from Kanbu admin)
Authorization URL: https://app.kanbu.be/oauth/authorize
Token URL: https://app.kanbu.be/oauth/token
Scope: read write
```

**Static Client Creation:**
Add admin tool to create ChatGPT client:

```typescript
// In admin settings
{
  clientId: "chatgpt_kanbu_prod",
  clientSecret: "xxxxx",  // Hashed
  clientName: "ChatGPT",
  redirectUris: ["https://chat.openai.com/aip/plugin-xxxx/oauth/callback"],
  tokenEndpointAuthMethod: "client_secret_basic"
}
```

**Deliverables 19.8:**

- [x] Create static client management in admin (`apps/api/src/trpc/procedures/oauthClient.ts`)
- [ ] Test with ChatGPT Custom GPT (pending manual testing)
- [x] Document ChatGPT setup process
- [x] Add ChatGPT setup guide to docs (`docs/MCP/OAUTH-CONFIGURATION.md`)

---

#### 19.9 Multi-Instance Support

**Goal:** Each Kanbu deployment operates independently with unique OAuth configuration.

**Naming Convention:**

```
kanbu-prod      → app.kanbu.be
kanbu-dev       → dev.kanbu.be
kanbu-demo      → demo.kanbu.be
kanbu-local     → localhost:3001
kanbu-{custom}  → self-hosted instances
```

**Environment Variables:**

```env
# OAuth Configuration
OAUTH_ISSUER=https://app.kanbu.be
OAUTH_TOKEN_EXPIRY=3600
OAUTH_REFRESH_TOKEN_EXPIRY=2592000

# Claude.ai Integration
OAUTH_ALLOW_ANONYMOUS_DCR=true
OAUTH_ALLOWED_REDIRECT_PATTERNS=https://claude.ai/*,https://chat.openai.com/*

# ChatGPT Static Client (optional)
OAUTH_CHATGPT_CLIENT_ID=
OAUTH_CHATGPT_CLIENT_SECRET=
```

**Deliverables 19.9:**

- [x] Environment-based OAuth configuration (token.ts uses OAUTH_ACCESS_TOKEN_EXPIRY, OAUTH_REFRESH_TOKEN_EXPIRY)
- [x] Issuer URL from `APP_URL` or dedicated `OAUTH_ISSUER` env var (metadata.ts, register.ts)
- [x] Redirect URI pattern validation (`OAUTH_ALLOWED_REDIRECT_PATTERNS` in register.ts)
- [x] Documentation for self-hosted setup (`docs/MCP/OAUTH-CONFIGURATION.md`)
- [x] Updated `.env.example` with all OAuth variables

---

#### Phase 19 Summary

| Sub-phase | Description                   | Dependencies |
| --------- | ----------------------------- | ------------ |
| 19.1      | OAuth Database Schema         | None         |
| 19.2      | Metadata Endpoints            | 19.1         |
| 19.3      | Dynamic Client Registration   | 19.1, 19.2   |
| 19.4      | Authorization Endpoint        | 19.1, 19.3   |
| 19.5      | Token Endpoint                | 19.1, 19.4   |
| 19.6      | MCP OAuth Middleware          | 19.5         |
| 19.7      | Claude.ai Integration Testing | 19.1-19.6    |
| 19.8      | ChatGPT Integration Testing   | 19.1-19.6    |
| 19.9      | Multi-Instance Support        | 19.1-19.6    |

**Deliverables Phase 19:**

- [x] OAuth 2.1 database schema (3 tables)
- [x] RFC 8414 + RFC 9728 metadata endpoints
- [x] RFC 7591 Dynamic Client Registration
- [x] RFC 6749 + RFC 7636 authorization with PKCE
- [x] Token endpoint with refresh and introspection
- [x] MCP endpoint supporting OAuth tokens
- [ ] Claude.ai integration verified (pending - Claude.ai OAuth reportedly broken since Dec 2025)
- [ ] ChatGPT integration verified (pending)
- [x] Multi-instance deployment support
- [x] Self-hosted documentation

---

## Priority Matrix

| Item                 | Impact   | Effort | Priority |
| -------------------- | -------- | ------ | -------- |
| Setup code system    | Critical | Medium | P0       |
| Profile page UI      | Critical | Low    | P0       |
| `kanbu_connect`      | Critical | Low    | P0       |
| `kanbu_my_tasks`     | High     | Low    | P1       |
| `kanbu_create_task`  | High     | Low    | P1       |
| `kanbu_move_task`    | High     | Low    | P1       |
| `kanbu_search_tasks` | High     | Medium | P2       |
| `kanbu_add_comment`  | Medium   | Low    | P2       |

## Security Checklist

### Setup Code

- [x] Format: `KNB-XXXX-XXXX` (14 chars including hyphens)
- [x] Alphanumeric uppercase (no O/0/I/1 ambiguity)
- [x] TTL: 5 minutes
- [x] One-time use: consumed after exchange
- [x] Max 5 attempts per hour per user (planned)

### Permanent Token

- [x] 256-bit entropy
- [x] argon2 hash in database
- [x] Never shown to user
- [x] Only stored locally

### Machine Binding

- [x] Machine ID = SHA256(hostname + user)
- [x] Not portable to other machines
- [x] Revokable per machine

### Audit Trail

- [x] Pairing actions logged (ASSISTANT_PAIRED, ASSISTANT_DISCONNECTED)
- [x] Task/Project actions logged (Phase 14) ✅
- [x] Subtask/Comment actions logged (Phase 15) ✅
- [x] `via: assistant` metadata in logs (Phase 13-15) ✅
- [x] Machine identifier in logs
- [x] "Via Claude Code" indicator in UI (Phase 16)

## UI/UX Flow

### Generating Setup Code

```
1. User clicks "Generate Setup Code"
2. API generates: KNB-A3X9-7MK2
3. UI shows code with countdown
4. User tells code to Claude
5. Timer expires → code invalid
   OR code consumed → UI updates to connected
```

### Pairing

```
1. User: "Connect to Kanbu, code KNB-A3X9-7MK2"
2. Claude: kanbu_connect(code)
3. MCP → Kanbu API: exchangeSetupCode(code, machineId)
4. API: validate, consume, create binding, return token
5. MCP: store token locally
6. Claude: "Connected as Robin!"
```

### Disconnect

```
1. User clicks "Disconnect" in profile page
   OR
   User: "Disconnect from Kanbu"

2. API: set revokedAt on binding
3. MCP: remove local token file
4. UI: update to "not connected"
```

## Changelog

| Date       | Change                                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-01-19 | **Phase 19.7 DOCS COMPLETE** - Claude.ai Integration: comprehensive setup guide, OAuth flow diagram, 7 troubleshooting scenarios, API key workaround for known OAuth issue (testing blocked)   |
| 2026-01-19 | **Phase 19.8 DOCS COMPLETE** - ChatGPT Integration: tRPC admin procedures for static OAuth client management (oauthClient.ts), client_secret_basic/post support, ChatGPT setup documentation   |
| 2026-01-19 | **Phase 19.9 COMPLETE** - Multi-Instance Support: environment-based token expiry, OAUTH_ISSUER configuration, redirect URI patterns, comprehensive documentation (OAUTH-CONFIGURATION.md)      |
| 2026-01-19 | **Phase 19.6 COMPLETE** - MCP OAuth Middleware: unified authenticate() function supporting both `kb_` (API key) and `kat_` (OAuth token) prefixes, separate rate limiting per auth type        |
| 2026-01-19 | **Phase 19.1-19.5 COMPLETE** - OAuth 2.1 infrastructure: database schema, metadata endpoints (RFC 8414/9728), DCR (RFC 7591), authorization with PKCE (RFC 6749/7636), token endpoint          |
| 2026-01-19 | **Phase 19 ADDED** - OAuth 2.1 Authentication: 9 sub-phases for Claude.ai/ChatGPT integration, DCR, PKCE, metadata endpoints, multi-instance support                                           |
| 2026-01-19 | **Phase 18 COMPLETE** - Remote MCP Endpoint v2.0: ALL 157 tools via HTTP `/mcp` endpoint, JSON-RPC 2.0 + SSE, API key auth, full feature parity with local MCP server                          |
| 2026-01-16 | **Phase 17 ADDED** - Wiki Pages Management: 18 new tools planned (9 project wiki + 9 workspace wiki) for full CRUD, version control, hierarchical structure                                    |
| 2026-01-09 | **Phase 16 COMPLETE** - Audit UI Updates: new category filters (PROJECT, TASK, SUBTASK, COMMENT), "Via Claude Code" badge in audit logs table, machine details in detail view, MCP-only filter |
| 2026-01-09 | **Phase 13-15 COMPLETE** - MCP Audit Logging: infrastructure, task logging, subtask/comment logging - all MCP actions are now logged with `via: assistant` metadata                            |
| 2026-01-09 | **Phase 13-16 ADDED** - MCP Audit Logging roadmap: infrastructure, task/project/subtask/comment logging, UI updates                                                                            |
| 2026-01-09 | **Phase 12 COMPLETE** - 36 tools for profile management (info, 2FA, notifications, API tokens, sessions, hourly rate)                                                                          |
| 2026-01-09 | **ALL 12 PHASES COMPLETE!** - 131 MCP tools implemented across 12 phases                                                                                                                       |
| 2026-01-09 | **Phase 11 COMPLETE** - 12 tools for system settings & backup (settings, backup, admin workspaces)                                                                                             |
| 2026-01-09 | **Phase 10 COMPLETE** - 5 tools for audit logs (list, get, stats, export, categories)                                                                                                          |
| 2026-01-09 | **Phase 9 COMPLETE** - 5 tools for invite management (list, get, send, cancel, resend)                                                                                                         |
| 2026-01-09 | **Phase 8 COMPLETE** - 20 tools for ACL management (query, grant, deny, bulk, export, import, simulate)                                                                                        |
| 2026-01-09 | **Phase 7 COMPLETE** - 10 tools for groups management (list, create, members, etc.)                                                                                                            |
| 2026-01-09 | **Phase 6 COMPLETE** - 11 tools for user management (list, create, update, delete, etc.)                                                                                                       |
| 2026-01-09 | **ROADMAP UPDATE** - Phases 6-11 added (61 new tools planned, total 93)                                                                                                                        |
| 2026-01-09 | **Phase 5 COMPLETE** - 4 tools for analytics and insights                                                                                                                                      |
| 2026-01-09 | **Phase 4 COMPLETE** - 5 tools for search and activity queries                                                                                                                                 |
| 2026-01-09 | **Phase 3 COMPLETE** - 9 tools for subtask and comment management                                                                                                                              |
| 2026-01-09 | **Phase 2 COMPLETE** - 11 core tools for workspace/project/task management                                                                                                                     |
| 2026-01-09 | **Phase 1 COMPLETE** - MCP server with pairing tools working                                                                                                                                   |
| 2026-01-09 | Roadmap rewritten for one-time setup code pairing                                                                                                                                              |
| 2026-01-09 | Initial roadmap created                                                                                                                                                                        |
