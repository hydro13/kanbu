# Abacus.AI / ChatLLM Teams - Research Rapport

**Datum:** 2026-01-12
**Fase:** 14.0.2
**Onderzoeker:** Claude Code (AI Architect sessie)
**Status:** Compleet

---

## Executive Summary

Abacus.AI is een enterprise AI platform dat toegang biedt tot meerdere LLM's via één interface. Het ChatLLM Teams product ($10/user/maand) biedt toegang tot 18+ state-of-the-art modellen met automatische routing. Voor Kanbu is de **Enterprise tier** ($5K+/maand) vereist voor volledige API toegang, wat het ongeschikt maakt voor de Community Edition maar interessant voor SaaS deployments.

**Conclusie:** ChatLLM Teams is een uitstekende keuze voor eindgebruikers die meerdere LLM's willen gebruiken tegen lage kosten, maar de API beperkingen maken het minder geschikt als backend provider voor Kanbu's AI features.

---

## 1. Platform Overzicht

### 1.1 Wat is Abacus.AI?

Abacus.AI positioneert zichzelf als "The World's First Super Assistant for Professionals and Enterprises". Het platform biedt:

- **ChatLLM Teams**: Consumer/team product voor $10/user/maand
- **Enterprise Platform**: Custom pricing, ~$5K+/maand voor volledige API toegang
- **DeepAgent**: AI agent voor taak automatisering
- **CodeLLM**: AI code editor (concurrent van Cursor/Copilot)

### 1.2 Productlijnen

| Product | Doelgroep | Prijs | API Toegang |
|---------|-----------|-------|-------------|
| ChatLLM Teams | Professionals, kleine teams | $10/user/maand | Beperkt (RouteLLM API) |
| Enterprise | Grote organisaties | ~$5K+/maand | Volledig |
| RouteLLM API | Developers met ChatLLM subscription | Inclusief | Chat completions only |

---

## 2. ChatLLM Teams Features

### 2.1 Beschikbare Modellen (januari 2026)

ChatLLM Teams biedt toegang tot 18+ modellen:

**OpenAI:**
- GPT-5 (inclusief Pro en Thinking varianten)
- GPT-4.1, GPT-4o
- o3 (reasoning model)
- GPT-Image

**Anthropic:**
- Claude Sonnet-4
- Claude Opus 4.1

**Google:**
- Gemini 2.5, Gemini 3.0 Pro
- Gemini 3 Flash

**Andere:**
- Grok-4 (xAI)
- DeepSeek (meerdere varianten)
- Qwen 3
- Llama 4
- GLM 4.7
- Kimi K2

### 2.2 RouteLLM - Automatische Model Routing

De "RouteLLM" feature selecteert automatisch het beste model voor elke taak:

```
User prompt → RouteLLM Router → Optimal LLM → Response
```

**Voordelen:**
- Geen model selectie nodig
- Automatische fallback bij model failures
- Kosten optimalisatie

**Nadelen:**
- Minder controle over welk model wordt gebruikt
- Kan onvoorspelbare resultaten geven

### 2.3 Credit Systeem

| Aspect | Details |
|--------|---------|
| Maandelijkse credits | 20.000 |
| Credit ≠ Tokens | 1 credit kan tot 15M input tokens opleveren (Sonnet-4.5) |
| Unlimited modellen | RouteLLM, GPT-5 Mini, Gemini 3 Flash, Grok Code Fast, GLM 4.7, Kimi K2, Llama4 |

**Let op:** CodeLLM (coding assistant) consumeert credits zeer snel - één gebruiker rapporteerde 11K credits voor 2 simpele pagina's met "Sonnet 4 Thinking".

---

## 3. API Capabilities

### 3.1 RouteLLM API

De RouteLLM API is beschikbaar voor ChatLLM subscribers:

**Endpoint:** Via ChatLLM Teams interface (geen publieke documentatie)

**Features:**
- Unified API voor alle beschikbare modellen
- Automatische routing of handmatige model selectie
- Automatische failover
- High uptime guarantees

**Beperkingen:**
- Alleen chat completions
- Geen embedding endpoints
- Geen fine-tuning API
- Geen vector store API

### 3.2 Enterprise API

Volledige API toegang vereist Enterprise tier (~$5K+/maand):

| Capability | ChatLLM Teams | Enterprise |
|------------|---------------|------------|
| Chat Completions | ✅ (RouteLLM) | ✅ |
| Embeddings | ❌ | ✅ |
| Vector Store | ❌ | ✅ |
| Fine-tuning | ❌ | ✅ |
| RAG Orchestration | ❌ | ✅ |
| Custom Chatbots | Beperkt | ✅ |

