/*
 * Seed Script: System Features (Fase 8C)
 * Version: 2.0.0
 *
 * Creates ALL features that can have ACL permissions across the entire Kanbu system.
 * Features are menu items/capabilities that can be shown/hidden per user or group.
 *
 * SCOPES:
 * - dashboard : Dashboard menu items (home page, widgets, shortcuts)
 * - profile   : User profile features (settings, notifications, API keys)
 * - admin     : System administration (users, groups, ACL, invites)
 * - project   : Project-specific features (board views, sprints, analytics)
 *
 * IMPORTANT FOR FUTURE CLAUDE CODE SESSIONS:
 * When adding a new page, menu item, or feature to Kanbu:
 * 1. Add it to the appropriate scope section below
 * 2. Run: pnpm prisma db seed (or npx ts-node prisma/seed-features.ts)
 * 3. The feature will be hidden by default until ACL permissions are granted
 * 4. Update the corresponding sidebar/layout to check canSeeFeature()
 *
 * Usage:
 *   npx ts-node prisma/seed-features.ts
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 8C - System-wide Feature ACL
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// Types
// =============================================================================

type FeatureScope = 'dashboard' | 'profile' | 'admin' | 'project'

interface FeatureDefinition {
  scope: FeatureScope
  slug: string
  name: string
  description: string
  icon: string
  sortOrder: number
}

// =============================================================================
// Feature Definitions by Scope
// =============================================================================

/**
 * DASHBOARD FEATURES
 * Menu items on the main dashboard/home page.
 * Visible after login, before selecting a workspace/project.
 * Source: DashboardSidebar.tsx
 */
const DASHBOARD_FEATURES: FeatureDefinition[] = [
  {
    scope: 'dashboard',
    slug: 'overview',
    name: 'Overview',
    description: 'Main dashboard with summary statistics',
    icon: 'home',
    sortOrder: 10,
  },
  {
    scope: 'dashboard',
    slug: 'my-tasks',
    name: 'My Tasks',
    description: 'Tasks assigned to the current user',
    icon: 'task',
    sortOrder: 20,
  },
  {
    scope: 'dashboard',
    slug: 'my-subtasks',
    name: 'My Subtasks',
    description: 'Subtasks assigned to the current user',
    icon: 'subtask',
    sortOrder: 30,
  },
  {
    scope: 'dashboard',
    slug: 'my-workspaces',
    name: 'My Workspaces',
    description: 'Workspaces the user is a member of',
    icon: 'building',
    sortOrder: 40,
  },
]

/**
 * PROFILE FEATURES
 * User profile and personal settings.
 * Available in the user profile section.
 * Source: ProfileSidebar.tsx
 */
