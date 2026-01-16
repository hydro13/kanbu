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
*   "What are my high priority tasks?"
*   "Create a bug ticket in the 'Backend' project for the login crash."
*   "Move task KNB-42 to 'In Progress' and assign it to Robin."
*   "Add a subtask to check the database schema."

### 🔍 Search & Discovery
*   "Search for 'memory leak' in all tasks and comments."
*   "What was the team working on last week?" (Uses activity logs)
*   "Show me the velocity chart for the last 3 sprints."

### 👥 Team & Admin
*   "Invite alice@example.com to the team."
*   "Who has access to the Finance project?"
*   "Reset the password for user 'bob'."

---

## 🛡️ Safety Features

We've built safety mechanisms to prevent accidents.

### Dry Run (Simulation Mode)
For destructive actions (like deleting permissions or revoking access), the active agent can use a **Dry Run** mode.
*   If you are unsure, ask: *"Simulate deleting the ACL for project X"*
*   The AI will report what *would* happen without actually changing anything.
*   Supported on: `delete_acl`, `bulk_revoke`.

### Resilience
The connection is built to be robust. If the AI encounters a temporary network glitch, it will automatically **retry** the request up to 3 times to ensure your command goes through.

---

## 💡 Tips for Best Results

*   **Be Specific**: Instead of "Fix the task", say "Update the description of task KNB-123".
*   **Use Project Names**: "List tasks in 'Mobile App'" is faster than just "List tasks".
*   **Ask for Summaries**: "Summarize the recent comments on ticket KNB-55" is a great way to catch up.

---

## ❓ Troubleshooting

**"I can't connect"**
*   Check if your setup code has expired (it only lasts 5 minutes). Generate a new one.
*   Ensure your Kanbu server is running and accessible.

**"The AI says I don't remain permission"**
*   The AI acts *as you*. Check if your user account has the necessary rights in Kanbu.

**"It's slow"**
*   Large searches might take a moment. The AI is scanning your entire workspace.

---
*Powered by Kanbu Native MCP Implementation*
