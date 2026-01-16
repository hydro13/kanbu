# Kanbu MCP Server - Claude Code Integration

> **Status: PRODUCTION READY (Hardened)** (2026-01-16)
>
> The MCP server is fully functional, tested, and hardened for production use.
> **[📘 Read the User Guide](./USER_GUIDE.md)** for usage instructions.

## Overview

The Kanbu MCP Server is specifically designed for **Claude Code** integration. It provides a secure, resilient bridge between your AI agent and the Kanbu project management system.

**Recent Hardening Updates:**
*   **Resilience**: Automatic retry for transient network failures.
*   **Safety**: `dryRun` simulation for destructive ACL actions.
*   **Semantics**: Enhanced tool descriptions for better AI context.
*   **Reliability**: Comprehensive test suite ensuring stability.

## Pairing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PAIRING FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Generate Setup Code (Kanbu Profile Page)                   │
│  ─────────────────────────────────────────────                      │
│     ┌─────────────────────────────────┐                             │
│     │ 🔗 Connect Claude Code          │                             │
│     │                                  │                             │
│     │ Your setup code:                │                             │
│     │ ┌─────────────────────────────┐ │                             │
│     │ │   KNB-A3X9-7MK2             │ │  ← One-time, 5 min TTL     │
│     │ └─────────────────────────────┘ │                             │
│     │ ⏱️ Expires in: 4:32             │                             │
│     │                                  │                             │
│     │ Tell Claude Code:               │                             │
│     │ "Connect to Kanbu with code     │                             │
│     │  KNB-A3X9-7MK2"                 │                             │
│     └─────────────────────────────────┘                             │
│                                                                      │
│  STEP 2: Tell Claude the Code                                       │
│  ─────────────────────────────────────                              │
│     User: "Connect to Kanbu, code KNB-A3X9-7MK2"                    │
│                                                                      │
│     Claude: Connecting to Kanbu...                                  │
│             [exchangeSetupCode] ──────────► Kanbu API               │
│                                             ├─ Validate code        │
│             ✓ Connected as Robin!           ├─ Mark consumed        │
│               You have Domain Admin rights. └─ Return token         │
│                                                                      │
│  STEP 3: Permanently Connected                                      │
│  ─────────────────────────────────────                              │
│     • Token stored on this machine                                  │
│     • Setup code is consumed (cannot be reused)                     │
│     • Claude can now work on your behalf                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## How It Works

### Architecture

```
                    Setup Code (one-time)
                           │
┌─────────────────┐        │        ┌─────────────────┐
│  Kanbu Web UI   │────────┼───────▶│  User tells     │
│  Profile Page   │        │        │  Claude Code    │
└─────────────────┘        │        └────────┬────────┘
                           │                 │
                           │                 ▼
                           │        ┌─────────────────┐
                           │        │  Claude Code    │
                           │        │  MCP Server     │
                           │        └────────┬────────┘
                           │                 │
                           │  exchangeSetupCode(code)
                           │                 │
                           ▼                 ▼
                    ┌─────────────────────────────────┐
                    │         Kanbu API               │
                    ├─────────────────────────────────┤
                    │  1. Validate setup code         │
                    │  2. Check not expired (<5 min)  │
                    │  3. Check not consumed          │
                    │  4. Mark as consumed            │
                    │  5. Generate permanent token    │
                    │  6. Create AssistantBinding     │
                    │  7. Return token to MCP         │
                    └─────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │  Permanent Token stored locally │
                    │  ~/.config/kanbu/mcp.json       │
                    └─────────────────────────────────┘
```

### Security Model

| Aspect | Setup Code | Permanent Token |
|--------|------------|-----------------|
| **Visible to user** | Yes (in UI) | No (only locally) |
| **Lifetime** | 5 minutes | Permanent (until revoke) |
| **Usage** | One-time | Unlimited |
| **Format** | `KNB-XXXX-XXXX` | `ast_xxxxxx...` (256-bit) |
| **Storage** | Database | Local file |

## User Interface

### Profile Page - AI Assistant Section

