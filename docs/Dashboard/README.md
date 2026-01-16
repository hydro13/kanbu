# Dashboard Documentation

This directory contains the complete vision, architecture and implementation roadmap for the Kanbu Dashboard.

**Objective:** Implementation of "Claude's Planner" - an ideal dashboard design based on best practices from 9 PM tools, adapted to Kanbu's real-time multi-user architecture.

---

## Documents

| Document | Description | Reading Order |
|----------|--------------|--------------|
| [VISIE.md](./VISIE.md) | Overarching vision and design principles | 1. Read first |
| [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) | Claude's Planner - the complete ideal design | 2. Reference |
| [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) | Analysis of existing implementation | 3. Understand current state |
| [CONCURRENTIE-ANALYSE.md](./CONCURRENTIE-ANALYSE.md) | Analysis of 10 PM tools (incl. Claude's Planner) | 4. Background |
| [ROADMAP.md](./ROADMAP.md) | **IMPLEMENTATION GUIDE** - Detailed phases | 5. **Work with this** |

---

## Core Message

> **The Dashboard is the user's cockpit - built for real-time multi-user collaboration.**

### What We're Building

```
Dashboard Sidebar (Claude's Planner model)
├── 🏠 Home (widget-based, personalizable)
├── 📥 Inbox (notifications + mentions)
├── ✅ My Tasks (smart grouping: Today/Upcoming/Overdue)
├── 📅 Today (focus view)
│
├── ⭐ FAVORITES
│   └── Pinned projects (cross-workspace)
│
├── 📁 WORKSPACES (collapsible tree)
│   ├── 🏢 Workspace A ▼
│   │   ├── 📋 KANBU
│   │   │   └── Project 1
│   │   ├── 🐙 GITHUB
│   │   │   └── repo-name
│   │   └── 📂 GROUPS
│   │       └── Team Alpha
│   │
│   └── 🏢 Workspace B ▶ (collapsed)
│
├── 📝 Notes
└── ⚙️ Settings
```

---

## Architecture Constraints

### MUST Respect

| Constraint | Reason |
|------------|-------|
| **Real-time multi-user** | Socket.io + Redis adapter, NO offline-first |
| **ACL everywhere** | Every menu item, every action via RWXDP permissions |
| **BaseLayout pattern** | Existing collapsible/resizable sidebar |
| **tRPC procedures** | Consistent API patterns |
| **Docker + SaaS** | Multi-server deployment with Redis |
| **LDAP sync (planned)** | ACL is prepared for external identity providers |

### MUST NOT Do

| Forbidden | Why |
|----------|--------|
| Implement offline-first | Conflicts with real-time multi-user |
| Bypass ACL | Security and audit trail |
| New state management library | Redux + Zustand already in use |
| Hardcoded permissions | Everything via ACL service |

---

## For Claude Code Sessions

### Before You Start

1. **Read [ROADMAP.md](./ROADMAP.md)** - Find your specific phase/task
2. **Check dependencies** - Are previous phases complete?
3. **Understand ACL** - Use `useAclPermission`, `useFeatureAccess` hooks
4. **Know real-time patterns** - `useSocket` hook for live updates

### During Development

1. **Follow existing patterns** - Look at `ProjectSidebar.tsx`, `AdminSidebar.tsx`
2. **Test with Robin** - Visual + functional validation
3. **ACL integration** - Menu items MUST respect permissions
4. **No over-engineering** - Focus on the specific task

### After Completion

1. **Mark phase as ✅ Done** in ROADMAP.md
2. **Document any deviations**
3. **Update dependencies** for next phase

---

## Status Legend

| Status | Meaning |
|--------|-----------|
| 📋 Planned | Not yet started |
| 🔶 In Progress | Active development |
| ✅ Done | Complete and tested |
| 🔲 Todo | Specific item to do |
| ⚠️ Blocked | Waiting for dependency |

---

## Quick Links

- **Frontend code:** `/apps/web/src/components/dashboard/`
- **Backend code:** `/apps/api/src/trpc/procedures/`
- **ACL hooks:** `/apps/web/src/hooks/useAclPermission.ts`
- **Socket hooks:** `/apps/web/src/hooks/useSocket.ts`
- **Base layout:** `/apps/web/src/components/layout/BaseLayout.tsx`

---

## Contact

For questions about vision or implementation, consult with Robin Waslander.

**Note:** This is an iterative project. Documentation is updated as phases progress.
