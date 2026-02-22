# Kanbu — Takenlijst

**Laatste update:** 6 februari 2026
**Beheerd door:** Robin + Claude Cowork
**Uitgevoerd door:** Claude Code

---

## Legenda

**Prioriteit:** P0 = Blokkerend | P1 = Hoog | P2 = Medium | P3 = Laag
**Complexiteit:** S = Small | M = Medium | L = Large | XL = Extra Large
**Status:** ✅ Done | 🔄 In Progress | 📋 Ready | ⬜ Planned | 🚫 Blocked

---

## Sprint: Develop → Main Merge & Stabilization

> **Doel:** Develop branch (OAuth 2.1) veilig naar main mergen en stabiliseren

| #   | Taak                                          | P   | C   | Status | Depends | Instructie                          |
| --- | --------------------------------------------- | --- | --- | ------ | ------- | ----------------------------------- |
| 001 | Review develop branch OAuth 2.1 changes       | P0  | M   | 📋     | -       | `.claude/tasks/001-review-oauth.md` |
| 002 | Test OAuth 2.1 MCP flow end-to-end            | P0  | M   | ⬜     | 001     | -                                   |
| 003 | Merge develop → main                          | P0  | S   | ⬜     | 002     | -                                   |
| 004 | Fix ESLint no-explicit-any remaining warnings | P2  | S   | ⬜     | 003     | -                                   |
| 005 | Update CHANGELOG.md voor beta.5               | P1  | S   | ⬜     | 003     | -                                   |

---

## Sprint: Stabilization & Edge Cases

> **Doel:** Bekende issues oplossen voor een stabielere beta

| #   | Taak                                    | P   | C   | Status | Depends | Instructie |
| --- | --------------------------------------- | --- | --- | ------ | ------- | ---------- |
| 006 | ACL permission edge cases onderzoeken   | P1  | L   | ⬜     | -       | -          |
| 007 | Performance audit: 100+ taken per board | P1  | M   | ⬜     | -       | -          |
| 008 | Cross-project search implementeren      | P2  | L   | ⬜     | -       | -          |
| 009 | Mobile responsive testing & fixes       | P2  | M   | ⬜     | -       | -          |
| 010 | Storybook coverage uitbreiden           | P3  | M   | ⬜     | -       | -          |

---

## Sprint: Email Notificaties (v0.2.0 prep)

> **Doel:** Gebruikers informeren over task assignments, comments, mentions

| #   | Taak                                        | P   | C   | Status | Depends | Instructie |
| --- | ------------------------------------------- | --- | --- | ------ | ------- | ---------- |
| 011 | Email service kiezen en integreren (Resend) | P1  | M   | ⬜     | -       | -          |
| 012 | Notificatie templates ontwerpen             | P1  | M   | ⬜     | 011     | -          |
| 013 | Per-user notificatie voorkeuren UI          | P2  | M   | ⬜     | 012     | -          |
| 014 | Digest emails (dagelijks/wekelijks)         | P2  | L   | ⬜     | 012     | -          |

---

## Sprint: Multi-instance & Performance (v0.2.0)

> **Doel:** Schalen naar meerdere instances en betere performance

| #   | Taak                                        | P   | C   | Status | Depends | Instructie |
| --- | ------------------------------------------- | --- | --- | ------ | ------- | ---------- |
| 015 | Redis adapter voor Socket.io multi-instance | P1  | L   | ⬜     | -       | -          |
| 016 | Shared session store (Redis)                | P1  | M   | ⬜     | 015     | -          |
| 017 | Database query optimalisatie (N+1 audit)    | P1  | L   | ⬜     | -       | -          |
| 018 | Virtual scrolling voor grote lijsten        | P2  | M   | ⬜     | -       | -          |
| 019 | Bundle size analyse en reductie             | P2  | M   | ⬜     | -       | -          |
| 020 | Load balancer documentatie                  | P3  | S   | ⬜     | 015     | -          |

---

## Sprint: Custom Fields (v0.3.0 prep)

> **Doel:** Flexibele metadata op tasks

| #   | Taak                                    | P   | C   | Status | Depends | Instructie |
| --- | --------------------------------------- | --- | --- | ------ | ------- | ---------- |
| 021 | Custom field Prisma schema ontwerpen    | P1  | M   | ⬜     | -       | -          |
| 022 | Custom field CRUD API (tRPC procedures) | P1  | L   | ⬜     | 021     | -          |
| 023 | Custom field UI op task detail          | P1  | L   | ⬜     | 022     | -          |
| 024 | Custom field filtering en sortering     | P2  | M   | ⬜     | 023     | -          |
| 025 | Custom field templates                  | P3  | M   | ⬜     | 023     | -          |

---

## Sprint: Integrations (v0.3.0)

> **Doel:** Discord, Slack en advanced reporting

| #   | Taak                         | P   | C   | Status | Depends | Instructie |
| --- | ---------------------------- | --- | --- | ------ | ------- | ---------- |
| 026 | Discord webhook notificaties | P2  | M   | ⬜     | -       | -          |
| 027 | Discord bot commands         | P3  | L   | ⬜     | 026     | -          |
| 028 | Slack app installatie flow   | P2  | L   | ⬜     | -       | -          |
| 029 | Advanced reporting dashboard | P2  | XL  | ⬜     | -       | -          |
| 030 | Velocity & cycle time charts | P2  | M   | ⬜     | 029     | -          |
| 031 | Budget module basis          | P3  | L   | ⬜     | -       | -          |

---

## Backlog (v1.0.0+)

> **Doel:** Enterprise features en stable release

| #   | Taak                                   | P   | C   | Status | Depends | Instructie |
| --- | -------------------------------------- | --- | --- | ------ | ------- | ---------- |
| 032 | GraphQL API endpoint                   | P3  | XL  | 💭     | -       | -          |
| 033 | Public API documentatie (OpenAPI)      | P3  | L   | 💭     | -       | -          |
| 034 | SSO/SAML integratie                    | P3  | XL  | 💭     | -       | -          |
| 035 | Project templates (Agile/Kanban/Scrum) | P3  | M   | 💭     | -       | -          |
| 036 | Workflow automations (triggers)        | P3  | XL  | 💭     | -       | -          |
| 037 | Team workload analytics                | P3  | L   | 💭     | -       | -          |

---

## Instructies

### Voor Robin:

- Bespreek taken met Claude Cowork
- Cowork schrijft instructiebestanden in `.claude/tasks/`
- Review resultaten na uitvoering

### Voor Claude Code:

1. Lees `CLAUDE.md` eerst
2. Lees het instructiebestand voor je taak
3. Volg de stappen exact
4. Vul de "Notities" sectie in
5. COMMIT NIET zonder Robin's goedkeuring

---

## Statistieken

| Metric       | Waarde |
| ------------ | ------ |
| Totaal taken | 37     |
| Done         | 0      |
| In Progress  | 0      |
| Ready        | 1      |
| Planned      | 31     |
| Backlog      | 6      |