### 3.3 Vector Store (Enterprise Only)

**Specificaties:**
- Capaciteit: 1B+ vectors
- Latency: <150ms
- Recall: 100%
- Nearest neighbor algoritmes: Alle

**Pricing:**

| Pod Type | Prijs | Capaciteit |
|----------|-------|------------|
| Storage Optimized | $0.10/uur | Tot 5M vectors |
| Performance Optimized | $0.10/uur | Tot 1M vectors |

**Embedding modellen:** Niet expliciet gedocumenteerd. Enterprise documentatie refereert naar "fine-tuning open source embedding models" maar specifieke modellen zijn niet genoemd.

### 3.4 Python SDK

```bash
pip install abacusai
```

**Basis gebruik:**

```python
from abacusai import ApiClient

# In Abacus.AI Notebooks (geen API key nodig)
client = ApiClient()

# Extern (API key vereist - Enterprise only)
client = ApiClient(api_key="your-api-key")
```

**Documentatie:**
- GitHub: https://github.com/abacusai/api-python
- PyDocs: https://abacusai.github.io/api-python/

---

## 4. Authenticatie & SSO

### 4.1 Ondersteunde Methoden

| Methode | Support | Details |
|---------|---------|---------|
| OAuth 2.0 | ✅ | Via Okta |
| OpenID Connect (OIDC) | ✅ | Okta, Microsoft Entra |
| SAML 2.0 | ✅ | IDP-initiated only |
| API Keys | ✅ | Enterprise only |
| MFA | ✅ | Ingebouwd |

### 4.2 SAML Integratie

**Ondersteunde Identity Providers:**
- Microsoft Entra ID (Azure AD)
- Okta

**Beperkingen:**
- Alleen IDP-initiated SAML (geen SP-initiated)
- Signed responses verplicht
- Session timeout: 24 uur inactiviteit

**JIT Provisioning:**
- Automatisch user aanmaken bij eerste login
- Vereiste attributes: email, firstName, lastName

### 4.3 Access Control

- Platform Admins kunnen login methodes beperken
- Gebruikers kunnen SSO + password combineren (indien ingeschakeld)
- Audit logs beschikbaar via identity provider (Okta/Entra)

---

## 5. Enterprise Security & Compliance

### 5.1 Certificeringen

| Certificering | Status |
|---------------|--------|
| SOC 2 Type II | ✅ Gecertificeerd |
| HIPAA | ✅ Compliant |
| GDPR | ✅ Compliant |
| CCPA | ✅ Compliant |

### 5.2 Data Protection

- **Data training:** Klantdata wordt NIET gebruikt voor training
- **Enterprise agreements:** Met OpenAI, Anthropic, Google - beschermen klantdata
- **Encryptie:** Altijd versleuteld (at rest en in transit)

### 5.3 Infrastructure

**Cloud Providers:**
- AWS
- Microsoft Azure
- Google Cloud Platform
- Locatie: Verenigde Staten (per klantwens)

**Security Maatregelen:**
- Network isolation
- VPN toegang voor productie servers
- SSH keys met passphrase
- Two-factor authentication
- 24/7 monitoring
- Automated anomaly detection

### 5.4 Audit Logs

> "All actions taken to make changes to the infrastructure or to access customer data for specific business needs are logged for auditing purposes."

**Access Control:**
- Alleen senior infrastructure engineers hebben productie toegang
- Strong authentication mechanismen

**Contact DPO:** dpo@abacus.ai

---

## 6. Prijsmodel Analyse

### 6.1 ChatLLM Teams

| Aspect | Details |
|--------|---------|
| Prijs | $10/user/maand |
| Eerste maand | Gratis |
| Credits | 20.000/maand |
| Modellen | 18+ SOTA LLMs |
| API | RouteLLM (beperkt) |

**Vergelijking met alternatieven:**

| Service | Prijs | Modellen |
|---------|-------|----------|
| ChatLLM Teams | $10/maand | 18+ modellen |
| ChatGPT Plus | $20/maand | OpenAI only |
| Claude Pro | $20/maand | Anthropic only |
| Gemini Advanced | $20/maand | Google only |

### 6.2 Enterprise

| Aspect | Details |
|--------|---------|
| Startprijs | ~$5.000/maand |
| Inclusief | Full API, Vector Store, Fine-tuning |
| Support | Dedicated team |
| Deployment | Private model deployments mogelijk |

