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
 */
const DASHBOARD_FEATURES: FeatureDefinition[] = [
  {
    scope: 'dashboard',
    slug: 'overview',
    name: 'Dashboard Overview',
    description: 'Main dashboard with summary statistics',
    icon: 'home',
    sortOrder: 10,
  },
  {
    scope: 'dashboard',
    slug: 'widgets',
    name: 'Dashboard Widgets',
    description: 'Customizable dashboard widgets',
    icon: 'widgets',
    sortOrder: 20,
  },
  {
    scope: 'dashboard',
    slug: 'shortcuts',
    name: 'Quick Shortcuts',
    description: 'Quick access shortcuts panel',
    icon: 'shortcuts',
    sortOrder: 30,
  },
  {
    scope: 'dashboard',
    slug: 'recent-projects',
    name: 'Recent Projects',
    description: 'Recently accessed projects list',
    icon: 'history',
    sortOrder: 40,
  },
]

/**
 * PROFILE FEATURES
 * User profile and personal settings.
 * Available in the user profile section.
 */
const PROFILE_FEATURES: FeatureDefinition[] = [
  {
    scope: 'profile',
    slug: 'settings',
    name: 'Profile Settings',
    description: 'Personal account settings and preferences',
    icon: 'user-settings',
    sortOrder: 10,
  },
  {
    scope: 'profile',
    slug: 'notifications',
    name: 'Notification Settings',
    description: 'Configure notification preferences',
    icon: 'bell',
    sortOrder: 20,
  },
  {
    scope: 'profile',
    slug: 'api-keys',
    name: 'API Keys',
    description: 'Manage personal API keys',
    icon: 'key',
    sortOrder: 30,
  },
  {
    scope: 'profile',
    slug: 'sessions',
    name: 'Active Sessions',
    description: 'View and manage active login sessions',
    icon: 'devices',
    sortOrder: 40,
  },
]

/**
 * ADMIN FEATURES
 * System administration features.
 * Only visible in the admin panel for users with admin access.
 */
const ADMIN_FEATURES: FeatureDefinition[] = [
  {
    scope: 'admin',
    slug: 'users',
    name: 'User Management',
    description: 'Manage system users',
    icon: 'users',
    sortOrder: 10,
  },
  {
    scope: 'admin',
    slug: 'groups',
    name: 'Security Groups',
    description: 'Manage security groups and memberships',
    icon: 'group',
    sortOrder: 20,
  },
  {
    scope: 'admin',
    slug: 'acl',
    name: 'Access Control',
    description: 'Manage ACL permissions',
    icon: 'shield',
    sortOrder: 30,
  },
  {
    scope: 'admin',
    slug: 'invites',
    name: 'User Invitations',
    description: 'Manage pending invitations',
    icon: 'mail',
    sortOrder: 40,
  },
  {
    scope: 'admin',
    slug: 'system-settings',
    name: 'System Settings',
    description: 'Configure system-wide settings',
    icon: 'settings',
    sortOrder: 50,
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
