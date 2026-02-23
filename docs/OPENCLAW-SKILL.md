# Kanbu OpenClaw Skill — Setup Guide

Give your OpenClaw agent full access to Kanbu. Create tasks, move cards, add comments, search, run analytics, manage wikis — all through natural conversation.

## Prerequisites

- A running [Kanbu](https://github.com/hydro13/kanbu) instance (local or remote)
- [OpenClaw](https://github.com/OpenClaw-AI/openclaw) installed and running
- `curl` and `jq` available on your system

## Step 1: Install the Skill

```bash
# From the Kanbu repo root
cp -r packages/openclaw-skill ~/.openclaw/workspace/skills/kanbu

# Make the wrapper script executable
chmod +x ~/.openclaw/workspace/skills/kanbu/scripts/kanbu.sh
```

## Step 2: Pair with your Kanbu instance

The skill needs an API token to authenticate. Kanbu uses a secure pairing flow — similar to pairing a Bluetooth device.

### Option A: Use the MCP server pairing (recommended)

```bash
# Set your Kanbu URL
export KANBU_URL=https://localhost:3001  # or https://your-kanbu-domain.com

# For self-signed certs (local dev)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Run the MCP server — it will start the pairing flow
node packages/mcp-server/dist/index.js
```

The server displays a **6-character setup code**. Enter it in Kanbu:

1. Open your Kanbu instance in a browser
2. Go to **Settings → AI Assistants**
3. Click **"Pair New Assistant"**
4. Enter the setup code

The token is saved to `~/.config/kanbu/mcp.json`. The skill reads this file automatically.

### Option B: Use an existing API token

If you already have a Kanbu API token (from Settings → API Tokens), set it directly:

```bash
mkdir -p ~/.config/kanbu
cat > ~/.config/kanbu/mcp.json << 'EOF'
{
  "kanbuUrl": "https://your-kanbu-url",
  "token": "your-api-token-here"
}
EOF
```

## Step 3: Restart OpenClaw

```bash
openclaw gateway restart
```

## Step 4: Verify

Talk to your OpenClaw agent:

> "List my Kanbu workspaces"

or

> "Show me all tasks in the Kanbu project"

Your agent will use the Kanbu skill automatically when it recognizes project management requests.

## What Your Agent Can Do

Once connected, your OpenClaw agent has access to **100+ Kanbu API procedures**:

| Category      | Examples                                                  |
| ------------- | --------------------------------------------------------- |
| **Projects**  | List, create, get project details                         |
| **Tasks**     | Create, update, move, assign, search, get my tasks        |
| **Subtasks**  | Create, update, toggle, delete                            |
| **Comments**  | Add, edit, delete comments on tasks                       |
| **Search**    | Search tasks, global search across all entities           |
| **Analytics** | Project stats, velocity, cycle time, team workload        |
| **Wiki**      | Create/edit/delete project and workspace wiki pages       |
| **GitHub**    | List commits, PRs, create branches, link PRs to tasks     |
| **ACL**       | Grant/revoke permissions, check access, permission matrix |
| **Admin**     | User management, backups, system settings                 |
| **Audit**     | View audit logs, export, statistics                       |

## How It Works

The skill uses a lightweight bash wrapper (`scripts/kanbu.sh`) that calls Kanbu's tRPC API directly:

```
Your message → OpenClaw agent → reads SKILL.md → runs kanbu.sh → Kanbu API → result
```

- **No separate server** to run — it's just curl calls
- **Auth** is read from `~/.config/kanbu/mcp.json`
- **Queries** (list, get, search) use GET
- **Mutations** (create, update, delete) use POST
- Auto-detected by the script based on procedure name

## Configuration

### Environment variables (optional)

Override the config file with environment variables:

```bash
export KANBU_URL=https://your-kanbu-url
export KANBU_TOKEN=your-token
```

### Custom config path

```bash
export KANBU_CONFIG=/path/to/your/config.json
```

### Multiple instances

To connect to multiple Kanbu instances, use environment variables per call or maintain separate config files.

## Troubleshooting

### "No config found"

Run the pairing flow (Step 2) or create `~/.config/kanbu/mcp.json` manually.

### Connection refused

Check that your Kanbu instance is running:

```bash
curl -sk https://localhost:3001/api/health
```

### Self-signed certificate errors

For local development with self-signed certs, the script uses `curl -k` by default.

### Permission denied

Your paired token inherits the permissions of the Kanbu user who approved the pairing. Make sure that user has the necessary project access.

## Upgrading

When Kanbu releases a new version with skill updates:

```bash
cd /path/to/kanbu && git pull
cp -r packages/openclaw-skill ~/.openclaw/workspace/skills/kanbu
openclaw gateway restart
```

## Uninstall

```bash
rm -rf ~/.openclaw/workspace/skills/kanbu
openclaw gateway restart
```

---

**Questions?** Open an [issue](https://github.com/hydro13/kanbu/issues) or join our [Discord](https://discord.gg/cCpHUvX4CF).
