# GLM-4.7 - Research Rapport

**Datum:** 2026-01-12
**Fase:** 14.0.4
**Onderzoeker:** Claude Code (AI Architect sessie)
**Status:** Compleet

---

## Executive Summary

GLM-4.7 is het nieuwste flagship model van Z.ai (voorheen Zhipu AI), uitgebracht op 22 december 2025. Het is een **358B parameter MoE model** dat uitblinkt in coding taken en #1 scoort op SWE-bench onder open-source modellen. Voor Kanbu is dit een **interessante optie** als self-hosted coding specialist, maar de **hardware requirements zijn zeer hoog** (135-205GB RAM/VRAM) voor de volledige versie.

**Conclusie:** Aanbevolen als optionele CODE capability provider via API ($0.40/$1.50 per 1M tokens) of via OpenRouter. Self-hosted is alleen haalbaar voor enterprise deployments met zware hardware. Z.ai biedt ook **embedding-3** model voor vector embeddings.

---

## 1. Model Overzicht

### 1.1 Basis Specificaties

| Specificatie | Waarde |
|--------------|--------|
| Ontwikkelaar | Z.ai (voorheen Zhipu AI, China) |
| Release datum | 22 december 2025 |
| Architectuur | Mixture of Experts (MoE) |
| Parameters | 358B totaal |
| Context Window | 200K tokens input |
| Max Output | 128K tokens |
| Inference Speed | 55 tokens/sec (API) |
| Licentie | Open-weights (Hugging Face) |

### 1.2 Benchmark Performance (december 2025)

| Benchmark | Score | Vergelijking |
|-----------|-------|--------------|
| SWE-bench Verified | **73.8%** | #1 open-source, +5.8% vs vorige |
| SWE-bench Multilingual | 66.7% | +12.9% verbetering |
| LiveCodeBench | **84.9%** | > Claude Sonnet 4.5 |
| Terminal Bench 2.0 | 41% | +16.5% verbetering |
| AIME 2025 (math) | 95.7% | Zeer sterke reasoning |
| HLE | +12.4% | vs GLM-4.6 |
| WebDev | #6 overall | #1 open model |

**Conclusie:** GLM-4.7 is de beste open-source coding model beschikbaar.

---

## 2. Model Varianten

### 2.1 GLM-4.7 Familie

| Model | Parameters | Context | Use Case |
|-------|------------|---------|----------|
| GLM-4.7 (Full) | 358B MoE | 200K | Flagship, beste performance |
| GLM-4.7-FP8 | 358B (FP8) | 200K | Geoptimaliseerd voor inference |

**Let op:** Anders dan in de initiële roadmap vermeld, zijn er **geen 9B of 32B varianten** van GLM-4.7 zelf. Die varianten bestaan voor oudere GLM-4 modellen.

### 2.2 Gerelateerde Modellen (GLM Familie)

| Model | Parameters | Prijs (per 1M tokens) |
|-------|------------|----------------------|
| GLM-4 32B | 32B | $0.10 / $0.10 |
| GLM-4.5 Air | 106B (12B actief) | $0.05 / $0.22 |
| GLM-4.5 | 355B (32B actief) | $0.35 / $1.55 |
| GLM-4.6 | - | $0.35 / $1.50 |
| **GLM-4.7** | 358B | **$0.40 / $1.50** |

### 2.3 Quantization Opties (GGUF)

| Quantization | Disk Space | VRAM/RAM Required | Performance |
|--------------|------------|-------------------|-------------|
| Full (BF16) | 400GB | 400GB+ | Best quality |
| Q4_K_XL | ~200GB | 205GB unified | 5+ tok/s |
| UD-Q2_K_XL | 135GB | 24GB GPU + 128GB RAM | Slower |
| UD-TQ1_0 | ~100GB | Lowest | Ollama compatible |

---

## 3. API Toegang

### 3.1 Officiële Z.ai API

**Endpoint:** `https://api.z.ai/api/paas/v4/chat/completions`

**Coding Endpoint:** `https://api.z.ai/api/coding/paas/v4` (voor coding tools)

**Authenticatie:** `Authorization: Bearer YOUR_API_KEY`

**Format:** OpenAI-compatible

### 3.2 Pricing

| Plan | Prijs | Features |
|------|-------|----------|
| Pay-as-you-go | $0.40/$1.50 per 1M tokens | Standard API |
| GLM Coding Plan | **$3/maand** | 3x quota, coding tools |

