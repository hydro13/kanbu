/*
 * Seed Script: Project Features (Fase 8B)
 * Version: 1.0.0
 *
 * Creates the default features that can have ACL permissions.
 * Features are menu items/capabilities that can be shown/hidden per user or group.
 *
 * Usage:
 *   npx ts-node prisma/seed-features.ts
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 8B - Feature ACL Resources
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// Feature Definitions
// =============================================================================

interface FeatureDefinition {
  slug: string
  name: string
  description: string
  icon: string
  sortOrder: number
}

/**
 * System-wide features (projectId: null)
 * These are the default features available in all projects.
 * ACL can be set per project to override visibility.
 */
const SYSTEM_FEATURES: FeatureDefinition[] = [
  // Views (basic, usually visible to all)
  { slug: 'board', name: 'Board View', description: 'Kanban board view', icon: 'board', sortOrder: 10 },
  { slug: 'list', name: 'List View', description: 'List/table view of tasks', icon: 'list', sortOrder: 20 },
  { slug: 'calendar', name: 'Calendar View', description: 'Calendar view of tasks', icon: 'calendar', sortOrder: 30 },
  { slug: 'timeline', name: 'Timeline View', description: 'Gantt-style timeline view', icon: 'timeline', sortOrder: 40 },

  // Planning (manager features)
  { slug: 'sprints', name: 'Sprints', description: 'Sprint planning and management', icon: 'sprint', sortOrder: 100 },
  { slug: 'milestones', name: 'Milestones', description: 'Milestone tracking', icon: 'milestone', sortOrder: 110 },
  { slug: 'analytics', name: 'Analytics', description: 'Project analytics and reports', icon: 'analytics', sortOrder: 120 },

  // Management (admin features)
  { slug: 'members', name: 'Members', description: 'Manage project members', icon: 'members', sortOrder: 200 },
  { slug: 'settings', name: 'Board Settings', description: 'Configure board columns and swimlanes', icon: 'settings', sortOrder: 210 },
  { slug: 'import-export', name: 'Import/Export', description: 'Import and export project data', icon: 'import-export', sortOrder: 220 },
  { slug: 'webhooks', name: 'Webhooks', description: 'Configure webhooks and integrations', icon: 'webhook', sortOrder: 230 },
]

// =============================================================================
// Seed Function
// =============================================================================

async function seedFeatures() {
  console.log('Seeding features...')

  for (const feature of SYSTEM_FEATURES) {
    const existing = await prisma.feature.findFirst({
      where: {
        projectId: null,
        slug: feature.slug,
      },
    })

    if (existing) {
      console.log(`  Feature "${feature.slug}" already exists, updating...`)
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
      console.log(`  Creating feature "${feature.slug}"...`)
      await prisma.feature.create({
        data: {
          projectId: null, // System-wide feature
          slug: feature.slug,
          name: feature.name,
          description: feature.description,
          icon: feature.icon,
          sortOrder: feature.sortOrder,
          isActive: true,
        },
      })
    }
  }

  console.log(`Seeded ${SYSTEM_FEATURES.length} system features`)
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  try {
    await seedFeatures()
    console.log('Feature seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding features:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
