-- Data Migration: Workspace Users and Project Members to AD-Style Groups
-- This script creates groups for existing workspaces/projects and migrates memberships
--
-- Run this AFTER the main migration.sql
-- AI Architect: Robin Waslander <R.Waslander@gmail.com>
-- Date: 2026-01-05

-- =============================================================================
-- STEP 1: Create workspace groups for each existing workspace
-- =============================================================================

-- Create "workspace-{slug}" groups (membership)
INSERT INTO "groups" ("name", "display_name", "description", "type", "workspace_id", "is_system", "is_active", "updated_at")
SELECT
    'workspace-' || w.slug,
    'Workspace: ' || w.name,
    'Members of workspace ' || w.name,
    'WORKSPACE',
    w.id,
    false,
    true,
    CURRENT_TIMESTAMP
FROM "workspaces" w
WHERE w.is_active = true
ON CONFLICT ("name") DO NOTHING;

-- Create "workspace-{slug}-admins" groups (admin rights)
INSERT INTO "groups" ("name", "display_name", "description", "type", "workspace_id", "is_system", "is_active", "updated_at")
SELECT
    'workspace-' || w.slug || '-admins',
    'Workspace Admins: ' || w.name,
    'Administrators of workspace ' || w.name,
    'WORKSPACE_ADMIN',
    w.id,
    false,
    true,
    CURRENT_TIMESTAMP
FROM "workspaces" w
WHERE w.is_active = true
ON CONFLICT ("name") DO NOTHING;

-- =============================================================================
-- STEP 2: Migrate workspace_users to group memberships
-- =============================================================================

-- Add all workspace users to workspace membership groups
INSERT INTO "group_members" ("group_id", "user_id", "added_at", "external_sync")
SELECT DISTINCT
    g.id,
    wu.user_id,
    wu.joined_at,
    false
FROM "workspace_users" wu
JOIN "workspaces" w ON w.id = wu.workspace_id
JOIN "groups" g ON g.name = 'workspace-' || w.slug AND g.type = 'WORKSPACE'
ON CONFLICT ("group_id", "user_id") DO NOTHING;

-- Add workspace OWNER and ADMIN to workspace admin groups
INSERT INTO "group_members" ("group_id", "user_id", "added_at", "external_sync")
SELECT DISTINCT
    g.id,
    wu.user_id,
    wu.joined_at,
    false
FROM "workspace_users" wu
JOIN "workspaces" w ON w.id = wu.workspace_id
JOIN "groups" g ON g.name = 'workspace-' || w.slug || '-admins' AND g.type = 'WORKSPACE_ADMIN'
WHERE wu.role IN ('OWNER', 'ADMIN')
ON CONFLICT ("group_id", "user_id") DO NOTHING;

-- =============================================================================
-- STEP 3: Create project groups for each existing project
-- =============================================================================

-- Create "project-{identifier}" groups (membership)
-- If identifier is null, use project ID
INSERT INTO "groups" ("name", "display_name", "description", "type", "workspace_id", "project_id", "is_system", "is_active", "updated_at")
SELECT
    'project-' || COALESCE(LOWER(p.identifier), 'id-' || p.id::text),
    'Project: ' || p.name,
    'Members of project ' || p.name,
    'PROJECT',
    p.workspace_id,
    p.id,
    false,
    true,
    CURRENT_TIMESTAMP
FROM "projects" p
WHERE p.is_active = true
ON CONFLICT ("name") DO NOTHING;

-- =============================================================================
-- STEP 4: Migrate project_members to group memberships
-- =============================================================================

-- Add all project members to project membership groups
INSERT INTO "group_members" ("group_id", "user_id", "added_at", "external_sync")
SELECT DISTINCT
    g.id,
    pm.user_id,
    pm.joined_at,
    false
FROM "project_members" pm
JOIN "projects" p ON p.id = pm.project_id
JOIN "groups" g ON g.project_id = p.id AND g.type = 'PROJECT'
ON CONFLICT ("group_id", "user_id") DO NOTHING;

-- =============================================================================
-- STEP 5: Verify migration
-- =============================================================================

-- This query shows the migration results (for verification only, remove in production)
-- SELECT
--     g.name,
--     g.display_name,
--     g.type,
--     COUNT(gm.id) as member_count
-- FROM "groups" g
-- LEFT JOIN "group_members" gm ON gm.group_id = g.id
-- GROUP BY g.id, g.name, g.display_name, g.type
-- ORDER BY g.type, g.name;
