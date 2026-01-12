# Research: Ollama Hardware & Model Configuration

> **Datum:** 2026-01-12
> **Fase:** 14.0.1
> **Status:** COMPLEET
> **Doel:** Hardware compatibility matrix en aanbevelingen voor Kanbu Community Edition

---

## Samenvatting

Dit document definieert hardware tiers voor Ollama-based lokale AI deployment in Kanbu. De focus ligt op het bepalen van minimale requirements en optimale configuraties voor verschillende use cases.

**Key Findings:**
- **Minimum voor bruikbare ervaring:** 8GB VRAM (7B Q4 model) of 16GB unified memory (Apple Silicon)
- **Aanbevolen:** 12-16GB VRAM voor 13B modellen met ruimte voor embeddings
- **NPU support:** Nog niet beschikbaar in Ollama/llama.cpp (AMD XDNA, Intel)
- **Kritiek:** `num_ctx` default is 2048/4096 - moet verhoogd worden voor agent workflows

---

## Hardware Tiers

### Tier Definitie

| Tier | VRAM/Memory | GPU Voorbeelden | LLM | Embeddings | Vision | Use Case |
|------|-------------|-----------------|-----|------------|--------|----------|
| **CPU-only** | 16GB+ RAM | Geen GPU | 7B Q4 (slow) | ✅ | ❌ | Batch, backup |
| **Entry** | 6-8 GB | GTX 1660, RTX 3060, RX 6600 | 7B Q4 | ✅ | ❌ | Basic |
| **Mid** | 10-12 GB | RTX 3080, RTX 4070 | 13B Q4 | ✅ | ⚠️ | Recommended |
| **High** | 16-24 GB | RTX 4090, A5000 | 30-34B Q4 | ✅ | ✅ | Advanced |
| **Pro** | 48+ GB | A6000, A100, H100 | 70B Q4+ | ✅ | ✅ | Enterprise |
| **Apple M1** | 8GB unified | M1 Air/Pro | 7B Q4 | ✅ | ❌ | Basic |
| **Apple M2/M3** | 16-24GB unified | M2/M3 Pro/Max | 13B Q5 | ✅ | ✅ | Recommended |
| **Apple M-Ultra** | 64-192GB unified | M2/M3 Ultra | 70B+ | ✅ | ✅ | Pro |

### Tier Details

#### CPU-Only Tier
- **Performance:** 3-6 tokens/second (40x slower dan GPU)
- **Use Case:** Batch processing, overnight jobs, development testing
- **Requirements:** Modern CPU (i7/Ryzen 7+), 16-32GB RAM
- **Modellen:** llama3.2:3b, phi3:mini, gemma:2b

```bash
# CPU-only performance is significant slower
# Expect 30-40 second response times for complex queries
```

#### Entry Tier (6-8GB VRAM)
- **Performance:** 40+ tokens/second met 7B Q4
- **GPU:** NVIDIA GTX 1660+, RTX 3060, AMD RX 6600-6700
- **Modellen:** llama3.2:8b, mistral:7b, qwen2.5:7b
- **Limitaties:** Geen vision, beperkte context (8K max comfortable)

#### Mid Tier (10-12GB VRAM) - AANBEVOLEN
- **Performance:** 35-50 tokens/second met 13B Q4
- **GPU:** NVIDIA RTX 3080, RTX 4070, AMD RX 7800 XT
- **Modellen:** llama3.2:8b, codellama:13b, qwen2.5:14b
- **Features:** Ruimte voor embeddings + LLM concurrent

#### High Tier (16-24GB VRAM)
- **Performance:** 30-45 tokens/second met 30B Q4
- **GPU:** NVIDIA RTX 4090, RTX A5000, AMD RX 7900 XTX
- **Modellen:** mixtral:8x7b, codellama:34b, deepseek-coder:33b
- **Features:** Vision modellen mogelijk (LLaVA, Llama 3.2 Vision)

#### Pro Tier (48GB+ VRAM)
- **Performance:** Full 70B models at interactive speeds
- **GPU:** NVIDIA A6000, A100, H100
- **Modellen:** llama3.3:70b, qwen2.5:72b
- **Features:** Multiple concurrent models, training fine-tuning

---

## VRAM Requirements Matrix

### LLM Modellen

