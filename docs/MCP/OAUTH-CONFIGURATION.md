# Kanbu OAuth 2.1 Configuration Guide

This guide covers the OAuth 2.1 configuration for Kanbu MCP integration with Claude.ai, ChatGPT, and other OAuth clients.

## Overview

Kanbu implements OAuth 2.1 with:

- **RFC 8414** - Authorization Server Metadata (discovery)
- **RFC 9728** - Protected Resource Metadata (required by Claude.ai)
- **RFC 7591** - Dynamic Client Registration (DCR)
- **RFC 6749** - Authorization Code Grant
- **RFC 7636** - PKCE (Proof Key for Code Exchange)
- **RFC 7009** - Token Revocation
- **RFC 7662** - Token Introspection

## Environment Variables

### Required Configuration

| Variable  | Description                     | Example                |
| --------- | ------------------------------- | ---------------------- |
| `APP_URL` | Base URL of your Kanbu instance | `https://app.kanbu.be` |

### OAuth-Specific Configuration

| Variable                          | Description                           | Default             | Example                                       |
| --------------------------------- | ------------------------------------- | ------------------- | --------------------------------------------- |
| `OAUTH_ISSUER`                    | OAuth issuer URL (overrides APP_URL)  | Same as APP_URL     | `https://auth.kanbu.be`                       |
| `OAUTH_ACCESS_TOKEN_EXPIRY`       | Access token expiry in seconds        | `3600` (1 hour)     | `7200`                                        |
| `OAUTH_REFRESH_TOKEN_EXPIRY`      | Refresh token expiry in seconds       | `2592000` (30 days) | `604800`                                      |
| `OAUTH_ALLOWED_REDIRECT_PATTERNS` | Comma-separated redirect URI patterns | See defaults        | `https://myapp.com/*,https://internal.corp/*` |
| `OAUTH_ALLOW_ANONYMOUS_DCR`       | Allow anonymous client registration   | `true`              | `false`                                       |

### Default Redirect URI Patterns

If `OAUTH_ALLOWED_REDIRECT_PATTERNS` is not set, the following patterns are allowed:

- `https://claude.ai/*` - Claude.ai
- `https://chat.openai.com/*` - ChatGPT (legacy)
- `https://chatgpt.com/*` - ChatGPT
- `http://localhost:*/*` - Local development
- `https://localhost:*/*` - Local development (HTTPS)
- `http://127.0.0.1:*/*` - Local development
- `https://127.0.0.1:*/*` - Local development (HTTPS)

### ChatGPT Static Client (Optional)

For ChatGPT integration, you can pre-configure a static OAuth client:

| Variable                      | Description                      | Example              |
| ----------------------------- | -------------------------------- | -------------------- |
| `OAUTH_CHATGPT_CLIENT_ID`     | Static client ID for ChatGPT     | `chatgpt_kanbu_prod` |
| `OAUTH_CHATGPT_CLIENT_SECRET` | Static client secret for ChatGPT | `(hashed secret)`    |

## Instance Configuration Examples

### Production (app.kanbu.be)

```env
APP_URL=https://app.kanbu.be
OAUTH_ISSUER=https://app.kanbu.be
OAUTH_ACCESS_TOKEN_EXPIRY=3600
OAUTH_REFRESH_TOKEN_EXPIRY=2592000
```

### Development (dev.kanbu.be)

```env
APP_URL=https://dev.kanbu.be
OAUTH_ISSUER=https://dev.kanbu.be
OAUTH_ACCESS_TOKEN_EXPIRY=3600
OAUTH_REFRESH_TOKEN_EXPIRY=2592000
```

### Demo (demo.kanbu.be)

```env
APP_URL=https://demo.kanbu.be
OAUTH_ISSUER=https://demo.kanbu.be
OAUTH_ACCESS_TOKEN_EXPIRY=3600
OAUTH_REFRESH_TOKEN_EXPIRY=604800  # 7 days for demo
```

### Self-Hosted

```env
APP_URL=https://kanbu.yourcompany.com
OAUTH_ISSUER=https://kanbu.yourcompany.com
OAUTH_ACCESS_TOKEN_EXPIRY=3600
OAUTH_REFRESH_TOKEN_EXPIRY=2592000

# Add your internal redirect patterns
OAUTH_ALLOWED_REDIRECT_PATTERNS=https://claude.ai/*,https://chat.openai.com/*,https://internal.yourcompany.com/*
```

