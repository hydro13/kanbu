# Research: LM Studio - Local Model Server

> **Datum:** 2026-01-12
> **Fase:** 14.0.5
> **Status:** COMPLEET
> **Conclusie:** Uitstekend alternatief voor eindgebruikers met GUI; Ollama blijft beter voor server/headless deployments

---

## Samenvatting

LM Studio is een desktop applicatie voor het lokaal draaien van LLMs, ontwikkeld door Element Labs, Inc. Het biedt een gebruiksvriendelijke GUI, OpenAI-compatible API, en ondersteuning voor GGUF en MLX modellen. De applicatie is gratis voor thuis- en werkgebruik.

**Key Takeaways voor Kanbu:**
- OpenAI-compatible API endpoints (`/v1/chat/completions`, `/v1/embeddings`)
- Headless server mode beschikbaar via CLI (`lms`)
- Embedding modellen ondersteund (nomic-embed-text, bge-small)
- GUI voordeel voor eindgebruikers vs Ollama's CLI
- Ollama 20% sneller in benchmarks, maar LM Studio beter op integrated GPUs

---

## Wat is LM Studio?

### Basis Informatie

| Eigenschap | Waarde |
|------------|--------|
| Type | Desktop applicatie + local server |
| Ontwikkelaar | Element Labs, Inc. (opgericht 2023) |
| Licentie | Gratis (closed source) |
| Huidige versie | 0.3.37 (januari 2026) |
| Platforms | macOS, Windows, Linux |
| Website | [lmstudio.ai](https://lmstudio.ai/) |
| GitHub | [github.com/lmstudio-ai/lms](https://github.com/lmstudio-ai/lms) (CLI only) |

### Core Features

1. **Desktop-First Design**
   - Intuïtieve GUI voor model management
   - Drag-and-drop model installatie
   - Real-time performance monitoring
   - 1000+ pre-configured modellen in library

2. **Inference Engines**
   - **llama.cpp** - GGUF modellen (alle platforms)
   - **MLX** - Apple Silicon geoptimaliseerd (macOS only)

3. **Server Mode**
   - OpenAI-compatible REST API
   - Headless operation mogelijk
   - Just-In-Time (JIT) model loading
   - Auto-start bij system login

4. **CLI Tool (`lms`)**
   - Model download en management
   - Server control (start/stop/status)
   - Interactive chat mode
   - Volledig scriptable

---

## System Requirements

### macOS

| Vereiste | Specificatie |
|----------|--------------|
| Chip | Apple Silicon (M1-M4) **only** |
| OS | macOS 14.0+ (Sonoma) |
| RAM | 16GB aanbevolen (8GB minimum) |
| Note | **Intel Macs niet ondersteund** |

### Windows

| Vereiste | Specificatie |
|----------|--------------|
| OS | Windows 10/11 (x64 of ARM) |
| CPU | AVX2 instructie set vereist |
| RAM | 16GB aanbevolen |
| GPU | 4GB+ dedicated VRAM aanbevolen |

### Linux

| Vereiste | Specificatie |
|----------|--------------|
| OS | Ubuntu 20.04+ (AppImage) |
| Architectuur | x64 of ARM64 (aarch64) |
| CPU | AVX2 support (x64) |
| RAM | 16GB aanbevolen |
| Note | Ubuntu >22 minder getest |

---

## OpenAI-Compatible API

### Ondersteunde Endpoints

| Endpoint | Beschrijving | Status |
|----------|--------------|--------|
| `GET /v1/models` | Lijst beschikbare modellen | ✅ |
| `POST /v1/chat/completions` | Chat met streaming | ✅ |
| `POST /v1/embeddings` | Text embeddings | ✅ |
| `POST /v1/completions` | Legacy text completion | ✅ |
| `POST /v1/responses` | Stateful + reasoning (nieuw) | ✅ |

### LM Studio Native API (v0)

| Endpoint | Beschrijving |
|----------|--------------|
| `GET /api/v0/models` | Gedetailleerde model info |
| `POST /api/v0/chat/completions` | Chat met extra stats |
| `POST /api/v0/embeddings` | Embeddings generatie |

### Configuratie

**Default URL:** `http://localhost:1234/v1`

```typescript
// Voorbeeld: OpenAI SDK naar LM Studio
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'lm-studio'  // Niet nodig, maar SDK vereist het
})

const response = await client.chat.completions.create({
  model: 'qwen3-8b',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true
})
```

### Geavanceerde Features

| Feature | Status | Notities |
|---------|--------|----------|
| Streaming (SSE) | ✅ | Volledig ondersteund |
| Tool Calling | ⚠️ | Experimenteel - model-afhankelijk |
| Structured Output | ✅ | JSON schema via grammar |
| Vision (multimodal) | ✅ | JPEG, PNG, WebP |

**Beperking:** Kleinere modellen kunnen tool calls foutief formatteren.

---

## Embedding Support

### Beschikbare Modellen

| Model | Architectuur | Dimensies | Context | Grootte |
|-------|--------------|-----------|---------|---------|
| nomic-embed-text-v1.5 | Nomic BERT | 768 | 8192 | ~84 MB (Q4) |
| bge-small-en-v1.5 | BERT | 384 | 512 | ~25 MB |
| nomic-embed-code | Qwen2 | 768 | 8192 | ~100 MB |

### API Gebruik

```bash
curl http://localhost:1234/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-nomic-embed-text-v1.5",
    "input": "Hello world"
  }'
```

### Python SDK

```python
import lmstudio as lms

model = lms.embedding_model("nomic-embed-text-v1.5")
embedding = model.embed("Hello, world!")
# Returns: list[float] with 768 dimensions
```

**Conclusie:** LM Studio ondersteunt dezelfde embedding modellen als Ollama (nomic-embed-text). API is OpenAI-compatible.

---

## CLI Tool: `lms`

### Installatie

`lms` wordt automatisch geïnstalleerd met LM Studio. Na eerste app launch beschikbaar in PATH.

### Belangrijkste Commando's

#### Model Management

```bash
# Zoek en download model
lms get qwen3-8b
lms get https://huggingface.co/lmstudio-community/granite-3.0-2b-instruct-GGUF@q8_0

# Lijst modellen
lms ls                    # Op disk
lms ps                    # In memory

# Load/unload
lms load qwen3-8b --gpu=max --context-length=8192
lms unload qwen3-8b
```

#### Server Control

```bash
# Start server
lms server start --port 1234 --cors

# Check status
lms server status --json

# Stop server
lms server stop

# Stream logs
lms log stream --source server --stats
```

#### Interactive Chat

```bash
# Start chat session
lms chat qwen3-8b

# Single prompt
lms chat qwen3-8b -p "Write a haiku"

# Custom system prompt
lms chat qwen3-8b -s "You are a helpful coding assistant"
```

### GPU Offload Opties

```bash
lms load model-name --gpu=max      # Alles naar GPU
lms load model-name --gpu=auto     # Automatisch bepalen
lms load model-name --gpu=0.5      # 50% naar GPU
lms load model-name --estimate-only  # Preview memory gebruik
```

---

## Headless / Server Mode

### Configuratie Opties

| Optie | Beschrijving |
|-------|--------------|
| Auto-start on login | App Settings > "Run LLM server on login" |
| JIT Model Loading | Automatisch laden bij request |
| TTL (Time-To-Live) | Auto-unload na X seconden idle |
| Auto-Evict | Oude modellen verwijderen voor nieuwe |
| CORS | Enable voor web clients |
| Local Network | Toestaan van andere devices |

### JIT Model Loading

```bash
# Request naar niet-geladen model → auto-load
curl http://localhost:1234/v1/chat/completions \
  -d '{"model": "qwen3-8b", "messages": [...], "ttl": 300}'
```

**Let op:** In v0.3.5+ moet TTL expliciet gezet worden. Models blijven anders in memory.

### Headless op Linux

```bash
# Start server zonder GUI
lms server start --port 1234

# Controleer status
lms server status

# Server draait totdat gestopt
lms server stop
```

**Beperking:** LM Studio vereist GUI support op het systeem. Volledig headless (zonder X11/Wayland) is **niet mogelijk** - anders dan Ollama.

---

## Vergelijking: LM Studio vs Ollama

### Performance Benchmarks

**Test setup:** Apple M3 Max, 64GB RAM, 40-core GPU

| Metric | Ollama | LM Studio | Winner |
|--------|--------|-----------|--------|
| Cold Start Time | 3.2s | 8.7s | Ollama |
| First Token Latency | 145ms | 280ms | Ollama |
| Tokens/sec (3B model) | 85.2 t/s | 72.8 t/s | Ollama |
| Memory Usage | 4.2GB | 5.8GB | Ollama |
| GPU Utilization | 95% | 87% | Ollama |

**Conclusie:** Ollama is ~20% sneller in raw performance.

### Feature Vergelijking

| Feature | Ollama | LM Studio |
|---------|--------|-----------|
| Licentie | MIT (open source) | Gratis (closed source) |
| Interface | CLI + API | GUI + CLI + API |
| Headless (no GUI) | ✅ Volledig | ⚠️ Vereist GUI support |
| Multi-model concurrent | ✅ | ❌ Model switching |
| OpenAI-compatible API | ✅ | ✅ |
| Embeddings | ✅ | ✅ |
| Tool Calling | Mature | Experimenteel |
| MLX Support | ❌ | ✅ (macOS) |
| Vulkan (integrated GPU) | ❌ | ✅ |
| Model Library | Ollama.com | HuggingFace direct |
| GGUF Support | ✅ | ✅ |

### Wanneer Welke Kiezen?

| Scenario | Aanbeveling |
|----------|-------------|
| Server/headless deployment | **Ollama** |
| Docker/Kubernetes | **Ollama** |
| Production API | **Ollama** |
| Eindgebruiker met GUI | **LM Studio** |
| Integrated GPU (Intel/AMD) | **LM Studio** |
| Apple Silicon optimaal | **LM Studio** (MLX) |
| Team collaboration | **LM Studio** (2025 feature) |
| Non-technical users | **LM Studio** |

---

## Hardware Compatibility

### GPU Support

| Vendor | LM Studio | Ollama | Notes |
|--------|-----------|--------|-------|
| NVIDIA CUDA | ✅ (incl. RTX 50) | ✅ | Best support beide |
| AMD ROCm | ✅ | ✅ | LM Studio via Vulkan |
| Apple Metal | ✅ (MLX) | ✅ | LM Studio MLX sneller |
| Intel Arc (Vulkan) | ✅ | ⚠️ | LM Studio beter |
| Integrated GPU | ✅ (Vulkan) | ❌ | LM Studio enige optie |

### VRAM Aanbevelingen

| Tier | VRAM | Model Size | Context |
|------|------|------------|---------|
| Entry | 4-6 GB | 3-4B Q4 | ~4K tokens |
| Mid | 8-12 GB | 7-14B Q4 | ~8K tokens |
| High | 16-24 GB | 13-30B Q4 | ~16K tokens |
| Pro | 48+ GB | 70B Q4 | ~32K tokens |

### VRAM Berekening

```
Memory (GB) = (Parameters × Bits/8) × 1.2

Voorbeeld 7B model Q4:
= (7 × 4/8) × 1.2
= 4.2 GB
```

---

## Relevantie voor Kanbu

### Als Alternatief voor Ollama

| Aspect | Beoordeling | Notities |
|--------|-------------|----------|
| OpenAI-compatible API | ✅ Excellent | Zelfde endpoints als Ollama |
| Embedding support | ✅ Excellent | nomic-embed-text beschikbaar |
| Headless operation | ⚠️ Beperkt | Vereist GUI support op systeem |
| Docker deployment | ❌ Niet mogelijk | Geen official image |
| Performance | ⚠️ 20% trager | Maar beter op integrated GPUs |

### Kanbu Provider Support

```typescript
// Dezelfde code werkt voor beide!
const config = {
  baseURL: isOllama
    ? 'http://localhost:11434/v1'
    : 'http://localhost:1234/v1',
  apiKey: 'unused'
}
```

### Aanbevolen Scenario's

**Gebruik LM Studio voor:**
- Eindgebruikers die Kanbu lokaal draaien op laptop/desktop
- Gebruikers zonder dedicated GPU (integrated graphics)
- macOS gebruikers die MLX optimalisatie willen
- Niet-technische gebruikers die visuele feedback willen

**Gebruik Ollama voor:**
- Server deployments (VPS, on-premise)
- Docker/Kubernetes omgevingen
- Headless Linux servers
- Production API services
- Automated pipelines

---

## Conclusie & Aanbevelingen

### Verdict

**LM Studio als OPTIONEEL ALTERNATIEF voor Ollama** - niet als primaire provider.

### Waarom Optioneel?

1. **Closed source** - Ollama is MIT licensed, LM Studio niet
2. **Geen echte headless** - Vereist GUI support, niet geschikt voor servers
3. **Performance** - 20% langzamer dan Ollama in benchmarks
4. **Docker** - Geen official container image

### Wanneer Wel Aanraden?

1. **Integrated GPU users** - LM Studio's Vulkan support is uniek
2. **macOS/MLX** - Betere Apple Silicon optimalisatie
3. **GUI preference** - Voor eindgebruikers die visuele interface willen
4. **Team evaluation** - Built-in collaboration features (2025)

### Kanbu Implementatie Strategie

```
Fase 14.3 Provider Abstraction:

1. Primair: Ollama (server/headless)
2. Secundair: LM Studio (desktop/GUI users)
3. Cloud fallback: OpenAI/Anthropic

Beide via zelfde @ai-sdk/openai-compatible interface!
```

### Configuratie Verschillen

| Setting | Ollama | LM Studio |
|---------|--------|-----------|
| Default Port | 11434 | 1234 |
| API Path | `/v1` | `/v1` |
| Default Context | 2048 | Varies per model |
| Model Format | GGUF | GGUF + MLX |

---

## Bronnen

- [LM Studio Website](https://lmstudio.ai/)
- [LM Studio Documentation](https://lmstudio.ai/docs/)
- [LM Studio CLI (lms)](https://lmstudio.ai/docs/cli)
- [OpenAI Compatibility Docs](https://lmstudio.ai/docs/developer/openai-compat)
- [Headless Mode Guide](https://lmstudio.ai/docs/advanced/headless)
- [System Requirements](https://lmstudio.ai/docs/app/system-requirements)
- [LM Studio vs Ollama 2025](https://hyscaler.com/insights/ollama-vs-lm-studio/)
- [Local LLM Hosting Guide 2025](https://www.glukhov.org/post/2025/11/hosting-llms-ollama-localai-jan-lmstudio-vllm-comparison/)
- [LM Studio Blog - v0.3.29](https://lmstudio.ai/blog/lmstudio-v0.3.29)
- [LM Studio Blog - v0.3.15 RTX 50](https://lmstudio.ai/blog/lmstudio-v0.3.15)
