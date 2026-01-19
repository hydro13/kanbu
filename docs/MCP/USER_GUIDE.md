# Kanbu AI Assistant - User Guide

Welcome to the **Kanbu AI Assistant**!

This integration allows you to use **Claude Code** (or compatible AI agents) to manage your Kanbu projects, tasks, and team directly through natural language. It's like having a project manager who never sleeps.

## 🚀 Getting Started

### 1. Connect to Kanbu

Before the AI can do anything, it needs permission to access your account.

1.  Go to your **Kanbu Profile Page**.
2.  Look for the **AI Assistant** section.
3.  Click **"Generate Setup Code"**. You will get a code like `KNB-A3X9-7MK2`.
4.  Tell the AI:
    > "Connect to Kanbu with code KNB-A3X9-7MK2"

Once connected, the AI inherits your exact permissions. If you are an Admin, the AI is an Admin. If you are a Viewer, the AI is a Viewer.

---

## ⚡ What Can I Do?

You can speak naturally. The AI understands context.

### 📋 Managing Tasks

- "What are my high priority tasks?"
- "Create a bug ticket in the 'Backend' project for the login crash."
- "Move task KNB-42 to 'In Progress' and assign it to Robin."
- "Add a subtask to check the database schema."

### 🔍 Search & Discovery

- "Search for 'memory leak' in all tasks and comments."
- "What was the team working on last week?" (Uses activity logs)
- "Show me the velocity chart for the last 3 sprints."

### 👥 Team & Admin

- "Invite alice@example.com to the team."
- "Who has access to the Finance project?"
- "Reset the password for user 'bob'."

---

## 🛡️ Safety Features

We've built safety mechanisms to prevent accidents.

### Dry Run (Simulation Mode)

For destructive actions (like deleting permissions or revoking access), the active agent can use a **Dry Run** mode.

- If you are unsure, ask: _"Simulate deleting the ACL for project X"_
- The AI will report what _would_ happen without actually changing anything.
- Supported on: `delete_acl`, `bulk_revoke`.

### Resilience

The connection is built to be robust. If the AI encounters a temporary network glitch, it will automatically **retry** the request up to 3 times to ensure your command goes through.

---

## 💡 Tips for Best Results

- **Be Specific**: Instead of "Fix the task", say "Update the description of task KNB-123".
- **Use Project Names**: "List tasks in 'Mobile App'" is faster than just "List tasks".
- **Ask for Summaries**: "Summarize the recent comments on ticket KNB-55" is a great way to catch up.

---

## 🌐 Remote AI Integrations (Claude.ai / ChatGPT)

In addition to the local Claude Code setup, you can also connect **Claude.ai** (web/mobile) and **ChatGPT** directly to your Kanbu account. This enables voice-driven project management from any device!

### How It Works

When you authorize Claude.ai or ChatGPT, they connect via OAuth 2.1 to your Kanbu instance. These connections are separate from your local Claude Code setup.

### Viewing Connected Services

1. Go to your **Kanbu Profile Page**
2. Navigate to the **AI Assistant** section
3. Scroll down to **"Remote AI Integrations"**
4. You'll see all connected services (Claude.ai, ChatGPT, etc.)

Each service shows:

- Service name and logo
- Number of active tokens
- When it was connected

### Disconnecting a Service

If you want to revoke access for a service:

1. Find the service in the **Remote AI Integrations** section
2. Click the **"Disconnect"** button
3. Confirm the action

This revokes all tokens for that service. You'll need to re-authorize if you want to use it again.

### Admin: Managing OAuth Clients

If you're an administrator, you can manage OAuth clients (like Claude.ai, ChatGPT) from the admin panel:

1. Go to **Admin → MCP Services**
2. Here you can:
   - **Create** new OAuth clients for custom integrations
   - **Edit** existing client settings (redirect URIs, scopes)
   - **View** client credentials (for ChatGPT configuration)
   - **Deactivate** clients to block new authorizations

---

## ❓ Troubleshooting

**"I can't connect"**

- Check if your setup code has expired (it only lasts 5 minutes). Generate a new one.
- Ensure your Kanbu server is running and accessible.

**"The AI says I don't remain permission"**

- The AI acts _as you_. Check if your user account has the necessary rights in Kanbu.

**"It's slow"**

- Large searches might take a moment. The AI is scanning your entire workspace.

**"I keep getting 'Too many requests'"**

- To prevent abuse, the AI is limited to 100 requests per minute. Please wait a moment before trying again.

**"Claude.ai/ChatGPT won't connect"**

- Ensure your Kanbu instance has a valid SSL certificate (HTTPS required)
- Check that OAuth is enabled on your server
- For Claude.ai: OAuth may be temporarily unavailable (known issue since Dec 2025). Use API key as workaround.
- For ChatGPT: Verify the client credentials in Admin → MCP Services match your GPT configuration

**"I disconnected a service but it still works"**

- Tokens may be cached temporarily. Wait a few minutes and try again.
- Ensure you clicked "Disconnect" and confirmed the action.

---

_Powered by Kanbu Native MCP Implementation_
