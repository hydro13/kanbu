---
name: kanbu
description: Manage projects, tasks, wikis, and teams in Kanbu — a self-hosted project management platform built for AI agents. Use when the user asks about project management, task tracking, kanban boards, sprints, wikis, team workload, or anything related to Kanbu. Also triggers on task creation, updates, comments, subtasks, search, analytics, GitHub integration, permissions (ACL), and audit logs.
---

# Kanbu Skill for OpenClaw

Kanbu is a self-hosted, agent-native project management platform. This skill gives you full read/write access to Kanbu via its tRPC API.

## Setup

### 1. Install Kanbu MCP server (includes pairing CLI)

```bash
cd /path/to/kanbu && pnpm install
```

### 2. Pair with your Kanbu instance

```bash
node packages/mcp-server/dist/index.js
```

On first run, the MCP server starts the pairing flow:
1. It displays a **setup code** (6 characters)
2. Go to your Kanbu instance → Settings → AI Assistants → Enter the code
3. The server exchanges the code for a permanent token stored in `~/.config/kanbu/mcp.json`

### 3. Verify

```bash
scripts/kanbu.sh workspace.list
```

## Usage

All Kanbu operations go through the `kanbu.sh` wrapper script:

```bash
scripts/kanbu.sh <procedure> '<json-input>'
```

The script auto-detects GET (queries) vs POST (mutations) and handles auth from `~/.config/kanbu/mcp.json`.

### Common operations

**List projects:**
```bash
scripts/kanbu.sh project.list '{"workspaceId": 534}'
```

**List tasks in a project:**
```bash
scripts/kanbu.sh task.list '{"projectId": 314, "workspaceId": 534}'
```

**Get task details:**
```bash
scripts/kanbu.sh task.get '{"taskId": 307, "workspaceId": 534}'
```

**Create a task:**
```bash
scripts/kanbu.sh task.create '{"projectId": 314, "title": "Implement feature X", "description": "Details here", "priority": 2, "workspaceId": 534}'
```

**Update a task:**
```bash
scripts/kanbu.sh task.update '{"taskId": 307, "title": "Updated title", "workspaceId": 534}'
```

**Move task to a column:**
```bash
scripts/kanbu.sh task.move '{"taskId": 307, "columnId": 68, "workspaceId": 534}'
```

**Add a comment:**
```bash
scripts/kanbu.sh comment.create '{"taskId": 307, "content": "Work done.", "workspaceId": 534}'
```

**Search tasks:**
```bash
scripts/kanbu.sh search.tasks '{"query": "bug", "projectId": 314, "workspaceId": 534}'
```

**My assigned tasks:**
```bash
scripts/kanbu.sh task.getAssignedToMe '{"workspaceId": 534}'
```

### Discovering workspaceId and projectId

Always start by listing workspaces, then projects:

```bash
scripts/kanbu.sh workspace.list
scripts/kanbu.sh project.list '{"workspaceId": <id>}'
```

Use the returned IDs in all subsequent calls. Most procedures require `workspaceId`.

### Priority values
- 0 = None
- 1 = Low
- 2 = Medium
- 3 = High
- 4 = Urgent

## Full API Reference

For all 100+ procedures (wiki, analytics, ACL, GitHub, admin, audit, groups, etc.), read [references/api-reference.md](references/api-reference.md).

## Tips

- **workspaceId is required** on almost every call
- Task identifiers (e.g., `PROJTEMP-34`) are for display; use numeric `taskId` for API calls
- The script outputs `result.data` directly as JSON — pipe to `jq` for filtering
- Errors are printed with full detail for debugging
- For self-signed certs (local dev), the script uses `curl -k`
