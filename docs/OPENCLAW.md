# OpenClaw Integration Guide

This guide walks you through connecting Kanbu to your [OpenClaw](https://github.com/OpenClaw-AI/openclaw) gateway and dispatching your first task to an AI agent.

---

## What this gives you

- Open any task → **Agent tab** → select your agent → **Dispatch**
- The task title, description, project name, and workspace name are sent automatically as a structured prompt
- Add custom per-run instructions to steer the agent without editing the task
- Every run is logged: status, duration, and the agent's full response
- Dispatch again with new instructions — iterative control loop

---

## Requirements

- Kanbu running (Docker or manual — see [Quick Start](../README.md#quick-start))
- OpenClaw gateway running and reachable, with:
  - **Gateway URL** — e.g. `http://127.0.0.1:18789`
  - **Bearer token** — from your OpenClaw config

> **OpenClaw on a different machine?** If your OpenClaw gateway runs on another machine (common when using a dedicated AI workstation), use its [Tailscale](https://tailscale.com) IP instead of localhost. Example: `http://100.88.x.x:18789`

---

## Step 1: Configure Kanbu

### Docker

Add to `docker/.env`:

```env
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

Restart the stack:

```bash
docker compose -f docker-compose.selfhosted.yml restart api
```

### Manual

Add to `apps/api/.env`:

```env
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

Restart the API server.

---

## Step 2: Verify the connection

Open any task in Kanbu and click the **Agent** tab.

- If you see **"OpenClaw not configured"** → the env vars aren't set or the API hasn't restarted
- If you see **"No agents yet"** → connection works, you just need to create an agent (next step)

---

## Step 3: Create an agent

In the Agent tab, click **+ New agent** and fill in:

| Field              | Description                                     | Example                       |
| ------------------ | ----------------------------------------------- | ----------------------------- |
| **Name**           | Friendly name for this agent                    | `Developer`, `Reviewer`       |
| **Role**           | Optional role description (added to the prompt) | `Senior TypeScript developer` |
| **Workspace path** | Optional: path to the codebase on your machine  | `/home/you/myproject`         |

The agent is scoped to the project — it appears on every task in that project.

> **Tip:** Create one agent per "role" you want your OpenClaw instance to play. You can have multiple agents per project.

---

## Step 4: Dispatch a task

1. Open a task that has a clear title and description
2. Click the **Agent** tab
3. Select the agent you just created
4. Optionally add **custom instructions** to steer this specific run
5. Click **Dispatch**

Kanbu sends the following context to your OpenClaw gateway:

```
Task: [task title]
Description: [task description]

Project: [project name]
Workspace: [workspace name]

Agent role: [role if set]

[your custom instructions if any]
```

The dispatch returns immediately. The agent runs in the background.

---

## Step 5: Read the response

The run appears in the history below with a **Running** badge. When the agent finishes, the badge changes to **Completed** (or **Failed**).

Click any run to expand it and read the full agent response.

<img width="2852" height="1722" alt="Kanbu Agent Dispatch — completed run with response" src="https://github.com/user-attachments/assets/ea98dd79-2d19-46b8-b686-1040a9cdc5b4" />

---

## Step 6: Iterate

Read the response. Dispatch again with new instructions. This is the core loop:

```
Dispatch → read response → dispatch again with new instructions
```

Each run is independent — the agent always gets the full task context plus whatever custom instructions you add in that run.

---

## Tailscale setup (multi-machine)

If your OpenClaw gateway runs on a different machine than Kanbu:

1. Install [Tailscale](https://tailscale.com) on both machines
2. Find the Tailscale IP of your OpenClaw machine: `tailscale ip -4`
3. Set the gateway URL to the Tailscale IP:
   ```env
   OPENCLAW_GATEWAY_URL=http://100.88.x.x:18789
   ```

This works even if the machines are on different networks.

---

## Environment variables reference

| Variable                 | Required | Description                       |
| ------------------------ | -------- | --------------------------------- |
| `OPENCLAW_GATEWAY_URL`   | Yes      | Full URL of your OpenClaw gateway |
| `OPENCLAW_GATEWAY_TOKEN` | Yes      | Bearer token for authentication   |

Leave both empty to disable the Agent tab entirely (the tab shows a friendly "not configured" message instead of an error).

---

## Troubleshooting

| Problem                                            | Likely cause                          | Fix                                                                    |
| -------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| "OpenClaw not configured" in Agent tab             | Env vars missing or API not restarted | Set both vars and restart the API                                      |
| Run status stuck on "Running"                      | OpenClaw gateway unreachable          | Check gateway URL and that OpenClaw is running                         |
| Run status "Failed"                                | Token invalid or gateway error        | Check `OPENCLAW_GATEWAY_TOKEN` matches your OpenClaw config            |
| Agent tab missing entirely                         | Older API version still running       | Restart the API                                                        |
| Gateway reachable on localhost but not from Docker | Docker can't reach host network       | Use `host.docker.internal` instead of `127.0.0.1`, or use Tailscale IP |