const PROFILE_FEATURES: FeatureDefinition[] = [
  // Information section
  {
    scope: 'profile',
    slug: 'summary',
    name: 'Summary',
    description: 'Profile summary overview',
    icon: 'user',
    sortOrder: 10,
  },
  {
    scope: 'profile',
    slug: 'time-tracking',
    name: 'Time tracking',
    description: 'View time tracking data',
    icon: 'clock',
    sortOrder: 20,
  },
  {
    scope: 'profile',
    slug: 'last-logins',
    name: 'Last logins',
    description: 'View login history',
    icon: 'login',
    sortOrder: 30,
  },
  {
    scope: 'profile',
    slug: 'sessions',
    name: 'Persistent connections',
    description: 'View and manage active login sessions',
    icon: 'device',
    sortOrder: 40,
  },
  {
    scope: 'profile',
    slug: 'password-history',
    name: 'Password reset history',
    description: 'View password change history',
    icon: 'key',
    sortOrder: 50,
  },
  {
    scope: 'profile',
    slug: 'metadata',
    name: 'Metadata',
    description: 'View account metadata',
    icon: 'database',
    sortOrder: 60,
  },

  // Actions section
  {
    scope: 'profile',
    slug: 'edit-profile',
    name: 'Edit profile',
    description: 'Edit profile information',
    icon: 'pencil',
    sortOrder: 100,
  },
  {
    scope: 'profile',
    slug: 'avatar',
    name: 'Avatar',
    description: 'Change profile picture',
    icon: 'photo',
    sortOrder: 110,
  },
  {
    scope: 'profile',
    slug: 'change-password',
    name: 'Change password',
    description: 'Update account password',
    icon: 'lock',
    sortOrder: 120,
  },
  {
    scope: 'profile',
    slug: 'two-factor-auth',
    name: 'Two factor auth',
    description: 'Configure two-factor authentication',
    icon: 'shield',
    sortOrder: 130,
  },
  {
    scope: 'profile',
    slug: 'public-access',
    name: 'Public access',
    description: 'Configure public profile visibility',
    icon: 'globe',
    sortOrder: 140,
  },
  {
    scope: 'profile',
    slug: 'notifications',
    name: 'Notifications',
    description: 'Configure notification preferences',
    icon: 'bell',
    sortOrder: 150,
  },
  {
    scope: 'profile',
    slug: 'external-accounts',
    name: 'External accounts',
    description: 'Link external accounts (Google, GitHub, etc.)',
    icon: 'link',
    sortOrder: 160,
  },
  {
    scope: 'profile',
    slug: 'integrations',
    name: 'Integrations',
    description: 'Manage third-party integrations',
    icon: 'puzzle',
    sortOrder: 170,
  },
  {
    scope: 'profile',
    slug: 'api-tokens',
    name: 'API tokens',
    description: 'Manage personal API tokens',
    icon: 'code',
    sortOrder: 180,
  },
  {
    scope: 'profile',
    slug: 'hourly-rate',
    name: 'Hourly rate',
    description: 'Set personal hourly rate for time tracking',
    icon: 'currency',
    sortOrder: 190,
  },
]

/**
 * ADMIN FEATURES
 * System administration features.
 * Only visible in the admin panel for users with admin access.
 * Source: AdminSidebar.tsx
 */
const ADMIN_FEATURES: FeatureDefinition[] = [
  // User Management section
  {
    scope: 'admin',
    slug: 'users',
    name: 'All Users',
    description: 'View and manage all system users',
    icon: 'users',
    sortOrder: 10,
  },
  {
    scope: 'admin',
    slug: 'create-user',
    name: 'Create User',
    description: 'Create new user accounts',
    icon: 'user-plus',
    sortOrder: 20,
  },
  {
    scope: 'admin',
    slug: 'acl',
    name: 'ACL Manager',
    description: 'Manage access control lists',
    icon: 'key',
    sortOrder: 30,
  },
  {
    scope: 'admin',
    slug: 'permission-tree',
    name: 'Permission Tree',
    description: 'View hierarchical permission structure',
    icon: 'tree',
    sortOrder: 40,
  },
  {
    scope: 'admin',
    slug: 'invites',
    name: 'Invites',
    description: 'Manage pending user invitations',
    icon: 'mail',
    sortOrder: 50,
  },

  // Workspaces section
  {
    scope: 'admin',
    slug: 'workspaces',
    name: 'My Workspaces',
    description: 'Manage workspaces',
    icon: 'building',
    sortOrder: 100,
  },

  // System Settings section
  {
    scope: 'admin',
    slug: 'settings-general',
    name: 'General',
    description: 'General system settings',
    icon: 'cog',
    sortOrder: 200,
  },
  {
    scope: 'admin',
    slug: 'settings-security',
    name: 'Security',
    description: 'Security settings and policies',
    icon: 'shield',
    sortOrder: 210,
  },
  {
    scope: 'admin',
    slug: 'backup',
    name: 'Backup',
    description: 'Database backup and restore',
    icon: 'database',
    sortOrder: 220,
  },

  // Integrations section
  {
    scope: 'admin',
    slug: 'github',
    name: 'GitHub',
    description: 'Manage GitHub App installations and user mappings',
    icon: 'github',
    sortOrder: 300,
  },
]

/**
 * PROJECT FEATURES
 * Project-specific menu items and capabilities.
 * These are shown in the project sidebar when viewing a project.
 *
 * Note: For project scope, features are system-wide templates (projectId: null).
 * ACL checks happen at runtime against the specific project being viewed.
 */