### 6.3 Verborgen Kosten

**Let op:**
- Vector Store pods: $0.10/uur extra
- Fine-tuning: Compute costs
- High-volume API calls: Usage-based

---

## 7. Integraties

### 7.1 Native Integraties

| Platform | Type |
|----------|------|
| Slack | Messaging |
| Microsoft Teams | Messaging |
| Google Drive | Storage |
| OneDrive | Storage |
| SharePoint | Storage |
| Gmail | Email |
| Google Calendar | Calendar |
| Outlook | Email |
| Confluence | Documentation |
| Salesforce | CRM |

### 7.2 Custom Chatbots

- Upload eigen documenten
- Connect to database
- Proprietary knowledge bases
- Deploy naar ChatLLM Teams users

---

## 8. Bekende Beperkingen & Risico's

### 8.1 Kritieke Beperkingen

| Beperking | Impact voor Kanbu |
|-----------|-------------------|
| Geen embedding API in Teams tier | ❌ Kan niet als embedding provider dienen |
| Enterprise tier vereist voor API | ❌ $5K+/maand te duur voor Community Edition |
| Alleen US servers | ⚠️ GDPR compliance vraagstuk |
| IDP-initiated SAML only | ⚠️ Beperkte SSO flexibiliteit |

### 8.2 Gebruikersfeedback (Reviews 2025)

**Positief:**
- 10x meer tokens dan concurrenten
- Goede value for money ($10/maand)
- Betrouwbare model toegang
- Enterprise-grade security

**Negatief:**
- Zeer slechte customer support (geen response meldingen)
- Buggy interface (witte schermen, reloads)
- CodeLLM kwaliteit ondermaats
- Credit consumptie onduidelijk
- Billing issues gerapporteerd

**Citaat uit review:**
> "The biggest problem is the total absence of customer support. Since November 5, users have contacted their support team several times — and received zero responses."

### 8.3 Technische Risico's

1. **Vendor Lock-in:** Proprietary API, geen OpenAI-compatibele endpoints
2. **Onduidelijke embedding support:** Geen duidelijke documentatie over welke embedding modellen beschikbaar zijn
3. **Credit verbruik onvoorspelbaar:** Moeilijk te budgetteren
4. **Geen self-hosted optie:** Alleen cloud-based

---

## 9. Kanbu Integratie Analyse

### 9.1 Scenario's

#### Scenario A: ChatLLM Teams als LLM Provider

**Haalbaarheid:** ⚠️ Beperkt

| Aspect | Assessment |
|--------|------------|
| Chat/Completion | ✅ Via RouteLLM API |
| Embeddings | ❌ Niet beschikbaar |
| Cost | ✅ $10/user/maand |
| Complexity | ⚠️ Proprietary API |

**Conclusie:** Kan alleen voor LLM chat, niet voor volledige Knowledge Graph pipeline.

#### Scenario B: Enterprise Platform als Backend

**Haalbaarheid:** ⚠️ Alleen voor SaaS

| Aspect | Assessment |
|--------|------------|
| Chat/Completion | ✅ Full API |
| Embeddings | ✅ Beschikbaar |
| Vector Store | ✅ $0.10/uur per pod |
| Cost | ❌ $5K+/maand minimum |

**Conclusie:** Te duur voor Community Edition, mogelijk interessant voor Enterprise SaaS tier.

#### Scenario C: Hybride Aanpak

**Configuratie:**
- **LLM Provider:** OpenAI (embedding) + Abacus (completion via RouteLLM)
- **Cost:** $10/user (Abacus) + OpenAI API costs

**Beoordeling:** Complex, meerdere providers, moeilijk te onderhouden.

### 9.2 Vergelijking met Alternatieven

| Provider | LLM | Embeddings | Self-hosted | Cost |
|----------|-----|------------|-------------|------|
| **Abacus.AI** | ✅ | ❌ (Teams) / ✅ (Enterprise) | ❌ | $10/user of $5K+ |
| **OpenAI** | ✅ | ✅ | ❌ | Pay-per-use |
| **Ollama** | ✅ | ✅ | ✅ | Free (hardware) |
| **Azure OpenAI** | ✅ | ✅ | ❌ | Pay-per-use |

### 9.3 Aanbeveling

**Voor Kanbu Community Edition:**
- ❌ **Niet aanbevolen** als primaire provider
- Reden: Geen embedding API zonder Enterprise tier