### Local Development

```env
APP_URL=https://localhost:3001
OAUTH_ISSUER=https://localhost:3001
OAUTH_ACCESS_TOKEN_EXPIRY=3600
OAUTH_REFRESH_TOKEN_EXPIRY=2592000
```

## OAuth Endpoints

All endpoints are relative to your `OAUTH_ISSUER` or `APP_URL`:

| Endpoint                                  | Method         | Description                              |
| ----------------------------------------- | -------------- | ---------------------------------------- |
| `/.well-known/oauth-authorization-server` | GET            | Authorization server metadata (RFC 8414) |
| `/.well-known/oauth-protected-resource`   | GET            | Protected resource metadata (RFC 9728)   |
| `/oauth/register`                         | POST           | Dynamic Client Registration (RFC 7591)   |
| `/oauth/register/:clientId`               | GET/PUT/DELETE | Client management (RFC 7592)             |
| `/oauth/authorize`                        | GET/POST       | Authorization endpoint                   |
| `/oauth/authorize/client`                 | GET            | Get client info for consent screen       |
| `/oauth/authorize/deny`                   | POST           | User denied authorization                |
| `/oauth/token`                            | POST           | Token exchange endpoint                  |
| `/oauth/token/introspect`                 | POST           | Token introspection (RFC 7662)           |
| `/oauth/token/revoke`                     | POST           | Token revocation (RFC 7009)              |

## Token Formats

| Token Type         | Prefix | Default Expiry | Example               |
| ------------------ | ------ | -------------- | --------------------- |
| Access Token       | `kat_` | 1 hour         | `kat_a1b2c3d4e5f6...` |
| Refresh Token      | `krt_` | 30 days        | `krt_x7y8z9a0b1c2...` |
| Registration Token | `rat_` | No expiry      | `rat_m3n4o5p6q7r8...` |

## Claude.ai Integration

Claude.ai uses OAuth 2.1 with PKCE (Proof Key for Code Exchange) and Dynamic Client Registration. This provides secure authentication without pre-shared secrets.

### Prerequisites

Before setting up Claude.ai integration:

1. **Kanbu instance accessible via HTTPS** - Claude.ai requires a publicly accessible HTTPS endpoint
2. **Valid SSL certificate** - Self-signed certificates are NOT supported by Claude.ai
3. **Firewall rules** - Allow inbound connections to your Kanbu instance

### OAuth Flow Overview

```
┌──────────────┐                           ┌──────────────┐
│   Claude.ai  │                           │    Kanbu     │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │ 1. GET /.well-known/oauth-protected-resource
       │─────────────────────────────────────────>│
       │<─────────────────────────────────────────│
       │          { authorization_servers: [...] }│
       │                                          │
       │ 2. GET /.well-known/oauth-authorization-server
       │─────────────────────────────────────────>│
       │<─────────────────────────────────────────│
       │          { registration_endpoint: ... }  │
       │                                          │
       │ 3. POST /oauth/register (DCR)            │
       │─────────────────────────────────────────>│
       │<─────────────────────────────────────────│
       │          { client_id: "kanbu_xxx" }      │
       │                                          │
       │ 4. User clicks "Connect"                 │
       │         Browser redirects to:            │
       │ GET /oauth/authorize?client_id=xxx&code_challenge=yyy&...
       │─────────────────────────────────────────>│
       │                                          │
       │          [User sees consent screen]      │
       │          [User clicks "Allow"]           │
       │                                          │
       │ 5. Redirect to Claude.ai with code       │
       │<─────────────────────────────────────────│
       │                                          │
       │ 6. POST /oauth/token                     │
       │    (code + code_verifier for PKCE)       │
       │─────────────────────────────────────────>│
       │<─────────────────────────────────────────│
       │          { access_token: "kat_xxx",      │
       │            refresh_token: "krt_xxx" }    │
       │                                          │
       │ 7. POST /mcp (with Bearer kat_xxx)       │
       │─────────────────────────────────────────>│
       │<─────────────────────────────────────────│
       │          [MCP tool responses]            │
       └──────────────────────────────────────────┘
```

### Setup Steps

#### Step 1: Configure Kanbu Instance