**Kosten voorbeeld:**
- 10.000 regels code analyseren (~40K input, 10K output) ≈ **$0.03**

### 3.3 Python SDK

```bash
pip install zai
```

```python
from zai import ZaiClient

client = ZaiClient(api_key="your-api-key")

response = client.chat.completions.create(
    model='glm-4.7',
    messages=[
        {'role': 'system', 'content': 'You are a helpful coding assistant.'},
        {'role': 'user', 'content': 'Write a Python function to sort a list.'},
    ],
    stream=True,
)
```

**Environment Variables:**
- `ZAI_API_KEY` - API key
- `ZAI_BASE_URL` - Optional custom endpoint

### 3.4 Alternatieve Providers (OpenAI-compatible)

| Provider | Endpoint | Opmerking |
|----------|----------|-----------|
| OpenRouter | `https://openrouter.ai/api/v1` | Model: `z-ai/glm-4.7` |
| DeepInfra | `https://api.deepinfra.com/v1/openai` | OpenAI-compatible |
| Novita AI | `https://api.novita.ai/v3/openai` | Pay per token |
| CometAPI | `https://api.cometapi.com/v1` | Model: `glm-4.7` |

---

## 4. Thinking Modes

GLM-4.7 introduceert geavanceerde reasoning capabilities:

### 4.1 Interleaved Thinking
- Model denkt **voor elke response** en tool call
- Verbetert accuracy bij complexe taken

### 4.2 Preserved Thinking
- Thinking blocks worden **bewaard over meerdere turns**
- Automatisch in multi-turn conversations
- Alleen SGLang support

### 4.3 Turn-level Thinking
- Per-turn controle over reasoning
- **Disable** voor snelle, simpele requests (lagere latency/cost)
- **Enable** voor complexe taken (betere accuracy)

**Configuratie (SGLang):**
```json
{
  "chat_template_kwargs": {
    "enable_thinking": true,
    "clear_thinking": false
  }
}
```

---

## 5. Local Deployment

### 5.1 Ollama

GLM-4.7 is beschikbaar op Ollama:

```bash
# 1-bit quantization (laagste VRAM)
ollama run hf.co/unsloth/GLM-4.7-GGUF:TQ1_0

# Cloud variant
ollama run glm-4.7:cloud
```

**Statistieken:**
- 10.1K downloads
- 198K context window
- Requires significant RAM for MoE offloading

### 5.2 vLLM

```bash
# Install nightly for GLM-4.7 support
pip install -U vllm --pre --index-url https://pypi.org/simple --extra-index-url https://wheels.vllm.ai/nightly

# Serve FP8 variant
vllm serve zai-org/GLM-4.7-FP8 \
  --tensor-parallel-size 4 \
  --tool-call-parser glm47 \
  --reasoning-parser glm45 \
  --enable-auto-tool-choice \
  --served-model-name glm-4.7-fp8
```

**Requirements:**
- vLLM main branch of nightly build
- 4x GPU voor tensor parallelism

### 5.3 SGLang

- Best support voor Preserved Thinking mode
- Main branch vereist

### 5.4 Hardware Requirements Matrix

| Setup | GPU | RAM | Expected Performance |
|-------|-----|-----|---------------------|
| Minimum | 1x 24GB | 128GB | ~1-2 tok/s (Q2) |
| Recommended | 1x 40GB | 205GB | ~5 tok/s (Q4) |
| Optimal | 4x 24GB | 256GB | ~20 tok/s (FP8) |
| Enterprise | 8x A100 80GB | 512GB | Full speed |

**Conclusie:** GLM-4.7 self-hosted is **NIET haalbaar** voor typische Kanbu Community Edition gebruikers.

---

## 6. Embedding Models

Z.ai biedt separate embedding modellen:

### 6.1 Beschikbare Modellen

| Model | Dimensies | Max Tokens |
|-------|-----------|------------|
| embedding-3 | Configureerbaar (bijv. 1024) | - |
| embedding-2 | 1024 | 512 |

### 6.2 API Usage

```python
from zai import ZaiClient

client = ZaiClient(api_key="your-api-key")

response = client.embeddings.create(
    model='embedding-3',
    input=['Your text here'],
    dimensions=1024  # Configurable
)
```

### 6.3 LangChain Integratie

```python
from langchain_community.embeddings import ZhipuAIEmbeddings

embeddings = ZhipuAIEmbeddings(
    api_key="your-api-key",
    model="embedding-3"
)

vectors = embeddings.embed_documents(["Hello world"])
```

