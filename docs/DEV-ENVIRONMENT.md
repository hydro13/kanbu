# Kanbu Development Environment

## Overview

Kanbu runs on HTTPS in development for:

- GitHub App webhooks and OAuth callbacks
- Secure API communication
- Tailscale network access

## Services

| Service    | Port | Protocol  | Description       |
| ---------- | ---- | --------- | ----------------- |
| PostgreSQL | 5432 | TCP       | Database (Docker) |
| API Server | 3001 | **HTTPS** | Fastify + tRPC    |
| Web Server | 5173 | **HTTPS** | Vite dev server   |

## Starting

```bash
# 1. Database (if not running)
sudo docker compose up -d postgres

# 2. API Server
bash scripts/api.sh start

# 3. Web Server
cd apps/web && pnpm dev
```

## ⚠️ CRITICAL CONFIGURATION - DO NOT TOUCH!

### Web Server (Vite)

**File:** `apps/web/vite.config.ts`

**WARNING:** Do NOT modify this file without consultation!

The configuration contains:

- HTTPS with self-signed certificates (mkcert)
- Proxy configuration to HTTPS API
- Host configuration for network access

### Known Issues

#### Vite .js vs .ts Config Conflict

**CRITICAL:** Vite prefers `.js` over `.ts` config files!

If both `vite.config.js` and `vite.config.ts` exist, Vite loads the `.js` version.

**Solution:** Ensure ONLY `vite.config.ts` exists:

```bash
ls apps/web/vite.config.*
# Should only show vite.config.ts!

# If .js exists, remove it:
rm apps/web/vite.config.js
```

#### Vite 7.x HTTPS Bug

Vite 7.x has issues with HTTPS configuration. Use Vite 6.x:

```json
"vite": "^6.4.1"
```

**DO NOT upgrade to Vite 7!**

## SSL Certificates

Certificates are created with `mkcert` and stored in `certs/`:

```
certs/
├── localhost+4.pem      # Certificate
└── localhost+4-key.pem  # Private key
```

These certificates are valid for:

- localhost
- your-hostname
- your-hostname.tailscale-domain.ts.net (optional)
- 127.0.0.1
- ::1

### Renewing Certificates

If certificates expire or you need new hosts:

```bash
# Install mkcert (one-time)
sudo apt install mkcert
mkcert -install

# Generate new certificates
cd certs/
mkcert localhost your-hostname 127.0.0.1 ::1
```

## API Server

The API server also runs on HTTPS. Manage via script:

```bash
# Start
bash scripts/api.sh start

# Stop
bash scripts/api.sh stop

# Status
bash scripts/api.sh status

# View logs
tail -f /tmp/kanbu-api.log
```

## Troubleshooting

### Web server starts on HTTP instead of HTTPS

1. Check that `vite.config.js` does NOT exist:

   ```bash
   ls apps/web/vite.config.js
   # Should return "No such file"
   ```

2. Check certificates:

   ```bash
   ls -la certs/
   # Should show localhost+4.pem and localhost+4-key.pem
   ```

3. Check Vite version:
   ```bash
   cat apps/web/package.json | grep '"vite"'
   # Should be 6.x, NOT 7.x
   ```

### API unreachable

1. Check if API is running:

   ```bash
   bash scripts/api.sh status
   ```

2. Check HTTPS:
   ```bash
   curl -sk https://localhost:3001/health
   ```

### Mixed Content Errors

If browser complains about mixed content:

- Web MUST run on HTTPS
- API MUST run on HTTPS
- Both use self-signed certificates

## GitHub App Integration

The GitHub App requires HTTPS for:

- OAuth callback: `https://your-domain.com/api/github/callback`
- Webhooks: `https://your-domain.com/api/webhooks/github`

If HTTPS doesn't work, the entire GitHub integration won't work!