Ensure your Kanbu environment is properly configured:

```env
# Required: Your Kanbu instance URL
APP_URL=https://app.kanbu.be

# Optional: Override issuer (defaults to APP_URL)
# OAUTH_ISSUER=https://auth.kanbu.be

# Optional: Customize token expiry
OAUTH_ACCESS_TOKEN_EXPIRY=3600      # 1 hour (default)
OAUTH_REFRESH_TOKEN_EXPIRY=2592000  # 30 days (default)
```

#### Step 2: Verify Metadata Endpoints

Test that discovery endpoints are working:

```bash
# Protected Resource Metadata (Claude.ai starts here)
curl https://your-kanbu-instance.com/.well-known/oauth-protected-resource

# Expected response:
# {
#   "resource": "https://your-kanbu-instance.com/mcp",
#   "authorization_servers": ["https://your-kanbu-instance.com"],
#   "scopes_supported": ["read", "write", "admin"],
#   "bearer_methods_supported": ["header"]
# }

# Authorization Server Metadata
curl https://your-kanbu-instance.com/.well-known/oauth-authorization-server

# Expected response includes:
# {
#   "issuer": "https://your-kanbu-instance.com",
#   "authorization_endpoint": "https://your-kanbu-instance.com/oauth/authorize",
#   "token_endpoint": "https://your-kanbu-instance.com/oauth/token",
#   "registration_endpoint": "https://your-kanbu-instance.com/oauth/register",
#   ...
# }
```

#### Step 3: Add Integration in Claude.ai