**Conclusie:** Z.ai embeddings zijn bruikbaar voor Kanbu, maar vereisen aparte API configuratie.

---

## 7. Tool Integration

### 7.1 Ondersteunde Coding Tools

GLM-4.7 werkt out-of-the-box met:

| Tool | Configuratie |
|------|--------------|
| Claude Code | Update model naar `glm-4.7` in settings |
| Cline | Base URL + API key |
| OpenCode | Default model sinds 2025-12-22 |
| Roo Code | OpenAI-compatible endpoint |
| Kilo Code | Standard configuratie |

### 7.2 Tool Calling Support

```python
response = client.chat.completions.create(
    model='glm-4.7',
    messages=[...],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "search_code",
                "description": "Search for code in repository",
                "parameters": {...}
            }
        }
    ],
    tool_choice="auto"
)
```

**Features:**
- Native tool calling support
- Automatic tool choice
- vLLM: `--tool-call-parser glm47`

---

## 8. Data Privacy & Compliance

### 8.1 Bedrijfsachtergrond

| Aspect | Details |
|--------|---------|
| Bedrijf | Z.ai (voorheen Zhipu AI) |
| Locatie | Beijing, China |
| Opgericht | 2019 |
| Oorsprong | Tsinghua University spin-off |

### 8.2 Data Verwerking