**Not connected:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Assistant                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Connect Claude Code to manage projects on your behalf.      │
│ Claude will inherit your permissions within Kanbu.          │
│                                                              │
│ Status: ○ Not connected                                      │
│                                                              │
│ [Generate Setup Code]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Setup code generated:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Assistant                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Your setup code:                                             │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          KNB-A3X9-7MK2                              │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ⏱️ Expires in: 4:32                                        │
│                                                              │
│ Tell Claude Code:                                            │
│ "Connect to Kanbu with code KNB-A3X9-7MK2"                  │
│                                                              │
│ [Copy Code]  [Cancel]                                        │
│                                                              │
│ ⚠️ This code can only be used once and expires in 5 minutes │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Connected:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Assistant                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Status: ● Connected                                          │
│ Connected since: 2026-01-09 14:32                           │
│ Last used: 2 minutes ago                                    │
│ Machine: your-machine (Linux)                                │
│                                                              │
│ Your permissions Claude inherits:                            │
│ • Domain Admin (full access)                                │
│ • 3 Workspaces                                              │
│ • 12 Projects                                               │
│                                                              │
│ [Disconnect]                                                 │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Connect another machine?                                     │
│ [Generate New Setup Code]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Claude Code Commands

### First Time Connection

```
User: Connect to Kanbu, my code is KNB-A3X9-7MK2

Claude: Connecting to Kanbu...

✓ Connected!
  User: Robin Waslander
  Role: Domain Admin
  Workspaces: 3
  Projects: 12

You can now ask questions like:
• "What are my tasks?"
• "Create a task in project X"
• "Move task KANBU-42 to Done"
```

### Already Connected

```
User: What are my open tasks?

Claude: [kanbu_my_tasks]

You have 4 open tasks:
1. KANBU-142: Implement MCP server (IN_PROGRESS)
2. KANBU-138: Fix login redirect bug (TODO)
3. KANBU-135: Update documentation (TODO)
4. KANBU-130: Code review PR #42 (IN_REVIEW)
```

## Permission Inheritance

Claude automatically inherits your ACL permissions:

| Your Role | Claude Can |
|----------|------------|
| Domain Admin | Everything: manage workspaces, projects, users |
| Workspace Admin | Manage projects in that workspace |
| Project Manager | Manage tasks in that project |
| Project Member | Read/edit tasks you have access to |
| Viewer | Only read |

When your permissions change, Claude's automatically change as well.

## Available Tools

### Phase 1 - Pairing Tools (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_connect` | Connect with setup code | ✅ Working |
| `kanbu_whoami` | Show connected user and permissions | ✅ Working |
| `kanbu_disconnect` | Disconnect | ✅ Working |

### Phase 2 - Core Tools (✅ Implemented)

| Tool | Description | Required Permission | Status |
|------|--------------|-------------------|--------|
| `kanbu_list_workspaces` | List accessible workspaces | R on workspace | ✅ Working |
| `kanbu_get_workspace` | Workspace details with projects | R on workspace | ✅ Working |
| `kanbu_list_projects` | List projects in workspace | R on project | ✅ Working |
| `kanbu_get_project` | Project details with columns | R on project | ✅ Working |
| `kanbu_create_project` | Create new project | W on workspace | ✅ Working |
| `kanbu_list_tasks` | Tasks in project with filters | R on project | ✅ Working |
| `kanbu_get_task` | Task details with subtasks/comments | R on task | ✅ Working |
| `kanbu_create_task` | Create new task | W on project | ✅ Working |
| `kanbu_update_task` | Edit task | W on task | ✅ Working |
| `kanbu_move_task` | Change status/column | W on task | ✅ Working |
| `kanbu_my_tasks` | Your assigned tasks | - (own tasks) | ✅ Working |

### Phase 3 - Subtask & Comment Tools (✅ Implemented)

| Tool | Description | Required Permission | Status |
|------|--------------|-------------------|--------|
| `kanbu_list_subtasks` | List subtasks for a task | R on project | ✅ Working |
| `kanbu_create_subtask` | Create new subtask | W on project | ✅ Working |
| `kanbu_update_subtask` | Edit subtask properties | W on project | ✅ Working |
| `kanbu_toggle_subtask` | Toggle TODO/DONE status | W on project | ✅ Working |
| `kanbu_delete_subtask` | Delete subtask | W on project | ✅ Working |
| `kanbu_list_comments` | Comments on a task | R on project | ✅ Working |
| `kanbu_add_comment` | Add comment | W on project | ✅ Working |
| `kanbu_update_comment` | Edit own comment | W on project | ✅ Working |
| `kanbu_delete_comment` | Delete comment | W on project | ✅ Working |

