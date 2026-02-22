# Claude Code Prompt: packages/openclaw-bridge/

## Taak

Bouw `packages/openclaw-bridge/` in de Kanbu monorepo — een TypeScript package die Kanbu verbindt met een OpenClaw gateway.

## Context

- Repo: `~/genx/v6/dev/kanbu/` (pnpm monorepo, branch: develop)
- Package naam: `@kanbu/openclaw-bridge`
- Pattern: volg structuur van `packages/shared/` (TypeScript, dist/, index.ts)
- Node.js ≥22, pnpm

## Wat het moet doen

De bridge verbindt Kanbu met een OpenClaw gateway via de OpenAI-compatible HTTP endpoint (simpel) of WebSocket (uitgebreid). Begin met de HTTP variant — die werkt al bewezen (Max's gateway heeft `chatCompletions.enabled: true`).

### Kern functionaliteit:

**1. OpenClawHttpClient** (MVP — begin hier)
Gebruikt `POST /v1/chat/completions` endpoint op de OpenClaw gateway.

```typescript
interface OpenClawConfig {
  gatewayUrl: string; // bijv. "http://100.88.203.92:18789"
  token: string; // Bearer token
  sessionKey?: string; // bijv. "agent:main:main", default: "agent:main:main"
  model?: string; // default: "openclaw:main"
}

class OpenClawHttpClient {
  constructor(config: OpenClawConfig);

  // Stuur een bericht naar een agent sessie, wacht op antwoord
  async send(message: string, sessionKey?: string): Promise<string>;

  // Dispatch een Kanbu taak naar een agent
  async dispatchTask(task: KanbuTaskContext, sessionKey: string): Promise<string>;

  // Test of de gateway bereikbaar is
  async ping(): Promise<boolean>;
}
```

**2. KanbuTaskContext** type (de context bundle)

```typescript
interface KanbuTaskContext {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  projectName: string;
  workspaceName: string;
  assignedAgentRole?: string;
  wikiContext?: string[]; // relevante wiki pagina content
  graphitiContext?: string; // Graphiti 1-hop snapshot (JSON string)
  customInstructions?: string;
}
```

**3. ApprovalBridge** (approval flow ondersteuning)

```typescript
interface PendingApproval {
  approvalId: string;
  runId: string;
  command: string;
  reason: string;
  requestedAt: Date;
  timeoutMs: number;
}

class ApprovalBridge {
  // Registreer een pending approval, returns promise die resolved als approved/rejected
  async waitForApproval(approval: PendingApproval): Promise<'approved' | 'rejected'>;

  // Resolve een pending approval (wordt aangeroepen vanuit Kanbu UI)
  resolve(approvalId: string, decision: 'approved' | 'rejected'): void;

  // Haal alle pending approvals op
  getPending(): PendingApproval[];
}
```

**4. buildTaskMessage** helper
Bouwt een geformatteerde prompt van een KanbuTaskContext:

```typescript
function buildTaskMessage(task: KanbuTaskContext): string;
// Output: Gestructureerde tekst met taak, project context, wiki context, instructies
```

## Bestanden om te maken

```
packages/openclaw-bridge/
  package.json
  tsconfig.json
  src/
    index.ts          ← exports alles
    client.ts         ← OpenClawHttpClient
    types.ts          ← alle TypeScript interfaces
    approval.ts       ← ApprovalBridge
    context.ts        ← buildTaskMessage + context helpers
  __tests__/
    client.test.ts    ← unit tests (mock fetch)
    context.test.ts   ← buildTaskMessage tests
  README.md
```

## package.json inhoud

```json
{
  "name": "@kanbu/openclaw-bridge",
  "version": "0.1.0",
  "description": "OpenClaw gateway bridge for Kanbu",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

## OpenClaw gateway protocol (HTTP variant)

**Endpoint:** `POST {gatewayUrl}/v1/chat/completions`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
x-openclaw-session-key: {sessionKey}
```

**Body:**

```json
{
  "model": "openclaw:main",
  "messages": [{ "role": "user", "content": "..." }]
}
```

**Response:** OpenAI-compatible chat.completion response

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ]
}
```

## Verificatie

Na bouwen:

1. `pnpm typecheck` — geen TypeScript errors
2. `pnpm test` — alle tests groen
3. `pnpm build` — dist/ aangemaakt

## Wat NIET in scope is

- WebSocket variant (dat is Fase 2)
- Ed25519 device identity (niet nodig voor HTTP variant)
- UI componenten
- Prisma schema wijzigingen
- Integratie in apps/api (dat is de volgende stap)

## Notities

- Geen externe dependencies behalve Node.js built-ins
- fetch() is beschikbaar in Node.js ≥22
- Errors netjes afhandelen: network errors, 401, timeout
- Alle publieke methodes moeten JSDoc comments hebben