| Model | Parameters | Q4_K_M | Q5_K_M | Q8_0 | FP16 |
|-------|------------|--------|--------|------|------|
| llama3.2 | 1B | ~1GB | ~1.2GB | ~2GB | ~3GB |
| llama3.2 | 3B | ~2GB | ~2.5GB | ~4GB | ~6GB |
| llama3.2 | 8B | ~5GB | ~6GB | ~9GB | ~16GB |
| mistral | 7B | ~4GB | ~5GB | ~8GB | ~14GB |
| llama3.1 | 8B | ~5GB | ~6GB | ~9GB | ~16GB |
| codellama | 13B | ~8GB | ~10GB | ~14GB | ~26GB |
| mixtral | 8x7B | ~26GB | ~32GB | ~48GB | ~90GB |
| llama3.3 | 70B | ~40GB | ~48GB | ~70GB | ~140GB |

### Embedding Modellen

| Model | Parameters | Memory | Dimensions | Performance |
|-------|------------|--------|------------|-------------|
| nomic-embed-text | 137M | ~0.5GB | 1024 | Very Fast (12K+ tok/s) |
| mxbai-embed-large | 335M | ~1.2GB | 1024 | Fast (9K+ tok/s) |
| all-minilm | 33M | ~0.1GB | 384 | Ultra Fast |
| snowflake-arctic-embed | 335M | ~1.2GB | 1024 | Fast |

### Vision Modellen

| Model | Parameters | VRAM (Q4) | Notes |
|-------|------------|-----------|-------|
| llava | 7B | ~5GB | Base vision |
| llava | 13B | ~8GB | Better quality |
| llama3.2-vision | 11B | ~8GB | Latest architecture |
| bakllava | 7B | ~5GB | Alternative |

---

## Context Window & Memory Impact

### Default Context Issue

**KRITIEK:** Ollama default `num_ctx` = 2048 tokens (soms 4096)

Dit is **te klein** voor agentic workflows zoals Kanbu's Wiki extraction!

### Memory per Context Size

| Context Length | Extra VRAM (8B model) | Notes |
|----------------|----------------------|-------|
| 2K (default) | +0GB | Baseline |
| 4K | +1GB | Minimal useful |
| 8K | +2GB | Recommended minimum |
| 16K | +4GB | Good for documents |
| 32K | +8GB | Long context |
| 64K | +16GB | Very long |
| 128K | +32GB | Maximum |

### Configuratie

```bash
# Methode 1: Bij model run
ollama run llama3.2:8b --parameter num_ctx=16384

# Methode 2: Permanent via Modelfile
cat > Modelfile << EOF
FROM llama3.2:8b
PARAMETER num_ctx 16384
EOF
ollama create kanbu-llama -f Modelfile

# Methode 3: API call
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "llama3.2:8b",
  "options": {"num_ctx": 16384}
}'

# Methode 4: Environment variable (global default)
export OLLAMA_CONTEXT_LENGTH=8192
```

### Flash Attention

Voor grote context windows, enable Flash Attention voor memory savings:

```bash
export OLLAMA_FLASH_ATTENTION=1
ollama serve
```

---

## GPU Vendor Support

### NVIDIA (CUDA) - Best Support

| Feature | Status | Notes |
|---------|--------|-------|
| Compute Capability 5.0+ | ✅ | GTX 900 series+ |
| Multi-GPU | ✅ | Via CUDA_VISIBLE_DEVICES |
| Tensor Cores | ✅ | RTX series |
| All models | ✅ | Full compatibility |

**Supported GPUs:** GeForce GTX 900+, RTX series, Quadro, Tesla, A-series

### AMD (ROCm) - Good Support

| Feature | Status | Notes |
|---------|--------|-------|
| RX 6000 series | ✅ | Full support |
| RX 7000 series | ✅ | Full support |
| Radeon PRO | ✅ | Workstation cards |
| Instinct | ✅ | MI series accelerators |
| Older GPUs | ⚠️ | Via HSA_OVERRIDE_GFX_VERSION |

**ROCm Configuration:**
```bash
# For unsupported GPUs, try forcing a compatible target
export HSA_OVERRIDE_GFX_VERSION="10.3.0"  # Example for RX 5400

# Multi-GPU selection
export ROCR_VISIBLE_DEVICES=0,1

# Check supported GPUs
rocminfo | grep "Name:"
```

