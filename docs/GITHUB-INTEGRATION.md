# GitHub Integration Setup

Kanbu's GitHub integration syncs issues, pull requests, commits, and milestones between GitHub and your Kanbu board. It uses a **GitHub App** — an OAuth app that gets installed on your GitHub organization or personal account.

This guide walks through setting it up from scratch.

---

## What you need

- A self-hosted Kanbu instance with a public URL (e.g. `https://kanbu.yourdomain.com`)
- A GitHub account with access to the repositories you want to connect
- About 10 minutes

> **Local-only setup?** GitHub webhooks require a publicly reachable URL. For local development, use a tunnel tool like [ngrok](https://ngrok.com) or [Tailscale Funnel](https://tailscale.com/kb/1223/tailscale-funnel) to expose your local API.

---

## Step 1: Create a GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
   (or: `https://github.com/settings/apps/new`)

2. Fill in the basics:

   | Field               | Value                                                            |
   | ------------------- | ---------------------------------------------------------------- |
   | **GitHub App name** | `kanbu-yourname` (must be globally unique)                       |
   | **Homepage URL**    | `https://kanbu.yourdomain.com`                                   |
   | **Webhook URL**     | `https://kanbu.yourdomain.com/api/webhooks/github`               |
   | **Webhook secret**  | Generate a random string (e.g. `openssl rand -hex 32`) — save it |

3. Under **Identifying and authorizing users**:
   - Callback URL: `https://kanbu.yourdomain.com/api/github/callback`
   - Check **Request user authorization (OAuth) during installation**

4. Set **Repository permissions**:

   | Permission      | Access                |
   | --------------- | --------------------- |
   | Issues          | Read & write          |
   | Pull requests   | Read & write          |
   | Contents        | Read-only             |
   | Metadata        | Read-only (mandatory) |
   | Commit statuses | Read-only             |

5. Under **Subscribe to events**, check:
   - Issues
   - Issue comment
   - Pull request
   - Push
   - Create (branch/tag creation)

6. Under **Where can this GitHub App be installed?**, choose:
   - **Only on this account** — if it's just for your own repos
   - **Any account** — if you want others to be able to install it

7. Click **Create GitHub App**.

---

## Step 2: Generate a private key

After creating the app, you land on the app settings page.

1. Scroll down to **Private keys**
2. Click **Generate a private key**
3. Download the `.pem` file — store it somewhere safe

---

## Step 3: Note down the credentials

From your GitHub App settings page, collect:

| Value              | Where to find it                          |
| ------------------ | ----------------------------------------- |
| **App ID**         | Top of the page (a number, e.g. `123456`) |
| **Client ID**      | Under "OAuth credentials"                 |
| **Client secret**  | Click "Generate a new client secret"      |
| **Webhook secret** | The one you set in Step 1                 |
| **Private key**    | The `.pem` file you downloaded            |

---

## Step 4: Configure Kanbu

### Docker setup

Add the following to your `docker/.env` file:

```env
# GitHub App Integration
GITHUB_APP_ID=123456
GITHUB_APP_NAME=kanbu-yourname
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Private key: paste the contents of your .pem file on one line
# Replace newlines with \n
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----"

# Callback URL (must match what you set in the GitHub App)
GITHUB_CALLBACK_URL=https://kanbu.yourdomain.com/api/github/callback
```

**How to format the private key on one line:**

```bash
# Linux / macOS
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' your-app-key.pem
```

Copy the output and use it as the value for `GITHUB_PRIVATE_KEY`.

### Manual setup

Add the same variables to `apps/api/.env`.

---

## Step 5: Install the GitHub App

1. Go to your GitHub App settings: `https://github.com/settings/apps/kanbu-yourname`
2. Click **Install App** in the left sidebar
3. Choose your account or organization
4. Select which repositories to give access to
5. Click **Install**

---

## Step 6: Connect a project

1. Open Kanbu and go to **Admin → GitHub** (in the workspace sidebar)
2. You'll see the GitHub App installation — confirm it's connected
3. Go to any project → **Settings → GitHub**
4. Click **Link repository** and select the repo to sync
5. Configure sync settings (which events to sync, sync direction, etc.)

---

## Webhook verification

To verify the webhook is working:

1. Go to your GitHub App → **Advanced** tab → **Recent Deliveries**
2. After installing, GitHub sends a `ping` event — it should show `200 OK`

If it fails, check:

- Your `GITHUB_WEBHOOK_SECRET` matches what's in the GitHub App settings
- Your Kanbu API is reachable from the internet
- The webhook URL is correct (`/api/webhooks/github`)

---

## Environment variables reference

| Variable                  | Required | Description                                                   |
| ------------------------- | -------- | ------------------------------------------------------------- |
| `GITHUB_APP_ID`           | Yes      | Numeric App ID from GitHub App settings                       |
| `GITHUB_APP_NAME`         | Yes      | App name (used for install links)                             |
| `GITHUB_CLIENT_ID`        | Yes      | OAuth Client ID                                               |
| `GITHUB_CLIENT_SECRET`    | Yes      | OAuth Client Secret                                           |
| `GITHUB_WEBHOOK_SECRET`   | Yes      | Random string for webhook HMAC verification                   |
| `GITHUB_PRIVATE_KEY`      | Yes      | PEM private key (newlines as `\n`)                            |
| `GITHUB_PRIVATE_KEY_PATH` | Alt      | Path to `.pem` file (alternative to inline key)               |
| `GITHUB_CALLBACK_URL`     | Yes      | OAuth callback: `https://your-domain.com/api/github/callback` |

---

## Troubleshooting

| Problem                          | Likely cause              | Fix                                                    |
| -------------------------------- | ------------------------- | ------------------------------------------------------ |
| Webhook delivery fails with 401  | Webhook secret mismatch   | Make sure `GITHUB_WEBHOOK_SECRET` matches exactly      |
| Issues not syncing               | App not installed on repo | Go to GitHub App → Install, select the repo            |
| OAuth callback fails             | Wrong callback URL        | Callback URL in env must match GitHub App settings     |
| Private key error on startup     | Key format issue          | Re-export key with newlines as `\n`                    |
| "App not configured" in Kanbu UI | Missing env vars          | Check all 6 required variables are set and restart API |