**Voor Kanbu SaaS (Enterprise customers):**
- ⚠️ **Optioneel** als premium LLM tier
- Reden: Multi-model toegang, goede compliance

**Implementatie prioriteit:**
1. OpenAI (primair - heeft embedding + LLM)
2. Ollama (self-hosted optie)
3. Abacus.AI (optioneel, alleen LLM routing)

---

## 10. Open Vragen

1. **Embedding modellen:** Welke specifieke embedding modellen zijn beschikbaar in Enterprise tier?
2. **OpenAI-compatible API:** Biedt Abacus.AI een OpenAI-compatible endpoint?
3. **Rate limits:** Wat zijn de exacte rate limits voor RouteLLM API?
4. **EU hosting:** Is EU data residency beschikbaar?
5. **Fine-tuning support:** Welke base models zijn beschikbaar voor fine-tuning?

---

## 11. Bronnen

### Officiële Documentatie
- [Abacus.AI Homepage](https://abacus.ai/)
- [ChatLLM Teams](https://chatllm.abacus.ai/)
- [RouteLLM APIs FAQ](https://routellm-apis.abacus.ai/routellm_apis_faq)
- [Python SDK - Getting Started](https://abacus.ai/help/python-sdk/getting-started)
- [GitHub - api-python](https://github.com/abacusai/api-python)
- [Vector Store](https://abacus.ai/vectorstore)
- [Security Policy](https://abacus.ai/security)

### Authentication
- [Okta SAML Integration](https://abacus.ai/help/authentication/oktaSAML)
- [Microsoft Entra SAML](https://abacus.ai/help/authentication/microsoftEntraSAML)
- [Okta Configuration Guide](https://saml-doc.okta.com/SAML_Docs/How-to-Configure-SAML-2.0-for-Abacus.html)

### Reviews & Analyses
- [Abacus AI Review 2025 - Deeper Insights](https://deeperinsights.com/ai-review/abacus-ai-review-pros-cons/)
- [KDnuggets - Honest Review](https://www.kdnuggets.com/2025/11/abacus/my-honest-take-on-abacus-ai-chatllm-deepagent-enterprise)
- [Trustpilot - Abacus.ai Reviews](https://www.trustpilot.com/review/abacus.ai)

### Pricing
- [Abacus AI Pricing Guide - eesel.ai](https://www.eesel.ai/blog/abacus-ai-pricing)
- [Billing FAQ](https://abacus.ai/help/chatllm-ai-super-assistant/faqs/billing)

---

## 12. Conclusie

### Samenvatting

Abacus.AI/ChatLLM Teams is een interessant platform dat veel value biedt voor eindgebruikers die meerdere LLM's willen gebruiken ($10/maand voor 18+ modellen). Echter, voor Kanbu's use case als backend AI provider zijn er significante beperkingen:

1. **Geen embedding API** in de Teams tier
2. **Enterprise tier te duur** ($5K+/maand) voor Community Edition
3. **Proprietary API** - geen OpenAI-compatible endpoints
4. **Onduidelijke documentatie** over embedding capabilities
5. **Support issues** gerapporteerd door gebruikers

### Eindoordeel

| Criterium | Score | Toelichting |
|-----------|-------|-------------|
| LLM Capability | ⭐⭐⭐⭐⭐ | Uitstekend - 18+ modellen |
| Embedding Support | ⭐⭐ | Enterprise only, onduidelijk |
| API Toegankelijkheid | ⭐⭐ | Beperkt zonder Enterprise |
| Pricing | ⭐⭐⭐ | Teams goed, Enterprise duur |
| Documentation | ⭐⭐ | Beperkt, geen publieke API docs |
| Enterprise Features | ⭐⭐⭐⭐ | SSO, Compliance, Audit logs |

**Totaal:** ⭐⭐⭐ (3/5) voor Kanbu integratie

### Aanbeveling

**Niet opnemen als primaire provider in Fase 14.**

Abacus.AI kan als **optionele** provider worden toegevoegd in een latere fase als:
- De community vraagt om multi-model routing
- Enterprise klanten specifiek Abacus.AI willen gebruiken
- Abacus.AI een embedding API toevoegt aan Teams tier

**Focus voor Fase 14:**
1. OpenAI (primair - embedding + LLM)
2. Ollama (self-hosted)
3. Anthropic (placeholder voor Claude Code specialist)

---

*Rapport gegenereerd als onderdeel van Fase 14.0.2 - Kanbu Wiki Knowledge Graph implementatie.*