**API calls:**
- Verwerkt op Chinese servers (standaard)
- Geen specifieke EU data residency optie gevonden
- PIPL (China's privacy wet) compliant

**Self-hosted:**
- Data blijft lokaal
- Geen externe calls (behalve model download)

### 8.3 GDPR Overwegingen

| Aspect | Status |
|--------|--------|
| EU Data Residency | ❓ Niet gedocumenteerd |
| GDPR Compliant | ❓ Niet expliciet vermeld |
| Data Training | ❓ Onduidelijk of prompts worden gebruikt |

**Risico:** Voor GDPR-gevoelige deployments is self-hosted of een EU-gebaseerde provider (OpenRouter) aan te raden.

---

## 9. Vergelijking met Alternatieven

### 9.1 Coding Models Vergelijking

| Model | SWE-bench | Context | Prijs (1M in/out) | Open-source |
|-------|-----------|---------|-------------------|-------------|
| **GLM-4.7** | **73.8%** | 200K | $0.40/$1.50 | ✅ |
| Claude Sonnet 4.5 | ~68% | 200K | $3.00/$15.00 | ❌ |
| GPT-4o | ~60% | 128K | $2.50/$10.00 | ❌ |
| DeepSeek V3 | ~65% | 64K | $0.14/$0.28 | ✅ |

### 9.2 Self-hosted Haalbaarheid

| Model | Min VRAM | Kanbu Community | Kanbu Enterprise |
|-------|----------|-----------------|------------------|
| GLM-4.7 Q2 | 24GB + 128GB RAM | ❌ | ⚠️ |
| Llama 3.2 8B | 5GB | ✅ | ✅ |
| Mistral 7B | 4GB | ✅ | ✅ |
| CodeLlama 13B | 8GB | ⚠️ | ✅ |

---

## 10. Kanbu Integratie Analyse

### 10.1 Use Case: CODE Capability Provider

**Haalbaarheid:** ✅ Goed via API

| Aspect | Assessment |
|--------|------------|
| Coding Quality | ⭐⭐⭐⭐⭐ #1 open-source |
| API Toegang | ✅ OpenAI-compatible |
| Prijs | ✅ $0.40/$1.50 (goedkoop) |
| Self-hosted | ❌ Te zwaar voor community |

### 10.2 Use Case: LLM Provider (Entity Extraction)

**Haalbaarheid:** ⚠️ Mogelijk, maar overkill

| Aspect | Assessment |
|--------|------------|
| Quality | ✅ Excellent |
| Context Window | ✅ 200K tokens |
| Prijs | ⚠️ Duurder dan GPT-4o-mini voor basis taken |

### 10.3 Use Case: Embedding Provider

**Haalbaarheid:** ✅ Goed

| Aspect | Assessment |
|--------|------------|
| Model | embedding-3 (configureerbaar) |
| API | ✅ Beschikbaar |
| LangChain | ✅ Integratie beschikbaar |
| Prijs | ❓ Niet gevonden |

### 10.4 Aanbevolen Implementatie

```
┌─────────────────────────────────────────────────────────────┐
│ Kanbu AI Provider Configuration                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LLM (Entity Extraction):                                  │
│  ├─ Primary: OpenAI GPT-4o-mini (goedkoop, goed genoeg)   │
│  └─ Alternative: GLM-4.7 (als coding context relevant is) │
│                                                             │
│  Embeddings:                                               │
│  ├─ Primary: OpenAI text-embedding-3-small                │
│  └─ Alternative: Z.ai embedding-3                         │
│                                                             │
│  CODE (Code Generation/Analysis):                          │
│  ├─ Primary: GLM-4.7 via API ⭐ AANBEVOLEN               │
│  └─ Alternative: Claude Sonnet (duurder)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Open Vragen

1. **EU Data Residency:** Biedt Z.ai EU servers? Contacteer support.
2. **Embedding Pricing:** Wat kost embedding-3 per 1M tokens?
3. **Kleinere Varianten:** Komt er een GLM-4.7 7B/13B variant?
4. **Privacy Policy:** Worden prompts gebruikt voor training?
5. **SLA:** Wat is de uptime guarantee voor API?

---

## 12. Bronnen

### Officiële Documentatie
- [Z.ai GLM-4.7 Overview](https://docs.z.ai/guides/llm/glm-4.7)
- [Z.ai Blog: GLM-4.7 Release](https://z.ai/blog/glm-4.7)
- [Hugging Face: GLM-4.7](https://huggingface.co/zai-org/GLM-4.7)
- [GitHub: Z.ai Python SDK](https://github.com/zai-org/z-ai-sdk-python)

### API Providers
- [OpenRouter: GLM-4.7](https://openrouter.ai/z-ai/glm-4.7)
- [Ollama: GLM-4.7](https://ollama.com/library/glm-4.7)
- [GLM Coding Plan](https://z.ai/subscribe)

### Local Deployment
- [Unsloth: GLM-4.7 Local Guide](https://unsloth.ai/docs/models/glm-4.7)
- [Hugging Face: GLM-4.7 GGUF](https://huggingface.co/unsloth/GLM-4.7-GGUF)

### Pricing
- [Z.ai Pricing Overview](https://docs.z.ai/guides/overview/pricing)
- [LLM Stats: GLM-4.7](https://llm-stats.com/models/glm-4.7)

### Embeddings
- [LangChain: ZhipuAI Embeddings](https://python.langchain.com/docs/integrations/text_embedding/zhipuai/)

---

## 13. Conclusie

### Samenvatting

GLM-4.7 is een indrukwekkend open-source model dat de beste coding benchmarks scoort. Voor Kanbu biedt het waardevolle capabilities:

| Aspect | Score | Toelichting |
|--------|-------|-------------|
| Coding Quality | ⭐⭐⭐⭐⭐ | #1 SWE-bench, beste open model |
| API Toegankelijkheid | ⭐⭐⭐⭐ | OpenAI-compatible, meerdere providers |
| Pricing | ⭐⭐⭐⭐ | $0.40/$1.50, $3/maand coding plan |
| Self-hosted | ⭐⭐ | Te zwaar voor consumer hardware |
| Embedding Support | ⭐⭐⭐ | Beschikbaar via separate model |
| GDPR/Privacy | ⭐⭐ | Chinese servers, onduidelijk beleid |

**Totaal:** ⭐⭐⭐⭐ (4/5) voor Kanbu als CODE provider via API

### Aanbeveling

**✅ Toevoegen aan Fase 14 als optionele CODE capability provider**

**Implementatie:**
1. Via OpenRouter (EU-friendly, aggregator)
2. Of direct Z.ai API ($3/maand coding plan)
3. Embedding via separate `embedding-3` model

**NIET aanbevolen voor:**
- Self-hosted community deployments (hardware te zwaar)
- Primary LLM provider (overkill voor entity extraction)
- GDPR-kritieke deployments zonder extra onderzoek

### Provider Support Matrix Update

| Provider | LLM | Embeddings | Vision | Code | Status |
|----------|-----|------------|--------|------|--------|
| GLM-4.7 | ✅ | ✅¹ | ❌ | ⭐⭐⭐⭐⭐ | API recommended |

¹ Via separate `embedding-3` model

---

*Rapport gegenereerd als onderdeel van Fase 14.0.4 - Kanbu Wiki Knowledge Graph implementatie.*