### Phase 4 - Search & Activity Tools (✅ Implemented)

| Tool | Description | Required Permission | Status |
|------|--------------|-------------------|--------|
| `kanbu_search_tasks` | Full-text search in tasks | R on project | ✅ Working |
| `kanbu_search_global` | Search in tasks, comments, wiki | R on project | ✅ Working |
| `kanbu_recent_activity` | Recent project activity | R on project | ✅ Working |
| `kanbu_task_activity` | Activity history for a task | R on project | ✅ Working |
| `kanbu_activity_stats` | Activity statistics (30 days) | R on project | ✅ Working |

### Phase 5 - Analytics & Insights Tools (✅ Implemented)

| Tool | Description | Required Permission | Status |
|------|--------------|-------------------|--------|
| `kanbu_project_stats` | Project statistics, completion rate, trends | R on project | ✅ Working |
| `kanbu_velocity` | Team velocity per week, rolling average | R on project | ✅ Working |
| `kanbu_cycle_time` | Cycle time per column, bottleneck detection | R on project | ✅ Working |
| `kanbu_team_workload` | Workload per team member, overdue counts | R on project | ✅ Working |

### Phase 6 - User Management (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_list_users` | List all users | ✅ Working |
| `kanbu_get_user` | Get user details | ✅ Working |
| `kanbu_create_user` | Create new user | ✅ Working |
| `kanbu_update_user` | Update user data | ✅ Working |
| `kanbu_delete_user` | Deactivate user | ✅ Working |
| `kanbu_reactivate_user` | Reactivate user | ✅ Working |
| `kanbu_reset_password` | Reset password | ✅ Working |
| `kanbu_unlock_user` | Unlock blocked user | ✅ Working |
| `kanbu_disable_2fa` | Disable 2FA for user | ✅ Working |
| `kanbu_revoke_sessions` | Kill user sessions | ✅ Working |

### Phase 7 - Groups (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_list_groups` | List groups | ✅ Working |
| `kanbu_get_group` | Group details | ✅ Working |
| `kanbu_create_group` | Create group | ✅ Working |
| `kanbu_update_group` | Update group | ✅ Working |
| `kanbu_delete_group` | Delete group | ✅ Working |
| `kanbu_add_group_member` | Add member | ✅ Working |
| `kanbu_remove_group_member` | Remove member | ✅ Working |

### Phase 8 - ACL Management (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_list_acl` | List permissions | ✅ Working |
| `kanbu_check_permission` | Check access | ✅ Working |
| `kanbu_grant_permission` | Grant access | ✅ Working |
| `kanbu_revoke_permission` | Revoke access | ✅ Working |
| `kanbu_delete_acl` | Delete entry | ✅ Working |
| `kanbu_bulk_grant` | Bulk grant | ✅ Working |
| `kanbu_bulk_revoke` | Bulk revoke | ✅ Working |
| `kanbu_copy_permissions` | Copy ACLs | ✅ Working |
| `kanbu_simulate_change` | Dry run check | ✅ Working |

### Phase 9 - Invites (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_list_invites` | List invites | ✅ Working |
| `kanbu_send_invite` | Send invite | ✅ Working |
| `kanbu_cancel_invite` | Cancel invite | ✅ Working |

### Phase 10 - Audit Logs (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_list_audit_logs` | Query logs | ✅ Working |
| `kanbu_get_audit_log` | Log details | ✅ Working |
| `kanbu_audit_stats` | Statistics | ✅ Working |

### Phase 11 - System & Backup (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_get_settings` | System settings | ✅ Working |
| `kanbu_set_setting` | Update setting | ✅ Working |
| `kanbu_create_db_backup` | Backup DB | ✅ Working |
| `kanbu_create_source_backup` | Backup Code | ✅ Working |

### Phase 12 - Profile (✅ Implemented)

| Tool | Description | Status |
|------|--------------|--------|
| `kanbu_get_profile` | My profile | ✅ Working |
| `kanbu_update_profile` | Update profile | ✅ Working |
| `kanbu_get_time_tracking` | My time logs | ✅ Working |
| `kanbu_change_password` | Change password | ✅ Working |


