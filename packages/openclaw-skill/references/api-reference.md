# Kanbu tRPC API Reference

All procedures are called via `kanbu.sh <procedure> '<json-input>'`.
Queries use GET, mutations use POST (auto-detected by the script).

## Table of Contents
- [Projects](#projects)
- [Tasks](#tasks)
- [Subtasks](#subtasks)
- [Comments](#comments)
- [Search](#search)
- [Activity](#activity)
- [Analytics](#analytics)
- [Wiki](#wiki)
- [Workspaces](#workspaces)
- [Groups](#groups)
- [ACL (Permissions)](#acl)
- [GitHub](#github)
- [Admin](#admin)
- [User Profile](#user-profile)
- [Audit](#audit)
- [System](#system)

---

## Projects

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `project.list` | GET | `{"workspaceId": N}` | List all projects |
| `project.get` | GET | `{"projectId": N, "workspaceId": N}` | Get project details |
| `project.create` | POST | `{"name": "...", "identifier": "...", "workspaceId": N}` | Create project |

## Tasks

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `task.list` | GET | `{"projectId": N, "workspaceId": N}` | List tasks in project |
| `task.get` | GET | `{"taskId": N, "workspaceId": N}` | Get task details (includes description, comments, subtasks) |
| `task.create` | POST | `{"projectId": N, "title": "...", "workspaceId": N}` | Create task |
| `task.update` | POST | `{"taskId": N, "workspaceId": N, ...fields}` | Update task (title, description, priority, columnId, assignees, etc.) |
| `task.move` | POST | `{"taskId": N, "columnId": N, "workspaceId": N}` | Move task to column |
| `task.getAssignedToMe` | GET | `{"workspaceId": N}` | Get my assigned tasks |

### Task fields for create/update
- `title` (string) — Task title
- `description` (string) — Markdown description
- `priority` (number) — 0=none, 1=low, 2=medium, 3=high, 4=urgent
- `columnId` (number) — Board column to place task in
- `assignees` (number[]) — Array of user IDs to assign
- `dateDue` (string) — ISO date string
- `timeEstimated` (number) — Hours estimated
- `tags` (number[]) — Array of tag IDs

## Subtasks

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `subtask.list` | GET | `{"taskId": N, "workspaceId": N}` | List subtasks |
| `subtask.create` | POST | `{"taskId": N, "title": "...", "workspaceId": N}` | Create subtask |
| `subtask.update` | POST | `{"subtaskId": N, "workspaceId": N, ...}` | Update subtask |
| `subtask.toggle` | POST | `{"subtaskId": N, "workspaceId": N}` | Toggle done/undone |
| `subtask.delete` | POST | `{"subtaskId": N, "workspaceId": N}` | Delete subtask |

## Comments

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `comment.list` | GET | `{"taskId": N, "workspaceId": N}` | List comments |
| `comment.create` | POST | `{"taskId": N, "content": "...", "workspaceId": N}` | Add comment |
| `comment.update` | POST | `{"commentId": N, "content": "...", "workspaceId": N}` | Edit comment |
| `comment.delete` | POST | `{"commentId": N, "workspaceId": N}` | Delete comment |

## Search

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `search.tasks` | GET | `{"query": "...", "projectId": N, "workspaceId": N}` | Search tasks |
| `search.global` | GET | `{"query": "...", "workspaceId": N}` | Search across all entities |

## Activity

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `activity.getRecent` | GET | `{"workspaceId": N}` | Recent workspace activity |
| `activity.forTask` | GET | `{"taskId": N, "workspaceId": N}` | Task activity log |
| `activity.getStats` | GET | `{"workspaceId": N}` | Activity statistics |

## Analytics

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `analytics.getProjectStats` | GET | `{"projectId": N, "workspaceId": N}` | Project statistics |
| `analytics.getVelocity` | GET | `{"projectId": N, "workspaceId": N}` | Sprint velocity |
| `analytics.getCycleTime` | GET | `{"projectId": N, "workspaceId": N}` | Task cycle times |
| `analytics.getTeamWorkload` | GET | `{"projectId": N, "workspaceId": N}` | Team workload |

## Wiki

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `wiki.listProjectPages` | GET | `{"projectId": N, "workspaceId": N}` | List project wiki pages |
| `wiki.getProjectPage` | GET | `{"pageId": N, "workspaceId": N}` | Get wiki page |
| `wiki.getProjectPageBySlug` | GET | `{"slug": "...", "projectId": N, "workspaceId": N}` | Get page by slug |
| `wiki.createProjectPage` | POST | `{"projectId": N, "title": "...", "content": "...", "workspaceId": N}` | Create page |
| `wiki.updateProjectPage` | POST | `{"pageId": N, "workspaceId": N, ...}` | Update page |
| `wiki.deleteProjectPage` | POST | `{"pageId": N, "workspaceId": N}` | Delete page |
| `wiki.listWorkspacePages` | GET | `{"workspaceId": N}` | List workspace wiki pages |
| `wiki.getWorkspacePage` | GET | `{"pageId": N, "workspaceId": N}` | Get workspace wiki page |
| `wiki.createWorkspacePage` | POST | `{"title": "...", "content": "...", "workspaceId": N}` | Create workspace page |
| `wiki.updateWorkspacePage` | POST | `{"pageId": N, "workspaceId": N, ...}` | Update workspace page |
| `wiki.deleteWorkspacePage` | POST | `{"pageId": N, "workspaceId": N}` | Delete workspace page |
| `wiki.getProjectVersions` | GET | `{"pageId": N, "workspaceId": N}` | Page version history |
| `wiki.restoreProjectVersion` | POST | `{"pageId": N, "versionId": N, "workspaceId": N}` | Restore version |

## Workspaces

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `workspace.list` | GET | (none) | List workspaces |
| `workspace.get` | GET | `{"workspaceId": N}` | Get workspace details |

## Groups

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `group.list` | GET | `{"workspaceId": N}` | List groups |
| `group.get` | GET | `{"groupId": N, "workspaceId": N}` | Get group |
| `group.create` | POST | `{"name": "...", "workspaceId": N}` | Create group |
| `group.update` | POST | `{"groupId": N, "workspaceId": N, ...}` | Update group |
| `group.delete` | POST | `{"groupId": N, "workspaceId": N}` | Delete group |
| `group.listMembers` | GET | `{"groupId": N, "workspaceId": N}` | List members |
| `group.addMember` | POST | `{"groupId": N, "userId": N, "workspaceId": N}` | Add member |
| `group.removeMember` | POST | `{"groupId": N, "userId": N, "workspaceId": N}` | Remove member |
| `group.myGroups` | GET | `{"workspaceId": N}` | My group memberships |
| `group.createSecurityGroup` | POST | `{"name": "...", "workspaceId": N}` | Create security group |

## ACL

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `acl.list` | GET | `{"resourceType": "...", "resourceId": N, "workspaceId": N}` | List ACL entries |
| `acl.grant` | POST | `{...}` | Grant permission |
| `acl.revoke` | POST | `{...}` | Revoke permission |
| `acl.deny` | POST | `{...}` | Deny permission |
| `acl.checkPermission` | GET | `{...}` | Check if user has permission |
| `acl.calculateEffective` | GET | `{...}` | Calculate effective permissions |
| `acl.getPermissionMatrix` | GET | `{...}` | Full permission matrix |
| `acl.myPermission` | GET | `{...}` | My permissions on resource |

See MCP server source `tools/acl.ts` for full ACL input schemas.

## GitHub

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `github.getLinkedRepository` | GET | `{"projectId": N, "workspaceId": N}` | Get linked repo |
| `github.linkRepository` | POST | `{...}` | Link GitHub repo |
| `github.unlinkRepository` | POST | `{...}` | Unlink repo |
| `github.importIssues` | POST | `{"projectId": N, "workspaceId": N}` | Sync GitHub issues |
| `github.listProjectCommits` | GET | `{"projectId": N, "workspaceId": N}` | List commits |
| `github.listProjectPRs` | GET | `{"projectId": N, "workspaceId": N}` | List PRs |
| `github.createBranch` | POST | `{"taskId": N, "workspaceId": N}` | Create branch for task |
| `github.getTaskCommits` | GET | `{"taskId": N, "workspaceId": N}` | Task commits |
| `github.getTaskPRs` | GET | `{"taskId": N, "workspaceId": N}` | Task PRs |
| `github.linkPRToTask` | POST | `{"taskId": N, "prNumber": N, "workspaceId": N}` | Link PR to task |

## Admin

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `admin.listUsers` | GET | `{"workspaceId": N}` | List all users |
| `admin.getUser` | GET | `{"userId": N}` | Get user details |
| `admin.createUser` | POST | `{"username": "...", "name": "...", "email": "...", "password": "..."}` | Create user |
| `admin.updateUser` | POST | `{"userId": N, ...}` | Update user |
| `admin.deleteUser` | POST | `{"userId": N}` | Delete user |
| `admin.reactivateUser` | POST | `{"userId": N}` | Reactivate user |
| `admin.resetPassword` | POST | `{"userId": N}` | Reset password |
| `admin.unlockUser` | POST | `{"userId": N}` | Unlock user |
| `admin.revokeSessions` | POST | `{"userId": N}` | Revoke all sessions |

## User Profile

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `user.getProfile` | GET | (none) | Get own profile |
| `user.updateProfile` | POST | `{"name": "...", ...}` | Update profile |
| `user.getSessions` | GET | (none) | List active sessions |
| `user.getTimeTracking` | GET | `{"workspaceId": N}` | Time tracking data |

## Audit

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `audit.list` | GET | `{"workspaceId": N}` | List audit logs |
| `audit.getStats` | GET | `{"workspaceId": N}` | Audit statistics |
| `audit.export` | GET | `{"workspaceId": N}` | Export audit logs |

## System

| Procedure | Method | Input | Description |
|-----------|--------|-------|-------------|
| `admin.createBackup` | POST | `{"workspaceId": N}` | Create database backup |
| `admin.createSourceBackup` | POST | `{"workspaceId": N}` | Create source backup |
| `admin.getSetting` | GET | `{"key": "..."}` | Get system setting |
| `admin.setSetting` | POST | `{"key": "...", "value": "..."}` | Set system setting |
| `admin.getSettings` | GET | (none) | Get all settings |
