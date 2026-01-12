# Research: OpenCode - Open Source AI Coding Agent

> **Datum:** 2026-01-12
> **Fase:** 14.0.3
> **Status:** COMPLEET
> **Conclusie:** Waardevolle inspiratie voor multi-provider abstractie; geen directe integratie aanbevolen

---

## Samenvatting

OpenCode is een open source AI coding agent met 50.000+ GitHub stars, ontwikkeld in Go. Het biedt een TUI (Terminal User Interface) voor interactie met 75+ LLM providers en ondersteuning voor lokale modellen via Ollama. De architectuur is gebaseerd op de AI SDK en Models.dev voor provider abstractie.

**Key Takeaways voor Kanbu:**
- Provider abstractie via `@ai-sdk/openai-compatible` is een bewezen patroon
- OpenCode Zen demonstreert curated model selectie met benchmarking
- Context window management voor Ollama (default 4096) is kritiek
- SDK beschikbaar voor programmatische integratie

---

## Wat is OpenCode?

### Basis Informatie

| Eigenschap | Waarde |
|------------|--------|
| Type | Open source AI coding agent |
| Taal | Go (TUI met Bubble Tea) |
| GitHub Stars | 50.000+ |
| Contributors | 500+ |
| Monthly Users | 650.000+ |
| Licentie | Open source |
| Website | [opencode.ai](https://opencode.ai/) |
| Repository | [github.com/opencode-ai/opencode](https://github.com/opencode-ai/opencode) |

### Core Features

1. **Terminal-First Design**
   - TUI gebouwd met Bubble Tea framework
   - Gemaakt door creators van terminal.shop
   - Neovim-achtige workflow

2. **Client/Server Architectuur**
   - Server draait lokaal
   - Remote aansturing mogelijk (mobile app)
   - SDK voor programmatische integratie

3. **Provider Agnostic**
   - 75+ LLM providers via AI SDK en Models.dev
   - Custom provider configuratie mogelijk
   - OpenAI-compatible endpoint support

4. **GitHub Integratie**
   - Mention `/opencode` of `/oc` in issues/PRs
   - Automatische PR creatie
   - GitHub Actions workflow

5. **Privacy-First**
   - Geen code opslag op servers
   - Kan volledig offline draaien
   - Geschikt voor gevoelige omgevingen

---

## Provider Architectuur

### Ondersteunde Providers

**Major Cloud Providers:**
- Anthropic (Claude)
- OpenAI
- Google Vertex AI
- Azure OpenAI & Cognitive Services
- Amazon Bedrock

**Specialized AI Services:**
- Groq, DeepSeek, xAI, Together AI
- Hugging Face, OpenRouter, Vercel AI Gateway
- GitHub Copilot

**Local Models:**
- Ollama
- LM Studio
- llama.cpp

### Configuratie Structuur

OpenCode gebruikt een JSON configuratie (`~/.config/opencode/opencode.json`):

```json
{
  "provider": {
    "custom-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Display Name",
      "options": {
        "baseURL": "https://api.endpoint.com/v1"
      },
      "models": {
        "model-id": {
          "name": "Model Name",
          "inputPrice": 0.5,
          "outputPrice": 1.5
        }
      }
    }
  }
}
```

### Authenticatie

- API keys via `/connect` command
- Opgeslagen in `~/.local/share/opencode/auth.json`
- Supports environment variables
- "Bring Your Own Key" (BYOK) support

---

## OpenCode Zen

### Wat is het?

OpenCode Zen is een curated AI gateway service die:
- Geteste en geverifieerde modellen biedt
- Geoptimaliseerd is voor coding agents
- Pay-as-you-go pricing heeft

### Beschikbare Modellen (januari 2026)

| Provider | Modellen |
|----------|----------|
| OpenAI | GPT 5.2, 5.1, 5, Codex, Nano |
| Anthropic | Claude Opus 4.5/4.1, Sonnet 4.5/4, Haiku 4.5/3.5 |
| Google | Gemini 3 Pro, 3 Flash |
| Chinese | Kimi K2, Qwen3 Coder, GLM-4.7 |
| Other | Grok Code, MiniMax M2.1, Big Pickle |

### Pricing Model

| Categorie | Voorbeelden | Input/Output per 1M |
|-----------|-------------|---------------------|
| Free Tier | GPT 5 Nano, Grok Code, GLM-4.7, MiniMax M2.1 | $0/$0 |
| Budget | Claude Haiku, Gemini Flash | $0.50-$1/$3-$5 |
| Premium | Claude Opus, GPT 5.2 | $1.75-$5/$14-$25 |

**Features:**
- Auto-reload bij $5 threshold (default $20)
- Monthly spending limits per member
- BYOK support voor OpenAI/Anthropic
- 4.4% + $0.30 credit card processing fee

### Team Management

- Invite teammates met roles (Admin/Member)
- Model access control per workspace
- Per-member spending limits
- Zero-retention data policy (US hosting)

---

## Ollama Integratie

### Configuratie

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "qwen3:8b": {
          "name": "Qwen 3 8B"
        }
      }
    }
  }
}
```

### Context Window Issue

**KRITIEK:** Ollama default context window is 4096 tokens!

Dit is te klein voor agentic workflows. Oplossingen:

**Methode 1: Per-model configuratie**
```bash
ollama run <model_name>
/set parameter num_ctx 32768
/save <model_name>
```

**Methode 2: Environment variable**
```bash
export OLLAMA_CONTEXT_LENGTH=32000
# Of in systemd:
Environment="OLLAMA_CONTEXT_LENGTH=32000"
```

### Aanbevolen Modellen

Voor agentic workflows met tool support:
- `qwen3:8b` - Goede balance performance/kwaliteit
- `llama3.1:8b` - Sterke tool calling
- `mistral:7b` - Snel, betrouwbaar

---

## SDK & Programmatic Access

### Installatie

```bash
npm install @opencode-ai/sdk
```

### Basis Gebruik

```typescript
import { createOpencode } from "@opencode-ai/sdk"

