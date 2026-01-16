# Kanbu Development Environment

## Overview

Kanbu draait op HTTPS in development voor:
- GitHub App webhooks en OAuth callbacks
- Veilige API communicatie
- Tailscale netwerk toegang

## Services

| Service | Poort | Protocol | Beschrijving |
|---------|-------|----------|--------------|
| PostgreSQL | 5432 | TCP | Database (Docker) |
| API Server | 3001 | **HTTPS** | Fastify + tRPC |
| Web Server | 5173 | **HTTPS** | Vite dev server |

## Starten

```bash
# 1. Database (als niet draait)
sudo docker compose up -d postgres

# 2. API Server
bash scripts/api.sh start

# 3. Web Server
cd apps/web && pnpm dev
```

## ⚠️ KRITIEKE CONFIGURATIE - NIET AANRAKEN!

### Web Server (Vite)

**Bestand:** `apps/web/vite.config.ts`

**WAARSCHUWING:** Wijzig dit bestand NIET zonder overleg!

De configuratie bevat:
- HTTPS met zelf-gesigneerde certificaten (mkcert)
- Proxy configuratie naar HTTPS API
- Host configuratie voor netwerk toegang

### Bekende Issues

#### Vite .js vs .ts Config Conflict

**KRITIEK:** Vite prefereert `.js` boven `.ts` config bestanden!

Als er zowel `vite.config.js` als `vite.config.ts` bestaat, laadt Vite de `.js` versie.

**Oplossing:** Zorg dat er ALLEEN `vite.config.ts` bestaat:
```bash
ls apps/web/vite.config.*
# Moet alleen vite.config.ts tonen!

# Als .js bestaat, verwijder het:
rm apps/web/vite.config.js
```

#### Vite 7.x HTTPS Bug

Vite 7.x heeft problemen met HTTPS configuratie. Gebruik Vite 6.x:
```json
"vite": "^6.4.1"
```

**NIET upgraden naar Vite 7!**

## SSL Certificaten

Certificaten zijn gemaakt met `mkcert` en staan in `certs/`:

```
certs/
├── localhost+4.pem      # Certificaat
└── localhost+4-key.pem  # Private key
```

Deze certificaten zijn geldig voor:
- localhost
- your-hostname
- your-hostname.tailscale-domain.ts.net (optional)
- 127.0.0.1
- ::1

### Certificaten Vernieuwen

Als certificaten verlopen of je nieuwe hosts nodig hebt:

```bash
# Installeer mkcert (eenmalig)
sudo apt install mkcert
mkcert -install

# Genereer nieuwe certificaten
cd certs/
mkcert localhost your-hostname 127.0.0.1 ::1
```

## API Server

De API server draait ook op HTTPS. Beheer via script:

```bash
# Start
bash scripts/api.sh start

# Stop
bash scripts/api.sh stop

# Status
bash scripts/api.sh status

# Logs bekijken
tail -f /tmp/kanbu-api.log
```

## Troubleshooting

### Web server start op HTTP ipv HTTPS

1. Check of `vite.config.js` NIET bestaat:
   ```bash
   ls apps/web/vite.config.js
   # Moet "No such file" geven
   ```

2. Check certificaten:
   ```bash
   ls -la certs/
   # Moet localhost+4.pem en localhost+4-key.pem tonen
   ```

3. Check Vite versie:
   ```bash
   cat apps/web/package.json | grep '"vite"'
   # Moet 6.x zijn, NIET 7.x
   ```

### API onbereikbaar

1. Check of API draait:
   ```bash
   bash scripts/api.sh status
   ```

2. Check HTTPS:
   ```bash
   curl -sk https://localhost:3001/health
   ```

### Mixed Content Errors

Als browser klaagt over mixed content:
- Web MOET op HTTPS draaien
- API MOET op HTTPS draaien
- Beide gebruiken zelf-gesigneerde certificaten

## GitHub App Integratie

De GitHub App vereist HTTPS voor:
- OAuth callback: `https://your-domain.com/api/github/callback`
- Webhooks: `https://your-domain.com/api/webhooks/github`

Als HTTPS niet werkt, werkt de hele GitHub integratie niet!