## Audit Logging

All actions via Claude Code are logged:

```
[2026-01-09 14:45:23] Task #42 updated
  User: Robin Waslander
  Via: Claude Code (MCP)
  Machine: your-machine
  Action: status changed TODO → IN_PROGRESS
```

In the UI: **Robin (via Claude)** moved task to In Progress

## Security

### Setup Code Security

- Format: `KNB-XXXX-XXXX` (12 alphanumeric characters)
- **One-time use**: Unusable after consumption
- **5 minute TTL**: Expires automatically
- **Not sensitive**: Can be safely shared verbally

### Permanent Token Security

- 256-bit random, cryptographically secure
- Hashed storage in database (argon2)
- Never visible to user
- Only stored on the machine that connected
- Machine-specific binding

### Rate Limiting

- Max 100 requests per minute per binding
- Burst: 20 requests per second
- Setup code attempts: max 5 per hour per user

### Token Revocation

- "Disconnect" in profile page removes binding
- Admin can revoke user bindings
- Automatic revocation on suspicious activity

## Multi-Machine Support

A user can connect Claude Code on multiple machines:

```
┌─────────────────────────────────────────────────────────────┐
│ Connected Machines                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ● MAX (Linux) - Connected 2026-01-09, last used: now        │
│   [Disconnect]                                               │
│                                                              │
│ ● MacBook Pro - Connected 2026-01-08, last used: yesterday  │
│   [Disconnect]                                               │
│                                                              │
│ [Generate Setup Code for New Machine]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### From Source

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

### Add to Claude Code

**Via Claude CLI (recommended):**

```bash
# Install Claude CLI if needed
npm install -g @anthropic-ai/claude-code

# Add Kanbu MCP server
claude mcp add kanbu -- node /path/to/kanbu/packages/mcp-server/dist/index.js

# Verify
claude mcp list
```

**Manual (settings.local.json):**

```json
{
  "mcpServers": {
    "kanbu": {
      "command": "node",
      "args": ["/path/to/kanbu/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### NPM Package (future)

```bash
npm install -g @kanbu/mcp-server
```

## Configuration

The MCP server configuration is automatically generated during pairing.

After successful connection, `~/.config/kanbu/mcp.json` contains:

```json
{
  "kanbuUrl": "http://localhost:3001",
  "token": "ast_xxxxxxxxxxxxxx",
  "machineId": "hash-of-machine-id",
  "userId": 1,
  "userName": "Robin Waslander",
  "userEmail": "robin@example.com",
  "connectedAt": "2026-01-09T14:32:00Z"
}
```

## Example Session

```
User: I want to connect Claude Code with Kanbu

Claude: To connect, I need a setup code.
        Go to your Kanbu profile page → AI Assistant section
        and click on "Generate Setup Code".

        Then give me the code (e.g., KNB-XXXX-XXXX).

User: The code is KNB-A3X9-7MK2

Claude: [kanbu_connect code="KNB-A3X9-7MK2"]

✓ Connected to Kanbu!

  User: Robin Waslander (robin@example.com)
  Role: Domain Admin

  You can now:
  • "What are my tasks?" - View your assigned tasks
  • "Create task X in project Y" - Create new task
  • "Move KANBU-42 to Done" - Change status

User: What are my tasks?

Claude: [kanbu_my_tasks]

You have 4 open tasks:

| Ref | Title | Status | Project |
|-----|-------|--------|---------|
| KANBU-142 | Implement MCP server | IN_PROGRESS | Kanbu Dev |
| KANBU-138 | Fix login redirect bug | TODO | Kanbu Dev |
| KANBU-135 | Update documentation | TODO | Kanbu Dev |
| KANBU-130 | Code review PR #42 | IN_REVIEW | Kanbu Dev |

User: Move KANBU-138 to In Progress

Claude: [kanbu_move_task taskId=138 status="IN_PROGRESS"]

✓ KANBU-138 "Fix login redirect bug" is now In Progress.
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for implementation planning.

## Technical Design

See [PLAN.md](./PLAN.md) for technical architecture.

## Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Kanbu ACL Documentation](../ACL/README.md)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