// Start server met client
const { client } = await createOpencode()

// Of verbind met bestaande server
import { createOpencodeClient } from "@opencode-ai/sdk"
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096"
})
```

### API Capabilities

| Category | Functions |
|----------|-----------|
| Global & App | Health checks, logging, agent discovery |
| Projects & Files | List, search, read, workspace symbols |
| Sessions | Create, prompt, command exec, history, revert |
| TUI Control | Append prompts, notifications, dialogs |
| Auth | Set API credentials |
| Events | SSE event streams |

### TypeScript Support

- Volledige TypeScript definitions
- Generated from OpenAPI specs
- Type-safe client calls

---

## GitHub Actions Integratie

### Setup

1. Install GitHub app: [github.com/apps/opencode-agent](https://github.com/apps/opencode-agent)
2. Add workflow file: `.github/workflows/opencode.yml`
3. Configure repository secrets

### Trigger Events

| Event | Beschrijving |
|-------|--------------|
| `issue_comment` | Mention `/opencode` in comments |
| `pull_request_review_comment` | Code line comments |
| `issues` | New/edited issues |
| `pull_request` | Auto-review PR changes |
| `schedule` | Cron-based tasks |
| `workflow_dispatch` | Manual UI triggers |

### Use Cases

- Issue triage en analyse
- Bug fixes met automatische PR
- Feature implementatie
- Code review feedback

---

## Vergelijking met Kanbu Requirements

### Provider Abstractie

| Feature | OpenCode | Kanbu Requirement |
|---------|----------|-------------------|
| Multi-provider | ✅ 75+ providers | ✅ Nodig |
| OpenAI-compatible | ✅ Via AI SDK | ✅ Nodig |
| Ollama support | ✅ Native | ✅ Nodig |
| Provider hierarchy | ❌ Single config | ✅ Global → Workspace → Project |
| Admin UI | ❌ CLI only | ✅ Web-based |

### Embedding Support

| Feature | OpenCode | Kanbu Requirement |
|---------|----------|-------------------|
| Text embeddings | ❌ Geen focus | ✅ Kritiek voor Wiki/Search |
| Vector storage | ❌ N/A | ✅ FalkorDB/Qdrant |
| Semantic search | ❌ N/A | ✅ Hybrid search |

### Memory & Context

| Feature | OpenCode | Kanbu Requirement |
|---------|----------|-------------------|
| Session persistence | ✅ SQLite | ✅ Via Prisma |
| LSP integration | ✅ Native | ❌ Not needed |
| Cross-project context | ❌ Limited | ✅ Workspace-wide |

---

## Relevantie voor Kanbu

### Bruikbaar als Inspiratie

1. **Provider Abstractie Patroon**
   - `@ai-sdk/openai-compatible` npm package
   - JSON-based provider configuratie
   - Models.dev integratie

2. **Context Window Management**
   - Ollama default 4096 probleem
   - num_ctx configuratie vereist

3. **Curated Model Lists**
   - OpenCode Zen benchmark approach
   - Free tier + premium modellen
   - Team spending controls

### NIET Bruikbaar voor Kanbu

1. **Geen Embedding Support**
   - OpenCode is gericht op code generatie
   - Geen vector/semantic search
   - Niet geschikt als Wiki backend

2. **CLI-First Design**
   - TUI is niet embeddable in web
   - SDK is gericht op CLI control
   - Geen web component library

3. **Single-Level Config**
   - Geen provider hierarchy
   - Geen workspace/project overrides
   - Geen admin UI

---

## Conclusie & Aanbevelingen

### Verdict

**Niet aanbevolen voor directe integratie** maar **waardevolle inspiratiebron**.

### Waarom Niet Direct Integreren?

1. **Mismatch in focus:** OpenCode = code generation, Kanbu = knowledge management
2. **Geen embeddings:** Kritieke feature voor Kanbu Wiki ontbreekt
3. **CLI-only:** Niet geschikt voor web-based admin

### Wat Kunnen We Overnemen?

1. **Provider Config Pattern**
   ```typescript
   // Kanbu kan vergelijkbaar JSON schema gebruiken
   {
     "npm": "@ai-sdk/openai-compatible",
     "baseURL": "http://localhost:11434/v1"
   }
   ```

2. **Ollama Context Fix**
   - Documenteer num_ctx vereiste in Kanbu docs
   - Overweeg automatische detectie/waarschuwing

3. **Model Curation Approach**
   - Benchmark-based model aanbevelingen
   - Free vs Premium tier scheiding
   - Per-workspace spending limits

### Alternatieve Providers

Voor Kanbu's AI Provider Configuration (Fase 14):

| Provider | LLM | Embeddings | Self-hosted | Aanbeveling |
|----------|-----|------------|-------------|-------------|
| OpenAI | ✅ | ✅ | ❌ | ✅ Default cloud |
| Anthropic | ✅ | ❌ | ❌ | ⚠️ Alleen chat |
| Ollama | ✅ | ✅ | ✅ | ✅ Default local |
| Z.ai (GLM-4.7) | ✅ | ✅ | ❌ | ✅ Code specialist |
| Abacus.ai | ✅ | ❌* | ❌ | ❌ Geen embeddings |

*Abacus.ai embeddings alleen in Enterprise tier ($5K+/month)

---

## Bronnen

- [OpenCode Website](https://opencode.ai/)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [OpenCode Zen](https://opencode.ai/zen)
- [OpenCode SDK](https://opencode.ai/docs/sdk/)
- [OpenCode Providers](https://opencode.ai/docs/providers/)
- [Models.dev](https://models.dev/)
- [AI SDK](https://sdk.vercel.ai/)
- [Ollama + OpenCode Guide](https://github.com/p-lemonish/ollama-x-opencode)
