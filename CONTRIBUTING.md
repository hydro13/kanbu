# Contributing to Kanbu

First: thank you. Kanbu exists because I needed it, and it gets better because people like you use it and tell me what's wrong.

## Who should contribute?

**Especially you, if:**

- You use OpenClaw and have opinions about how agent dispatch should work
- You tried to self-host Kanbu and hit a wall
- You use Claude Code with MCP and want more tools
- You have a workflow that Kanbu almost supports but not quite

You don't need to be an expert. A clear bug report or a "this confused me" issue is just as valuable as a PR.

---

## Quick setup

```bash
git clone https://github.com/hydro13/kanbu.git
cd kanbu
pnpm install

# Database (PostgreSQL required)
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL and JWT_SECRET
cd packages/shared
pnpm db:generate && pnpm db:push
cd ../..

# Start everything
pnpm dev
# Web: http://localhost:5173
# API: http://localhost:3001
```

For HTTPS setup (needed for GitHub integration), see [docs/DEV-ENVIRONMENT.md](docs/DEV-ENVIRONMENT.md).

---

## What to work on

Check the [Roadmap](ROADMAP.md) for planned features. Good places to start:

- **Improve OpenClaw context** — the task prompt sent to agents is minimal right now. Wiki pages, subtasks, linked PRs — all missing. If you know what context makes agents smarter, add it.
- **Docker improvements** — make self-hosting easier, simpler, faster
- **MCP tool gaps** — 154 tools but probably missing the one you need
- **UI polish** — the board works, but there's always something that could be cleaner

If you're unsure, open an issue and ask. I'll point you in the right direction.

---

## Submitting a PR

1. Fork the repo and create a branch: `git checkout -b feat/your-thing`
2. Make your changes
3. Check everything works: `pnpm typecheck && pnpm test`
4. Commit with a clear message: `feat: describe what you added`
5. Open a PR against `develop` (not `main`)

That's it. No CLA, no contributor agreement, no formal review process. Just make sure it works and explain what it does.

---

## Reporting bugs

Open an [issue](https://github.com/hydro13/kanbu/issues) and include:

- What you expected to happen
- What actually happened
- Steps to reproduce (or a screenshot)
- Your setup (self-hosted / local / Docker)

---

## Questions?

Open a [discussion](https://github.com/hydro13/kanbu/discussions) or join the [Discord](https://discord.com/channels/1461655382492446927/1461655383708799153).

By contributing, you agree your work is licensed under MIT.
