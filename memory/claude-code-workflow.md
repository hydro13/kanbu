# Claude Code Workflow — Kanbu

> Herbruikbaar systeem, identiek aan ClaroNote workflow.
> Zie `claronote-web/memory/claude-code-workflow.md` voor het volledige systeem.

## Samenvatting

1. Claude Code leest CLAUDE.md eerst
2. Pakt taak op uit .claude/tasks/NNN.md
3. Volgt de stappen exact
4. Rapporteert bevindingen
5. COMMIT NIET zonder Robin's goedkeuring

## Monorepo-specifiek

- `pnpm typecheck` na elke wijziging
- `pnpm prisma generate` na schema wijzigingen
- Test in Docker context waar mogelijk
- Conventional commits (feat:, fix:, chore:, docs:)
