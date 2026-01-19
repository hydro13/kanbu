# Kanbu MCP Server - Complete Specification

> **Date:** 19-01-2026
> **Author:** Robin Waslander
> **Status:** Architecture Decision Record

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Decisions](#architecture-decisions)
3. [Platform Support](#platform-support)
4. [Multi-Instance Support](#multi-instance-support)
5. [OAuth 2.1 Flow](#oauth-21-flow)
6. [Required Endpoints](#required-endpoints)
7. [Claude.ai Requirements](#claudeai-requirements)
8. [ChatGPT Requirements](#chatgpt-requirements)
9. [Implementation Plan](#implementation-plan)
10. [Database Schema](#database-schema)
11. [Known Issues](#known-issues)
12. [Sources](#sources)

---

## Executive Summary

### Key Decisions

| Decision       | Choice                      | Rationale                          |
| -------------- | --------------------------- | ---------------------------------- |
| Transport      | **Hybrid** (stdio + remote) | Desktop=stdio, Mobile/Web=remote   |
| Architecture   | **MCP in Kanbu API**        | Simpler, scales with API           |
| Authentication | **OAuth 2.1 + API tokens**  | OAuth for remote, tokens for stdio |
| Scaling        | **Stateless, horizontal**   | SaaS requirement                   |

### What We're Building

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT PLATFORMS                            │
├───────────────┬───────────────┬───────────────┬────────────────────┤
│    Desktop    │    Mobile     │   Claude.ai   │      ChatGPT       │
│ (Win/Mac/Lin) │  (iOS/Android)│     (Web)     │       (Web)        │
├───────────────┼───────────────┴───────────────┴────────────────────┤
│               │                                                     │
│  STDIO MCP    │              REMOTE MCP (OAuth 2.1)                │
│  (lokaal)     │              (via HTTPS)                           │
│               │                                                     │
├───────────────┴─────────────────────────────────────────────────────┤
│                                                                     │
│                    KANBU API (Fastify + tRPC)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   /trpc/*   │  │   /mcp/*    │  │  /oauth/*   │                 │
│  │  (bestaand) │  │  (nieuw)    │  │  (nieuw)    │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         LOAD BALANCER                               │
├─────────────────────────────────────────────────────────────────────┤
│     Instance 1     │     Instance 2     │     Instance N           │
│    (stateless)     │    (stateless)     │    (stateless)           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Decisions

### Decision 1: Hybrid Transport (Stdio + Remote)

**Why both?**

| Platform        | Stdio | Remote | Reason                 |
| --------------- | ----- | ------ | ---------------------- |
| Linux Desktop   | ✅    | ✅     | Developer preference   |
| macOS Desktop   | ✅    | ✅     | Developer preference   |
| Windows Desktop | ✅    | ✅     | Developer preference   |
| iOS Mobile      | ❌    | ✅     | Cannot spawn processes |
| Android Mobile  | ❌    | ✅     | Cannot spawn processes |
| Claude.ai Web   | ❌    | ✅     | Browser only           |
| ChatGPT Web     | ❌    | ✅     | Browser only           |

**Conclusion:** We MUST support Remote MCP for mobile and web users.

### Decision 2: MCP Built Into Kanbu API

**Chosen:** MCP endpoints live inside the existing Kanbu API (Fastify)

**Benefits:**

- Single deployment
- Scales automatically with API
- Shares authentication infrastructure
- MCP tools call tRPC internally (fast, no network hop)
- Easier to maintain

**Trade-off:** Cannot scale MCP independently from API (acceptable)

### Decision 3: Stateless Design

**Why:** SaaS must scale horizontally to unknown number of users

**Implementation:**

- No server-side session state
- JWT tokens contain all needed info
- Any API instance can handle any request
- Load balancer distributes evenly

---

## Platform Support

### Desktop (Stdio MCP)

```
User's Machine
┌─────────────────────────────────────────┐
│  ┌─────────────┐    ┌────────────────┐  │
│  │ Claude Code │───▶│ MCP Server     │  │
│  │   (CLI)     │    │ (Node process) │  │
│  └─────────────┘    └───────┬────────┘  │
│                             │ HTTPS     │
└─────────────────────────────┼───────────┘
                              ▼
                    ┌─────────────────┐
                    │  app.kanbu.be   │
                    │    (API)        │
                    └─────────────────┘
```

**Requirements:**

- Node.js installed
- MCP server package installed (npm/pnpm)
- Claude Code or compatible CLI

### Mobile & Web (Remote MCP)

```
User's Device
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │  Claude iOS / Claude.ai / GPT   │    │
│  └──────────────┬──────────────────┘    │
└─────────────────┼───────────────────────┘
                  │ HTTPS + OAuth
                  ▼
        ┌─────────────────┐
        │  app.kanbu.be   │
        │  /mcp endpoint  │
        └─────────────────┘
```

**Requirements:**

- Browser or mobile app
- OAuth login to Kanbu
- No local installation needed

---

## Multi-Instance Support

### Deployment Scenarios

| Scenario             | URL                       | SSL           | MCP Name         |
| -------------------- | ------------------------- | ------------- | ---------------- |
| **Production SaaS**  | https://app.kanbu.be      | Let's Encrypt | `kanbu-app`      |
| **Development SaaS** | https://dev.kanbu.be      | Let's Encrypt | `kanbu-dev`      |
| **Demo SaaS**        | https://demo.kanbu.be     | Let's Encrypt | `kanbu-demo`     |
| **Enterprise**       | https://{client}.kanbu.be | Let's Encrypt | `kanbu-{client}` |
| **Local Dev**        | https://localhost:3001    | Self-signed   | `kanbu-local`    |

### Naming Convention

```
kanbu-{environment}[-{identifier}]
```

### Multi-Instance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Client (Claude/ChatGPT)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ kanbu-app    │  │ kanbu-dev    │  │ kanbu-local  │   ...    │
│  │ (production) │  │ (staging)    │  │ (localhost)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │app.kanbu.be  │  │dev.kanbu.be  │  │localhost:3001│
   │   (OAuth)    │  │   (OAuth)    │  │ (Bearer/API) │
   └──────────────┘  └──────────────┘  └──────────────┘
```

**Key Requirements:**

- Each MCP server has a **unique name** (no conflicts)
- Each instance maintains **separate credentials** (already implemented via URL-hashed storage)
- User can connect to **multiple instances simultaneously**
- Each instance has its **own OAuth configuration**

---

## Multi-Instance Support

### MCP Server Naming Convention

```
kanbu-{environment}[-{identifier}]
```

**Examples:**

- `kanbu-app` → app.kanbu.be (production)
- `kanbu-dev` → dev.kanbu.be (development)
- `kanbu-demo` → demo.kanbu.be (demo server)
- `kanbu-local` → localhost:3001 (local development)
- `kanbu-client-acme` → acme.kanbu.be (enterprise client)

### Credential Storage (Already Implemented)

Each KANBU_URL gets its own credential file:

```
~/.config/kanbu/
├── mcp-a1b2c3d4.json  # Hash of https://app.kanbu.be
├── mcp-e5f6g7h8.json  # Hash of https://dev.kanbu.be
├── mcp-i9j0k1l2.json  # Hash of https://localhost:3001
└── ...
```

**Implementation:** See `packages/mcp-server/src/storage.ts`

```typescript
function getUrlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 8);
}

function getTokenFilePath(): string {
  const kanbuUrl = process.env.KANBU_URL || 'https://localhost:3001';
  const hash = getUrlHash(kanbuUrl);
  return join(CONFIG_DIR, `mcp-${hash}.json`);
}
```

### Claude Code Configuration Example

```json
{
  "mcpServers": {
    "kanbu-app": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "KANBU_URL": "https://app.kanbu.be"
      }
    },
    "kanbu-dev": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "KANBU_URL": "https://dev.kanbu.be"
      }
    },
    "kanbu-local": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "KANBU_URL": "https://localhost:3001",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
```

### Remote MCP (Future - OAuth)

When OAuth is implemented, users can add Kanbu via Claude.ai UI:

| Field                 | Value                      |
| --------------------- | -------------------------- |
| Name                  | `Kanbu Production`         |
| Remote MCP Server URL | `https://app.kanbu.be/mcp` |
| OAuth Client ID       | (optional - DCR)           |
| OAuth Client Secret   | (optional - DCR)           |

---

## OAuth 2.1 Flow

### Complete Flow Diagram

```
┌──────────┐                              ┌──────────────┐                              ┌─────────────┐
│  Claude  │                              │ Kanbu OAuth  │                              │ Kanbu MCP   │
│  Client  │                              │   Server     │                              │   Server    │
└────┬─────┘                              └──────┬───────┘                              └──────┬──────┘
     │                                           │                                             │
     │ 1. GET /mcp (no auth)                     │                                             │
     │─────────────────────────────────────────────────────────────────────────────────────────▶
     │                                           │                                             │
     │ 2. 401 + WWW-Authenticate header          │                                             │
     │◀─────────────────────────────────────────────────────────────────────────────────────────
     │                                           │                                             │
     │ 3. GET /.well-known/oauth-protected-resource                                            │
     │─────────────────────────────────────────────────────────────────────────────────────────▶
     │                                           │                                             │
     │ 4. Protected Resource Metadata            │                                             │
     │◀─────────────────────────────────────────────────────────────────────────────────────────
     │                                           │                                             │
     │ 5. GET /.well-known/oauth-authorization-server                                          │
     │──────────────────────────────────────────▶│                                             │
     │                                           │                                             │
     │ 6. Authorization Server Metadata          │                                             │
     │◀──────────────────────────────────────────│                                             │
     │                                           │                                             │
     │ 7. POST /oauth/register (DCR)             │                                             │
     │──────────────────────────────────────────▶│                                             │
     │                                           │                                             │
     │ 8. Client credentials                     │                                             │
     │◀──────────────────────────────────────────│                                             │
     │                                           │                                             │
     │ 9. Redirect to /oauth/authorize + PKCE    │                                             │
     │──────────────────────────────────────────▶│                                             │
     │                                           │                                             │
     │                                    ┌──────┴───────┐                                     │
     │                                    │ User Login   │                                     │
     │                                    │ + Consent    │                                     │
     │                                    └──────┬───────┘                                     │
     │                                           │                                             │
     │ 10. Redirect to callback with code        │                                             │
     │◀──────────────────────────────────────────│                                             │
     │                                           │                                             │
     │ 11. POST /oauth/token (+ code_verifier)   │                                             │
     │──────────────────────────────────────────▶│                                             │
     │                                           │                                             │
     │ 12. Access token + refresh token          │                                             │
     │◀──────────────────────────────────────────│                                             │
     │                                           │                                             │
     │ 13. GET /mcp (Authorization: Bearer xxx)  │                                             │
     │─────────────────────────────────────────────────────────────────────────────────────────▶
     │                                           │                                             │
     │ 14. MCP response                          │                                             │
     │◀─────────────────────────────────────────────────────────────────────────────────────────
     │                                           │                                             │
```

---

## Required Endpoints

### MCP Server Endpoints

| Endpoint                                | Method | Purpose                         |
| --------------------------------------- | ------ | ------------------------------- |
| `/mcp`                                  | POST   | MCP protocol (Streamable HTTP)  |
| `/mcp/sse`                              | GET    | MCP protocol (SSE - deprecated) |
| `/.well-known/oauth-protected-resource` | GET    | Resource metadata               |
| `/health`                               | GET    | Health check                    |

### OAuth Server Endpoints (on Kanbu API)

| Endpoint                                  | Method | Purpose                     | RFC       |
| ----------------------------------------- | ------ | --------------------------- | --------- |
| `/.well-known/oauth-authorization-server` | GET    | AS metadata                 | RFC 8414  |
| `/oauth/register`                         | POST   | Dynamic Client Registration | RFC 7591  |
| `/oauth/authorize`                        | GET    | Authorization               | OAuth 2.1 |
| `/oauth/token`                            | POST   | Token exchange              | OAuth 2.1 |
| `/oauth/token/introspect`                 | POST   | Token validation            | RFC 7662  |
| `/oauth/token/revoke`                     | POST   | Token revocation            | RFC 7009  |

---

## Claude.ai Requirements

### Callback URLs (Allowlist Both!)

```
https://claude.ai/api/mcp/auth_callback
https://claude.com/api/mcp/auth_callback  (future)
```

### OAuth Client Name

```
Claude
```

### Required Features

| Feature                     | Requirement               | RFC       |
| --------------------------- | ------------------------- | --------- |
| PKCE                        | **Mandatory** (S256)      | RFC 7636  |
| DCR                         | **Mandatory** (anonymous) | RFC 7591  |
| Token Refresh               | Supported                 | OAuth 2.1 |
| Protected Resource Metadata | **Mandatory**             | RFC 9728  |
| AS Metadata                 | **Mandatory**             | RFC 8414  |

### Protected Resource Metadata Response

```json
{
  "resource": "https://app.kanbu.be/mcp",
  "authorization_servers": ["https://app.kanbu.be"],
  "scopes_supported": ["mcp:read", "mcp:write", "mcp:admin"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://docs.kanbu.be/mcp"
}
```

### Authorization Server Metadata Response

```json
{
  "issuer": "https://app.kanbu.be",
  "authorization_endpoint": "https://app.kanbu.be/oauth/authorize",
  "token_endpoint": "https://app.kanbu.be/oauth/token",
  "registration_endpoint": "https://app.kanbu.be/oauth/register",
  "introspection_endpoint": "https://app.kanbu.be/oauth/token/introspect",
  "revocation_endpoint": "https://app.kanbu.be/oauth/token/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "none"],
  "scopes_supported": ["mcp:read", "mcp:write", "mcp:admin"]
}
```

---

## ChatGPT Requirements

### Callback URLs

```
https://chat.openai.com/aip/{GPT-ID}/oauth/callback
https://chatgpt.com/aip/{GPT-ID}/oauth/callback
```

### Configuration Fields

| Field                 | Value                                  |
| --------------------- | -------------------------------------- |
| Client ID             | Pre-registered client ID               |
| Client Secret         | Pre-registered client secret           |
| Authorization URL     | `https://app.kanbu.be/oauth/authorize` |
| Token URL             | `https://app.kanbu.be/oauth/token`     |
| Scope                 | `openid mcp:read mcp:write`            |
| Token Exchange Method | POST                                   |

### Key Differences from Claude

| Feature            | Claude.ai            | ChatGPT                 |
| ------------------ | -------------------- | ----------------------- |
| DCR                | Required (anonymous) | Not supported           |
| PKCE               | Required             | Optional                |
| Client credentials | Dynamic              | Static (pre-configured) |
| State parameter    | Supported            | **Required**            |
| Metadata discovery | RFC 9728 + 8414      | Not used                |

---

## Implementation Plan

### Phase 1: OAuth Infrastructure

1. **Database tables** for OAuth clients, codes, tokens
2. **Metadata endpoints** (`.well-known/*`)
3. **DCR endpoint** (`/oauth/register`)
4. **Authorization endpoint** (`/oauth/authorize`)
5. **Token endpoint** (`/oauth/token`)

### Phase 2: PKCE Support

1. **Code challenge storage** in authorization codes
2. **S256 verification** in token exchange
3. **Reject requests without PKCE** (OAuth 2.1 requirement)

### Phase 3: Token Management

1. **JWT access tokens** with RS256 signing
2. **Opaque refresh tokens** stored in database
3. **Token introspection** endpoint
4. **Token revocation** endpoint

### Phase 4: Multi-Instance Support

1. **Instance-specific issuer URLs** (per KANBU_URL)
2. **Shared OAuth client registry** (DCR clients work across instances)
3. **User consent per instance** (separate grants)

### Phase 5: Integration

1. **MCP server bearer auth middleware**
2. **Scope-based authorization** for MCP tools
3. **Claude.ai testing** (when their bug is fixed)
4. **ChatGPT GPT Action setup**

---

## Database Schema

### OAuth Clients (DCR)

```sql
CREATE TABLE oauth_clients (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(64) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255),
  client_name VARCHAR(255) NOT NULL,
  redirect_uris TEXT[] NOT NULL,
  grant_types TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token'],
  response_types TEXT[] DEFAULT ARRAY['code'],
  token_endpoint_auth_method VARCHAR(50) DEFAULT 'client_secret_basic',
  scope TEXT,

  -- Metadata
  logo_uri VARCHAR(500),
  client_uri VARCHAR(500),
  policy_uri VARCHAR(500),
  tos_uri VARCHAR(500),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,

  -- For multi-instance: which Kanbu instance registered this client
  registered_at_url VARCHAR(255)
);
```

### Authorization Codes

```sql
CREATE TABLE oauth_codes (
  code VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES oauth_clients(client_id),
  user_id INT NOT NULL REFERENCES users(id),
  redirect_uri TEXT NOT NULL,
  scope TEXT,

  -- PKCE
  code_challenge VARCHAR(128),
  code_challenge_method VARCHAR(10) DEFAULT 'S256',

  -- Resource indicator (RFC 8707)
  resource VARCHAR(255),

  -- Expiry
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,

  -- For multi-instance
  issuer_url VARCHAR(255) NOT NULL
);

CREATE INDEX idx_oauth_codes_expires ON oauth_codes(expires_at);
```

### Access & Refresh Tokens

```sql
CREATE TABLE oauth_tokens (
  id SERIAL PRIMARY KEY,

  -- Token identifiers (hashed for security)
  access_token_hash VARCHAR(64) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(64) UNIQUE,

  -- Relations
  client_id VARCHAR(64) NOT NULL REFERENCES oauth_clients(client_id),
  user_id INT NOT NULL REFERENCES users(id),

  -- Token details
  scope TEXT,
  token_type VARCHAR(20) DEFAULT 'Bearer',

  -- Expiry
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,

  -- For multi-instance
  issuer_url VARCHAR(255) NOT NULL
);

CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(access_token_expires_at);
```

### User Consent Records

```sql
CREATE TABLE oauth_consents (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  client_id VARCHAR(64) NOT NULL REFERENCES oauth_clients(client_id),
  scope TEXT NOT NULL,

  -- For multi-instance: consent is per-instance
  issuer_url VARCHAR(255) NOT NULL,

  granted_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,

  UNIQUE(user_id, client_id, issuer_url)
);
```

---

## Known Issues

### Claude.ai OAuth Bug (December 2025)

**Status:** BROKEN as of December 18, 2025

**Symptom:** Claude Desktop/Web opens internal OAuth URL instead of calling MCP server endpoints.

**Impact:** OAuth-protected MCP servers cannot be used with Claude.ai.

**Tracking:** [GitHub Issue #5](https://github.com/anthropics/claude-ai-mcp/issues/5)

**Workaround:** Use API token authentication (current implementation) until fixed.

### Local Development with Self-Signed Certs

For localhost development, set:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This disables SSL certificate verification for the MCP server connecting to local Kanbu.

---

## Environment Variables

### MCP Server

```env
# Target Kanbu instance
KANBU_URL=https://app.kanbu.be

# For local development only
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### OAuth Server (Kanbu API)

```env
# OAuth Configuration
OAUTH_ISSUER=https://app.kanbu.be
OAUTH_ACCESS_TOKEN_TTL=3600        # 1 hour
OAUTH_REFRESH_TOKEN_TTL=604800     # 7 days
OAUTH_CODE_TTL=600                 # 10 minutes

# JWT Signing Keys
OAUTH_JWT_ALGORITHM=RS256
OAUTH_JWT_PRIVATE_KEY_PATH=/etc/kanbu/oauth-private.pem
OAUTH_JWT_PUBLIC_KEY_PATH=/etc/kanbu/oauth-public.pem

# Or use inline keys (base64 encoded)
OAUTH_JWT_PRIVATE_KEY_BASE64=...
OAUTH_JWT_PUBLIC_KEY_BASE64=...
```

---

## Sources

### Official Documentation

- [Claude Help Center - Building Custom Connectors](https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [MCP Security Tutorial](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
- [OpenAI GPT Actions Authentication](https://platform.openai.com/docs/actions/authentication)

### RFCs

- [RFC 7591 - Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [RFC 7662 - Token Introspection](https://tools.ietf.org/html/rfc7662)
- [RFC 8414 - Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [RFC 9728 - Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)

### Community Resources

- [WorkOS MCP Auth Guide](https://workos.com/blog/mcp-auth-developer-guide)
- [MCP DCR Explained](https://blog.christianposta.com/understanding-mcp-authorization-with-dynamic-client-registration/)
- [GitHub Issue #5 - Claude OAuth Bug](https://github.com/anthropics/claude-ai-mcp/issues/5)