const PROJECT_FEATURES: FeatureDefinition[] = [
  // Views (basic, usually visible to all project members)
  {
    scope: 'project',
    slug: 'board',
    name: 'Board View',
    description: 'Kanban board view',
    icon: 'board',
    sortOrder: 10,
  },
  {
    scope: 'project',
    slug: 'list',
    name: 'List View',
    description: 'List/table view of tasks',
    icon: 'list',
    sortOrder: 20,
  },
  {
    scope: 'project',
    slug: 'calendar',
    name: 'Calendar View',
    description: 'Calendar view of tasks',
    icon: 'calendar',
    sortOrder: 30,
  },
  {
    scope: 'project',
    slug: 'timeline',
    name: 'Timeline View',
    description: 'Gantt-style timeline view',
    icon: 'timeline',
    sortOrder: 40,
  },

  // Planning (manager features)
  {
    scope: 'project',
    slug: 'sprints',
    name: 'Sprints',
    description: 'Sprint planning and management',
    icon: 'sprint',
    sortOrder: 100,
  },
  {
    scope: 'project',
    slug: 'milestones',
    name: 'Milestones',
    description: 'Milestone tracking',
    icon: 'milestone',
    sortOrder: 110,
  },
  {
    scope: 'project',
    slug: 'analytics',
    name: 'Analytics',
    description: 'Project analytics and reports',
    icon: 'analytics',
    sortOrder: 120,
  },

  // Management (admin features)
  {
    scope: 'project',
    slug: 'members',
    name: 'Members',
    description: 'Manage project members',
    icon: 'members',
    sortOrder: 200,
  },
  {
    scope: 'project',
    slug: 'settings',
    name: 'Board Settings',
    description: 'Configure board columns and swimlanes',
    icon: 'settings',
    sortOrder: 210,
  },
  {
    scope: 'project',
    slug: 'import-export',
    name: 'Import/Export',
    description: 'Import and export project data',
    icon: 'import-export',
    sortOrder: 220,
  },
  {
    scope: 'project',
    slug: 'webhooks',
    name: 'Webhooks',
    description: 'Configure webhooks and integrations',
    icon: 'webhook',
    sortOrder: 230,
  },
]

// =============================================================================
// All Features Combined
// =============================================================================

const ALL_FEATURES: FeatureDefinition[] = [
  ...DASHBOARD_FEATURES,
  ...PROFILE_FEATURES,
  ...ADMIN_FEATURES,
  ...PROJECT_FEATURES,
]

// =============================================================================
// Seed Function
// =============================================================================

async function seedFeatures() {
  console.log('Seeding features...\n')

  // Track counts per scope
  const counts: Record<string, number> = {
    dashboard: 0,
    profile: 0,
    admin: 0,
    project: 0,
  }

  for (const feature of ALL_FEATURES) {
    const existing = await prisma.feature.findFirst({
      where: {
        scope: feature.scope,
        projectId: null, // System-wide features only
        slug: feature.slug,
      },
    })

    if (existing) {
      console.log(`  [${feature.scope}] Updating "${feature.slug}"`)
      await prisma.feature.update({
        where: { id: existing.id },
        data: {
          name: feature.name,
          description: feature.description,
          icon: feature.icon,
          sortOrder: feature.sortOrder,
        },
      })
    } else {
      console.log(`  [${feature.scope}] Creating "${feature.slug}"`)
      await prisma.feature.create({
        data: {
          scope: feature.scope,
          projectId: null, // System-wide feature template
          slug: feature.slug,
          name: feature.name,
          description: feature.description,
          icon: feature.icon,
          sortOrder: feature.sortOrder,
          isActive: true,
        },
      })
    }

    counts[feature.scope]++
  }

  console.log('\nFeature counts by scope:')
  console.log(`  - Dashboard: ${counts.dashboard}`)
  console.log(`  - Profile:   ${counts.profile}`)
  console.log(`  - Admin:     ${counts.admin}`)
  console.log(`  - Project:   ${counts.project}`)
  console.log(`  - Total:     ${ALL_FEATURES.length}`)
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  try {
    await seedFeatures()
    console.log('\nFeature seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding features:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
