-- AD-Style Groups Migration
-- Creates Group and GroupMember tables for LDAP-compatible permission system
--
-- Modified on 2026-01-05
-- AI Architect: Robin Waslander <R.Waslander@gmail.com>

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('SYSTEM', 'WORKSPACE', 'WORKSPACE_ADMIN', 'PROJECT', 'PROJECT_ADMIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GroupSource" AS ENUM ('LOCAL', 'LDAP', 'OAUTH');

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL,
    "workspace_id" INTEGER,
    "project_id" INTEGER,
    "external_id" VARCHAR(255),
    "source" "GroupSource" NOT NULL DEFAULT 'LOCAL',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" INTEGER,
    "external_sync" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_external_id_key" ON "groups"("external_id");

-- CreateIndex
CREATE INDEX "groups_type_idx" ON "groups"("type");

-- CreateIndex
CREATE INDEX "groups_workspace_id_idx" ON "groups"("workspace_id");

-- CreateIndex
CREATE INDEX "groups_project_id_idx" ON "groups"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert system group: Domain Admins
INSERT INTO "groups" ("name", "display_name", "description", "type", "is_system", "is_active", "updated_at")
VALUES (
    'Domain Admins',
    'Domain Admins',
    'System administrators with full access to all workspaces and projects',
    'SYSTEM',
    true,
    true,
    CURRENT_TIMESTAMP
);

-- Migrate existing ADMIN users to Domain Admins group
INSERT INTO "group_members" ("group_id", "user_id", "added_at", "external_sync")
SELECT
    (SELECT id FROM "groups" WHERE name = 'Domain Admins'),
    u.id,
    CURRENT_TIMESTAMP,
    false
FROM "users" u
WHERE u.role = 'ADMIN';
