# Procedure: Nieuwe Feature/Menu Item Toevoegen

> **Versie:** 1.0.0
> **Datum:** 2026-01-08
> **Fase:** 8C - System-wide Feature ACL

## Overzicht

Alle menu items en features in Kanbu worden beheerd via het ACL (Access Control List) systeem.
Dit betekent dat nieuwe features **expliciet** moeten worden toegevoegd aan het systeem om
zichtbaar te zijn voor gebruikers.

## Checklist

- [ ] Feature toegevoegd aan `seed-features.ts`
- [ ] Seed script uitgevoerd
- [ ] Sidebar/layout geupdate met ACL check
- [ ] TypeScript types bijgewerkt (indien nodig)
- [ ] Getest in browser

## Stap 1: Bepaal de Scope

Features hebben een van de volgende scopes:

| Scope | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `dashboard` | Dashboard menu items | Overview, Widgets, Shortcuts |
| `profile` | Gebruiker profiel features | Settings, Notifications, API Keys |
| `admin` | Systeem administratie | Users, Groups, ACL, Invites |
| `project` | Project-specifieke features | Board, List, Calendar, Analytics |

## Stap 2: Voeg Feature toe aan Seed File

Open `packages/shared/prisma/seed-features.ts` en voeg de feature toe aan de juiste scope array.

### Voorbeeld: Admin Feature

```typescript
const ADMIN_FEATURES: FeatureDefinition[] = [
  // ... bestaande features
  {
    scope: 'admin',
    slug: 'audit-log',           // Unieke identifier
    name: 'Audit Log',           // Display naam
    description: 'View system audit log',
    icon: 'log',                 // Icon identifier
    sortOrder: 60,               // Volgorde in menu
  },
]
```

### Voorbeeld: Dashboard Feature

```typescript
const DASHBOARD_FEATURES: FeatureDefinition[] = [
  // ... bestaande features
  {
    scope: 'dashboard',
    slug: 'calendar-widget',
    name: 'Calendar Widget',
    description: 'Dashboard calendar widget',
    icon: 'calendar',
    sortOrder: 50,
  },
]
```

### Voorbeeld: Project Feature

```typescript
const PROJECT_FEATURES: FeatureDefinition[] = [
  // ... bestaande features
  {
    scope: 'project',
    slug: 'wiki',
    name: 'Wiki',
    description: 'Project wiki pages',
    icon: 'document',
    sortOrder: 300,
  },
]
```

## Stap 3: Run de Seed

```bash
cd packages/shared
pnpm tsx prisma/seed-features.ts
```

Je zou output moeten zien zoals:
```
Seeding features...

  [admin] Creating "audit-log"
  ...

Feature seeding completed successfully!
```

## Stap 4: Update de Sidebar/Layout

### Voor Project Features

De `ProjectSidebar` gebruikt al ACL checks. Voeg alleen het menu item toe:

```typescript
// In apps/web/src/components/layout/ProjectSidebar.tsx
function getNavSections(workspaceSlug: string, projectIdentifier: string): NavSection[] {
  const basePath = `/workspace/${workspaceSlug}/project/${projectIdentifier}`
  return [
    // ...
    {
      title: 'Content',
      items: [
        // ... bestaande items
        { label: 'Wiki', path: `${basePath}/wiki`, icon: WikiIcon, slug: 'wiki' },
      ],
    },
  ]
}
```

### Voor Admin Features

Als je de AdminSidebar wilt updaten met ACL checks:

```typescript
// In apps/web/src/components/admin/AdminSidebar.tsx
import { useAdminFeatureAccess, type AdminFeatureSlug } from '@/hooks/useFeatureAccess'

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const { canSeeFeature, isLoading } = useAdminFeatureAccess()

  // Voeg slug toe aan nav items
  interface NavItem {
    label: string
    path: string
    icon: React.ComponentType<{ className?: string }>
    slug: AdminFeatureSlug
  }

  const navItems: NavItem[] = [
    { label: 'Audit Log', path: '/admin/audit', icon: LogIcon, slug: 'audit-log' },
  ]

  // Filter op ACL
  const filteredItems = navItems.filter(item =>
    isLoading || canSeeFeature(item.slug)
  )

  // ... render filteredItems
}
```

### Voor Dashboard Features

```typescript
// In apps/web/src/components/dashboard/DashboardSidebar.tsx
import { useDashboardFeatureAccess, type DashboardFeatureSlug } from '@/hooks/useFeatureAccess'

// Zelfde patroon als AdminSidebar
```

## Stap 5: Update TypeScript Types (indien nodig)

Als je een nieuwe feature slug toevoegt, update de types in `useFeatureAccess.ts`:

```typescript
// In apps/web/src/hooks/useFeatureAccess.ts

// Voeg nieuwe slug toe aan het juiste type
export type AdminFeatureSlug =
  | 'users'
  | 'groups'
  | 'acl'
  | 'invites'
  | 'system-settings'
  | 'audit-log'  // Nieuwe feature

// Update de feature categorieen
const ADMIN_READ_FEATURES: AdminFeatureSlug[] = ['users', 'groups', 'audit-log']
```

## Stap 6: Test in Browser

1. Start de dev servers
2. Ga naar de ACL Manager (`/admin/acl`)
3. Expandeer de juiste sectie (Dashboard/Admin/Profile/Project)
4. Verify dat je nieuwe feature zichtbaar is onder "Features"
5. Test dat de feature alleen zichtbaar is voor users met de juiste ACL permissions

## Belangrijk: Feature Visibility

**Een nieuwe feature is ONZICHTBAAR totdat ACL permissions worden toegekend!**

Dit is by design: fail-safe security. Om een feature te activeren:

1. Ga naar ACL Manager (`/admin/acl`)
2. Selecteer de feature in de resource tree
3. Grant permissions aan de gewenste users/groups

## Veelgemaakte Fouten

| Fout | Gevolg | Oplossing |
|------|--------|-----------|
| Seed niet uitgevoerd | Feature niet in database | Run `pnpm tsx prisma/seed-features.ts` |
| Slug mismatch | Feature niet gevonden | Zorg dat slug in seed en sidebar identiek is |
| Type niet geupdate | TypeScript errors | Update de type definitions |
| ACL niet toegekend | Feature onzichtbaar | Grant permissions in ACL Manager |

## Gerelateerde Documentatie

- [ACL Roadmap](../ACL/ROADMAP.md)
- [CLAUDE.md](../../CLAUDE.md) - Hoofddocumentatie
- [seed-features.ts](../../packages/shared/prisma/seed-features.ts) - Feature definities