1. Open [Claude.ai](https://claude.ai)
2. Go to **Settings** → **Integrations**
3. Click **Add Custom Integration**
4. Configure:
   - **Name:** `Kanbu` (or your preferred name)
   - **URL:** `https://your-kanbu-instance.com/mcp`
   - **Authentication:** Select **OAuth 2.1**

5. Claude.ai will automatically:
   - Discover metadata via `/.well-known/oauth-protected-resource`
   - Register a client via `/oauth/register` (Dynamic Client Registration)
   - Store the `client_id` for future use

#### Step 4: Connect Your Account

1. In Claude.ai, click **Connect** on the Kanbu integration
2. You'll be redirected to your Kanbu instance's consent screen
3. Review the permissions requested:
   - Read your projects and tasks
   - Create and update tasks
   - Access project analytics
4. Click **Allow Access**
5. You'll be redirected back to Claude.ai with the connection confirmed

#### Step 5: Test the Integration

Ask Claude to use Kanbu:

```
"What tasks do I have in Kanbu?"
"Create a task in my project called 'Test OAuth integration'"
"Show me the project statistics"
```

### Disconnecting

To disconnect Claude.ai from your Kanbu account:

**From Claude.ai:**

1. Go to **Settings** → **Integrations**
2. Find the Kanbu integration
3. Click **Disconnect**

**From Kanbu:**

1. Go to your **Profile** → **Connected Apps** (or OAuth Clients in Admin)
2. Find the Claude.ai client
3. Click **Revoke Access**

### Troubleshooting

#### Known Issue: OAuth Broken (December 2025)

⚠️ **Status:** There's a known issue with Claude.ai OAuth integration since approximately December 18, 2025.

**Symptoms:**

- OAuth flow fails silently
- "Failed to connect" error
- Token exchange doesn't complete

**Workaround: Use API Key Authentication**

Until Claude.ai fixes the OAuth issue, you can use API key authentication:

1. In Kanbu, go to **Profile** → **API Tokens**
2. Create a new API token:
   - **Name:** `Claude.ai`
   - **Scope:** `read write`
   - **Expiry:** Set as needed
3. Copy the token (starts with `kb_`)
4. In Claude.ai, configure the integration with:
   - **Authentication:** Bearer Token
   - **Token:** `kb_xxxxxxxxxxxxx`

API keys work with the same `/mcp` endpoint and provide identical functionality.

#### "Invalid redirect_uri" Error

**Cause:** Claude.ai's callback URL is not in the allowed patterns.

**Solution:** Ensure your redirect patterns include Claude.ai:

```env
OAUTH_ALLOWED_REDIRECT_PATTERNS=https://claude.ai/*
```

Or check the default patterns are not being overridden.

#### "Client registration failed" Error

**Cause:** DCR (Dynamic Client Registration) might be disabled or rate limited.

**Solutions:**

1. Check that anonymous DCR is allowed:

   ```env
   OAUTH_ALLOW_ANONYMOUS_DCR=true  # Default
   ```

2. Check rate limits (10 registrations per IP per hour):
   - Wait an hour if you've been testing repeatedly
   - Check server logs for rate limit errors

3. Verify the registration endpoint is accessible:
   ```bash
   curl -X POST https://your-kanbu-instance.com/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name":"Test","redirect_uris":["https://example.com/callback"]}'
   ```

#### "PKCE verification failed" Error

**Cause:** The code_verifier doesn't match the code_challenge.

**Solutions:**

1. This is typically a Claude.ai-side issue - clear the integration and reconnect
2. Check that your Kanbu instance is using HTTPS (PKCE requires secure connections)
3. Verify no proxy is modifying request bodies

#### Consent Screen Not Loading

**Cause:** User is not logged in, or login redirect failed.

**Solutions:**

1. Log in to Kanbu directly first, then retry the OAuth flow
2. Check that cookies are enabled
3. Clear browser cache and try again
4. Check for CORS issues in browser console

#### "User account is inactive" Error

**Cause:** The Kanbu user account has been deactivated.

**Solution:** Contact your Kanbu administrator to reactivate the account.

#### Connection Works But Tools Fail

**Cause:** Token might have expired or been revoked.

**Solutions:**

1. Disconnect and reconnect the integration
2. Check token expiry settings:
   ```env
   OAUTH_ACCESS_TOKEN_EXPIRY=3600      # 1 hour
   OAUTH_REFRESH_TOKEN_EXPIRY=2592000  # 30 days
   ```
3. Verify refresh token rotation is working (check server logs)

### Debugging Tips

**Server-Side Logging:**

Enable debug logging to see OAuth flow details:

```env
LOG_LEVEL=debug
```

Look for log entries like:

```
[OAuth] Client registered: Claude.ai (kanbu_xxx)
[OAuth] Authorization code generated for client kanbu_xxx
[OAuth] Tokens issued for client kanbu_xxx, user robin (auth: none)
[OAuth] Token refreshed for client kanbu_xxx
```

**Test Endpoints Manually:**

```bash
# Test metadata discovery
curl -v https://your-instance.com/.well-known/oauth-protected-resource

# Test client registration
curl -X POST https://your-instance.com/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Client",
    "redirect_uris": ["https://example.com/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "none"
  }'

# Test token introspection (requires valid token)
curl -X POST https://your-instance.com/oauth/token/introspect \
  -d "token=kat_xxxxx&token_type_hint=access_token"
```

### Platform-Specific Notes

| Platform          | OAuth Support | Notes                          |
| ----------------- | ------------- | ------------------------------ |
| Claude.ai Web     | ✅ Full       | OAuth 2.1 + PKCE + DCR         |
| Claude.ai iOS     | ✅ Full       | Same as web                    |
| Claude.ai Android | ✅ Full       | Same as web                    |
| Claude Desktop    | ⚠️ Partial    | May require API key fallback   |
| Claude Code (CLI) | ❌ N/A        | Uses stdio transport, not HTTP |

## ChatGPT Integration

ChatGPT requires a confidential OAuth client with `client_secret_basic` authentication (unlike Claude.ai which uses public clients with PKCE).

### Authentication Methods

| Client Type  | Auth Method           | PKCE     | Use Case                |
| ------------ | --------------------- | -------- | ----------------------- |
| Public       | `none`                | Required | Claude.ai, browser apps |
| Confidential | `client_secret_basic` | Optional | ChatGPT, server apps    |
| Confidential | `client_secret_post`  | Optional | Legacy integrations     |

### Setup Steps

#### 1. Create Static Client via Admin API

Use the tRPC admin endpoint to create a confidential client:

```typescript
// trpc.oauthClient.create
{
  clientName: "ChatGPT Integration",
  redirectUris: ["https://chat.openai.com/aip/g-xxx/oauth/callback"],
  tokenEndpointAuthMethod: "client_secret_basic",
  scope: "read write"
}
```

**Response (SAVE THE SECRET!):**

```json
{
  "clientId": "kanbu_abc123...",
  "clientSecret": "kcs_xyz789...",
  "secretWarning": "Save this client_secret securely. It will not be shown again!"
}
```

#### 2. Configure Custom GPT

In ChatGPT's GPT Builder:

1. Go to **Configure** → **Actions** → **Authentication**
2. Select **OAuth**
3. Fill in:
   - **Client ID:** `kanbu_abc123...` (from step 1)
   - **Client Secret:** `kcs_xyz789...` (from step 1)
   - **Authorization URL:** `https://your-kanbu-instance.com/oauth/authorize`
   - **Token URL:** `https://your-kanbu-instance.com/oauth/token`
   - **Scope:** `read write`
   - **Token Exchange Method:** `Basic Authorization header` (default)

4. Copy the **Callback URL** shown by ChatGPT
5. Update the client's redirect_uris to include this callback URL:

```typescript
// trpc.oauthClient.update
{
  id: 123,
  redirectUris: ["https://chat.openai.com/aip/g-xxx/oauth/callback"]
}
```

#### 3. Test the Integration

1. In ChatGPT, use your Custom GPT
2. When it needs Kanbu access, it will redirect to Kanbu's consent screen
3. After approval, tokens are exchanged automatically
4. The GPT can now access Kanbu MCP tools

### Client Management

#### Via tRPC Admin Endpoints

| Endpoint                       | Description                  |
| ------------------------------ | ---------------------------- |
| `oauthClient.list`             | List all OAuth clients       |
| `oauthClient.get`              | Get client details           |
| `oauthClient.create`           | Create new client            |
| `oauthClient.update`           | Update client settings       |
| `oauthClient.regenerateSecret` | Generate new secret          |
| `oauthClient.deactivate`       | Soft delete (revokes tokens) |
| `oauthClient.revokeAllTokens`  | Revoke tokens only           |
| `oauthClient.delete`           | Permanent deletion           |

#### Regenerating Secrets

If a client_secret is compromised:

```typescript
// trpc.oauthClient.regenerateSecret
{ id: 123 }

// Response:
{
  "clientId": "kanbu_abc123...",
  "clientSecret": "kcs_newSecret...",
  "secretWarning": "Save this client_secret securely. It will not be shown again!"
}
```

The old secret is invalidated immediately. Update ChatGPT's configuration with the new secret.

### Token Flow Comparison

#### Claude.ai (Public Client + PKCE)

```
1. Claude → GET /oauth/authorize?client_id=xxx&code_challenge=yyy
2. User approves → redirect with ?code=zzz
3. Claude → POST /oauth/token (code + code_verifier)
4. Kanbu verifies PKCE, issues tokens
```

#### ChatGPT (Confidential Client + Secret)

```
1. ChatGPT → GET /oauth/authorize?client_id=xxx
2. User approves → redirect with ?code=zzz
3. ChatGPT → POST /oauth/token
   Authorization: Basic base64(client_id:client_secret)
   Body: code=zzz
4. Kanbu verifies client_secret, issues tokens
```

## Security Considerations

### Rate Limiting

- Client registration: 10 registrations per IP per hour
- MCP endpoint: 100 requests per minute per token (configurable via `MCP_RATE_LIMIT`)

### Token Storage

- All tokens are stored as SHA-256 hashes
- Original tokens are never stored
- Token prefix allows identification without exposing the full token

### PKCE Requirements

- Only `S256` code challenge method is supported
- `plain` is explicitly rejected for security

### Client Validation

- Redirect URIs are validated against registered patterns
- Clients can be deactivated (soft delete)
- Registration access tokens required for client management

## MCP Authentication

The `/mcp` endpoint accepts both authentication methods:

1. **API Key (existing):**

   ```
   Authorization: Bearer kb_xxxxxxxxxxxxx
   ```

2. **OAuth Access Token (new):**
   ```
   Authorization: Bearer kat_xxxxxxxxxxxxx
   ```

The endpoint automatically detects the token type by prefix and validates accordingly.

## Changelog

| Date       | Change                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-01-19 | Phase 19.7: Expanded Claude.ai integration guide with OAuth flow diagram, setup steps, troubleshooting, and API key workaround |
| 2026-01-19 | Phase 19.8: Added ChatGPT integration guide with static client management via tRPC admin endpoints                             |
| 2026-01-19 | Initial OAuth 2.1 implementation (Phase 19)                                                                                    |
