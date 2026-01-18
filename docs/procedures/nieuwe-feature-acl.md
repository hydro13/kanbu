# Procedure: Adding New Feature/Menu Item

> **Version:** 1.0.0
> **Date:** 2026-01-08
> **Phase:** 8C - System-wide Feature ACL

## Overview

All menu items and features in Kanbu are managed via the ACL (Access Control List) system.
This means that new features **must explicitly** be added to the system to be
visible to users.

## Checklist

- [ ] Feature added to `seed-features.ts`
- [ ] Seed script executed
- [ ] Sidebar/layout updated with ACL check
- [ ] TypeScript types updated (if necessary)
- [ ] Tested in browser

## Step 1: Determine the Scope

Features have one of the following scopes:

| Scope       | Count | Examples                                                                                     |
| ----------- | ----- | -------------------------------------------------------------------------------------------- |
| `dashboard` | 4     | overview, my-tasks, my-subtasks, my-workspaces                                               |
| `profile`   | 16    | summary, time-tracking, last-logins, sessions, edit-profile, notifications, api-tokens, etc. |
| `admin`     | 9     | users, create-user, acl, permission-tree, invites, workspaces, settings-general, etc.        |
| `project`   | 11    | board, list, calendar, timeline, sprints, milestones, analytics, members, settings, etc.     |

**Total: 40 features in the system**

See `packages/shared/prisma/seed-features.ts` for the complete list per scope.

## Step 2: Add Feature to Seed File

Open `packages/shared/prisma/seed-features.ts` and add the feature to the appropriate scope array.

### Example: Admin Feature

```typescript
const ADMIN_FEATURES: FeatureDefinition[] = [
  // ... existing features
  {
    scope: 'admin',
    slug: 'audit-log', // Unique identifier
    name: 'Audit Log', // Display name
    description: 'View system audit log',
    icon: 'log', // Icon identifier
    sortOrder: 60, // Order in menu
  },
];
```

### Example: Dashboard Feature

```typescript
const DASHBOARD_FEATURES: FeatureDefinition[] = [
  // ... existing features
  {
    scope: 'dashboard',
    slug: 'calendar-widget',
    name: 'Calendar Widget',
    description: 'Dashboard calendar widget',
    icon: 'calendar',
    sortOrder: 50,
  },
];
```

### Example: Project Feature

```typescript
const PROJECT_FEATURES: FeatureDefinition[] = [
  // ... existing features
  {
    scope: 'project',
    slug: 'wiki',
    name: 'Wiki',
    description: 'Project wiki pages',
    icon: 'document',
    sortOrder: 300,
  },
];
```

## Step 3: Run the Seed

```bash
cd packages/shared
pnpm tsx prisma/seed-features.ts
```

You should see output like:

```
Seeding features...

  [admin] Creating "audit-log"
  ...

Feature seeding completed successfully!
```

## Step 4: Update the Sidebar/Layout

### For Project Features

The `ProjectSidebar` already uses ACL checks. Just add the menu item:

```typescript
// In apps/web/src/components/layout/ProjectSidebar.tsx
function getNavSections(workspaceSlug: string, projectIdentifier: string): NavSection[] {
  const basePath = `/workspace/${workspaceSlug}/project/${projectIdentifier}`;
  return [
    // ...
    {
      title: 'Content',
      items: [
        // ... existing items
        { label: 'Wiki', path: `${basePath}/wiki`, icon: WikiIcon, slug: 'wiki' },
      ],
    },
  ];
}
```

### For Admin Features

To update the AdminSidebar with ACL checks:

```typescript
// In apps/web/src/components/admin/AdminSidebar.tsx
import { useAdminFeatureAccess, type AdminFeatureSlug } from '@/hooks/useFeatureAccess';

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const { canSeeFeature, isLoading } = useAdminFeatureAccess();

  // Add slug to nav items
  interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    slug: AdminFeatureSlug;
  }

  const navItems: NavItem[] = [
    { label: 'Audit Log', path: '/admin/audit', icon: LogIcon, slug: 'audit-log' },
  ];

  // Filter based on ACL
  const filteredItems = navItems.filter((item) => isLoading || canSeeFeature(item.slug));

  // ... render filteredItems
}
```

### For Dashboard Features

```typescript
// In apps/web/src/components/dashboard/DashboardSidebar.tsx
import { useDashboardFeatureAccess, type DashboardFeatureSlug } from '@/hooks/useFeatureAccess';

// Same pattern as AdminSidebar
```

## Step 5: Update TypeScript Types (if necessary)

If you add a new feature slug, update the types in `useFeatureAccess.ts`:

```typescript
// In apps/web/src/hooks/useFeatureAccess.ts

// Add new slug to the appropriate type
// Example for Admin features:
export type AdminFeatureSlug =
  // User Management section
  | 'users'
  | 'create-user'
  | 'acl'
  | 'permission-tree'
  | 'invites'
  // Workspaces section
  | 'workspaces'
  // System Settings section
  | 'settings-general'
  | 'settings-security'
  | 'backup'
  | 'audit-log'; // New feature

// Update the feature categories (determines which permission is needed)
const ADMIN_READ_FEATURES: AdminFeatureSlug[] = ['users', 'workspaces', 'audit-log'];
const ADMIN_EXECUTE_FEATURES: AdminFeatureSlug[] = ['create-user', 'invites'];
const ADMIN_PERMISSIONS_FEATURES: AdminFeatureSlug[] = [
  'acl',
  'permission-tree',
  'settings-general',
  'settings-security',
  'backup',
];
```

**Note:** The feature categories determine which ACL permission level is needed:

- `READ_FEATURES`: Basic access (canRead)
- `EXECUTE_FEATURES`: Advanced features (canExecute)
- `PERMISSIONS_FEATURES`: Management features (canManagePermissions)

## Step 6: Test in Browser

1. Start the dev servers
2. Go to the ACL Manager (`/admin/acl`)
3. Expand the appropriate section (Dashboard/Admin/Profile/Project)
4. Verify that your new feature is visible under "Features"
5. Test that the feature is only visible to users with the correct ACL permissions

## Important: Feature Visibility

**A new feature is INVISIBLE until ACL permissions are granted!**

This is by design: fail-safe security. To activate a feature:

1. Go to ACL Manager (`/admin/acl`)
2. Select the feature in the resource tree
3. Grant permissions to the desired users/groups

## Common Mistakes

| Mistake           | Consequence             | Solution                                      |
| ----------------- | ----------------------- | --------------------------------------------- |
| Seed not executed | Feature not in database | Run `pnpm tsx prisma/seed-features.ts`        |
| Slug mismatch     | Feature not found       | Ensure slug in seed and sidebar are identical |
| Type not updated  | TypeScript errors       | Update the type definitions                   |
| ACL not granted   | Feature invisible       | Grant permissions in ACL Manager              |

## Related Documentation

- [ACL Roadmap](../ACL/ROADMAP.md)
- [CLAUDE.md](../../CLAUDE.md) - Main documentation
- [seed-features.ts](../../packages/shared/prisma/seed-features.ts) - Feature definitions