**Community Fork:** Voor meer GPU support, zie [ollama-for-amd](https://github.com/likelovewant/ollama-for-amd)

### Apple Silicon (Metal) - Excellent Support

| Chip | Memory | Performance | Notes |
|------|--------|-------------|-------|
| M1 | 8-16GB | 12-15 tok/s (8B) | Entry level |
| M1 Pro/Max | 16-64GB | 20-28 tok/s (8B) | Good |
| M2 | 8-24GB | 15-20 tok/s (8B) | Better |
| M2 Pro/Max | 16-96GB | 28-35 tok/s (8B) | Very Good |
| M3 | 8-24GB | 20-25 tok/s (8B) | Good |
| M3 Pro/Max | 18-128GB | 35-45 tok/s (8B) | Excellent |
| M2/M3 Ultra | 64-192GB | 50+ tok/s (8B) | Can run 70B+ |

**Unified Memory Advantage:**
- CPU en GPU delen dezelfde memory pool
- Geen GPU-CPU data transfer overhead
- Grotere modellen mogelijk dan discrete VRAM zou toelaten

**Quantization Recommendations per Chip:**

| Chip/Memory | Recommended Quantization |
|-------------|-------------------------|
| M1/M2 Air (8GB) | Q4_K_S (lighter) |
| M2/M3 Pro (16-24GB) | Q5_K_M (balanced) |
| M3 Max/Ultra (32GB+) | Q6_K of Q8_0 |

### Intel GPU (Vulkan/SYCL) - Experimental

| Feature | Status | Notes |
|---------|--------|-------|
| Arc GPUs | ⚠️ | Via Vulkan backend |
| Integrated | ⚠️ | Limited performance |
| NPU | ❌ | Not in Ollama (use IPEX-LLM) |

**Intel NPU Alternative:** Voor Intel Core Ultra NPU, gebruik [IPEX-LLM](https://github.com/intel/ipex-llm) met Ollama wrapper.

### NPU Support Status

| Platform | Ollama Support | Alternative |
|----------|---------------|-------------|
| AMD XDNA | ❌ | Ryzen AI Software (ONNX) |
| Intel NPU | ❌ | IPEX-LLM, OpenVINO |
| Qualcomm Hexagon | ❌ | Qualcomm AI Engine |

**Conclusie NPU:** NPUs zijn momenteel **niet bruikbaar** met Ollama. Voor NPU acceleration moet een alternative stack (ONNX, OpenVINO) gebruikt worden.

---

## Kanbu-Specifieke Aanbevelingen

### Minimum Requirements voor Kanbu

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU VRAM** | 8GB | 12-16GB |
| **System RAM** | 16GB | 32GB |
| **CPU** | 6 cores | 8+ cores |
| **Storage** | SSD (models ~5GB each) | NVMe |

### Model Combinaties per Tier

#### Entry Tier (8GB VRAM)
```yaml
llm: llama3.2:8b          # ~5GB
embedding: nomic-embed-text  # ~0.5GB
context: 8192              # +2GB
# Total: ~7.5GB - fits!
```

#### Mid Tier (12GB VRAM) - AANBEVOLEN
```yaml
llm: llama3.2:8b          # ~5GB
embedding: mxbai-embed-large # ~1.2GB
context: 16384             # +4GB
# Total: ~10.2GB - comfortable margin
```

#### High Tier (24GB VRAM)
```yaml
llm: codellama:34b-instruct # ~20GB
embedding: mxbai-embed-large # ~1.2GB
context: 16384             # +4GB
# Total: ~25GB - might need model offloading
# Alternative: llama3.1:8b + vision model concurrent
```

### Context Window Aanbevelingen

| Kanbu Feature | Minimum Context | Recommended |
|---------------|-----------------|-------------|
| Wiki page extraction | 4K | 8K |
| Document summarization | 8K | 16K |
| Long chat context | 8K | 16K |
| Code analysis | 16K | 32K |

### Auto-Detection Strategie

Kanbu kan hardware capabilities detecteren via Ollama API:

```typescript
// Check available models
const tags = await fetch('http://localhost:11434/api/tags').then(r => r.json())

// Check running models en GPU usage
const ps = await fetch('http://localhost:11434/api/ps').then(r => r.json())
// ps.models[].size_vram geeft VRAM usage

// Check system info
const version = await fetch('http://localhost:11434/api/version').then(r => r.json())
```

**Aanbevolen Flow:**
1. Detect of Ollama draait
2. Check beschikbare VRAM via `ollama ps`
3. Suggereer modellen gebaseerd op VRAM
4. Waarschuw als `num_ctx` te laag is

---

## Development Hardware: MAX Machine

### Specificaties

| Component | Waarde |
|-----------|--------|
| CPU | AMD RYZEN AI MAX+ 395 (16c/32t, 5.1GHz) |
| GPU | AMD Radeon 8060S (integrated) |
| NPU | AMD XDNA 2 (50 TOPS) |
| RAM | 128GB unified (shared CPU/GPU/NPU) |
| VRAM | 2GB dedicated + up to ~40GB shared |

### Ollama op MAX

**ROCm Status:** Moet getest worden. AMD APU met shared memory gedraagt zich anders dan discrete GPU.

**Verwachte configuratie:**
```bash
# Check ROCm support
rocminfo

# Als Radeon 8060S niet direct werkt:
export HSA_OVERRIDE_GFX_VERSION="11.0.0"  # gfx1100 series

# Of via Vulkan backend
export OLLAMA_VULKAN=1
```

**NPU (XDNA):** Niet bruikbaar met Ollama. Voor NPU moet AMD Ryzen AI Software gebruikt worden met ONNX models.

### Unified Memory Overwegingen

Met 128GB unified memory kan MAX theoretisch grote modellen draaien:
- 70B Q4 (~40GB) zou moeten passen
- GPU bandwidth is lager dan discrete GPU
- Performance zal vergelijkbaar zijn met Apple M-series

---

## Cloud Fallback Strategie

### Wanneer Fallback naar Cloud?

| Scenario | Actie |
|----------|-------|
| Geen GPU gedetecteerd | Waarschuw, bied cloud optie |
| < 8GB VRAM | Suggereer kleinere modellen of cloud |
| Response > 30 sec | Optionele cloud upgrade |
| Vision nodig maar niet beschikbaar | Cloud fallback |

### Configuratie in Kanbu

```typescript
// Provider resolution met fallback
const aiConfig = {
  primary: {
    type: 'OLLAMA',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2:8b',
  },
  fallback: {
    type: 'OPENAI',
    model: 'gpt-4o-mini',
    // Alleen gebruiken als local te traag of niet beschikbaar
  },
  autoFallback: {
    enabled: true,
    responseTimeThreshold: 30000, // 30 sec
    errorRetries: 2,
  }
}
```

---

## Conclusies & Aanbevelingen

### Hardware Aanbevelingen

| Scenario | Hardware | Budget (2026) |
|----------|----------|---------------|
| **Minimum** | RTX 3060 12GB of M2 16GB | ~$300-400 |
| **Aanbevolen** | RTX 4070 12GB of M3 Pro 18GB | ~$500-800 |
| **Power User** | RTX 4090 24GB of M3 Max 48GB | ~$1500-2500 |
| **Enterprise** | A6000 48GB of M3 Ultra 192GB | ~$4000-8000 |

### Model Aanbevelingen voor Kanbu

| Use Case | Model | VRAM | Notes |
|----------|-------|------|-------|
| **Wiki Extraction** | llama3.2:8b | 5GB | Goed genoeg |
| **Embeddings** | nomic-embed-text | 0.5GB | Best value |
| **Coding** | codellama:7b-instruct | 4GB | Gespecialiseerd |
| **Vision** | llava:7b | 5GB | Optional |
| **Quality Focus** | qwen2.5:14b | 9GB | Betere output |

### Critical Configuration

**MUST DO voor Kanbu:**
```bash
# 1. Verhoog context window
export OLLAMA_CONTEXT_LENGTH=8192

# 2. Enable Flash Attention voor lange context
export OLLAMA_FLASH_ATTENTION=1

# 3. Start Ollama met correcte settings
ollama serve
```

### NPU Roadmap

NPU support is **niet beschikbaar** in Ollama (januari 2026).

**Toekomstige opties:**
- Wacht op officiële llama.cpp/Ollama NPU backends
- Gebruik ONNX Runtime voor NPU-accelerated embeddings
- Hybride approach: LLM op GPU, embeddings op NPU via separate stack

---

## Bronnen

- [Ollama GPU Support Documentation](https://docs.ollama.com/gpu)
- [Ollama FAQ - Context Length](https://docs.ollama.com/faq)
- [AMD ROCm + Ollama](https://www.amd.com/en/developer/resources/technical-articles/running-llms-locally-on-amd-gpus-with-ollama.html)
- [LocalLLM.in VRAM Guide](https://localllm.in/blog/ollama-vram-requirements-for-local-llms)
- [llama.cpp Apple Silicon Performance](https://github.com/ggml-org/llama.cpp/discussions/4167)
- [IPEX-LLM for Intel](https://github.com/intel/ipex-llm)
- [Ollama-for-AMD Community Fork](https://github.com/likelovewant/ollama-for-amd)
- [Ryzen AI Software](https://ryzenai.docs.amd.com/en/latest/)
