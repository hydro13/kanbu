/*
 * Permission Registry
 * Version: 1.0.0
 *
 * Central registry for all permissions in Kanbu.
 * Features register their permissions here, and the registry syncs them to the database.
 *
 * Usage:
 * 1. Define permissions in `definitions/{module}.permissions.ts`
 * 2. Import and register in `index.ts`
 * 3. Call `syncToDatabase()` on server startup
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import { prisma } from '../lib/prisma';
import type {
  PermissionDefinitions,
  RegisteredPermission,
  PermissionNode,
  PermissionScope,
  SyncResult,
} from './types';

// =============================================================================
// Permission Registry Class
// =============================================================================

class PermissionRegistry {
  private permissions: Map<string, RegisteredPermission> = new Map();
  private sortCounter = 0;

  // ===========================================================================
  // Registration
  // ===========================================================================

  /**
   * Register a module's permissions.
   * Call this for each module during initialization.
   */
  register(module: string, definitions: PermissionDefinitions): void {
    this.registerRecursive(module, module, null, definitions);
  }

  /**
   * Recursively register permissions with their children.
   */
  private registerRecursive(
    module: string,
    basePath: string,
    parentPath: string | null,
    definitions: PermissionDefinitions
  ): void {
    for (const [key, def] of Object.entries(definitions)) {
      const path = `${basePath}.${key}`;
      this.sortCounter++;

      const registered: RegisteredPermission = {
        path,
        name: def.name,
        description: def.description,
        parentPath,
        module,
        defaultFor: def.defaultFor ?? [],
        scope: def.scope ?? this.inferScope(module),
        sortOrder: this.sortCounter,
      };

      this.permissions.set(path, registered);

      // Register children recursively
      if (def.children) {
        this.registerRecursive(module, path, path, def.children);
      }
    }
  }

  /**
   * Infer permission scope from module name.
   */
  private inferScope(module: string): PermissionScope {
    if (module === 'system') return 'SYSTEM';
    if (module === 'workspace') return 'WORKSPACE';
    return 'PROJECT';
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /**
   * Get a registered permission by path.
   */
  get(path: string): RegisteredPermission | undefined {
    return this.permissions.get(path);
  }

  /**
   * Check if a permission path is registered.
   */
  has(path: string): boolean {
    return this.permissions.has(path);
  }

  /**
   * Get all registered permissions as a flat list.
   */
  getAll(): RegisteredPermission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get all registered permission paths.
   */
  getAllPaths(): string[] {
    return Array.from(this.permissions.keys());
  }

  /**
   * Get permissions as a hierarchical tree for UI display.
   */
  getTree(): PermissionNode[] {
    const rootNodes: PermissionNode[] = [];
    const nodeMap = new Map<string, PermissionNode>();

    // Create nodes for all permissions
    for (const perm of this.permissions.values()) {
      const node: PermissionNode = {
        path: perm.path,
        name: perm.name,
        description: perm.description,
        scope: perm.scope,
        defaultFor: perm.defaultFor,
        children: [],
      };
      nodeMap.set(perm.path, node);
    }

    // Build tree structure
    for (const perm of this.permissions.values()) {
      const node = nodeMap.get(perm.path)!;
      if (perm.parentPath) {
        const parent = nodeMap.get(perm.parentPath);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found, add to root
          rootNodes.push(node);
        }
      } else {
        // No parent, this is a top-level permission
        rootNodes.push(node);
      }
    }

    // Sort children by sortOrder
    const sortNodes = (nodes: PermissionNode[]): void => {
      nodes.sort((a, b) => {
        const permA = this.permissions.get(a.path);
        const permB = this.permissions.get(b.path);
        return (permA?.sortOrder ?? 0) - (permB?.sortOrder ?? 0);
      });
      for (const node of nodes) {
        sortNodes(node.children);
      }
    };
    sortNodes(rootNodes);

    return rootNodes;
  }

  /**
   * Get permissions for a specific module.
   */
  getByModule(module: string): RegisteredPermission[] {
    return this.getAll().filter((p) => p.module === module);
  }

  // ===========================================================================
  // Database Sync
  // ===========================================================================

  /**
   * Sync all registered permissions to the database.
   * - Creates new permissions
   * - Updates existing permissions
   * - Marks removed permissions as deprecated
   */
  async syncToDatabase(): Promise<SyncResult> {
    const result: SyncResult = {
      created: [],
      updated: [],
      deprecated: [],
    };

    // Get all registered permission paths
    const registeredPaths = new Set(this.getAllPaths());

    // Get all existing permissions from database
    const existingPermissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true, // This is the path in the current schema
        displayName: true,
        description: true,
        category: true,
        sortOrder: true,
        parentId: true,
      },
    });

    const existingByPath = new Map(existingPermissions.map((p) => [p.name, p]));

    // Find or create parent permission, returns ID
    const getParentId = async (parentPath: string | null): Promise<number | null> => {
      if (!parentPath) return null;
      const parent = await prisma.permission.findUnique({
        where: { name: parentPath },
        select: { id: true },
      });
      return parent?.id ?? null;
    };

    // Create or update permissions
    for (const perm of this.permissions.values()) {
      const existing = existingByPath.get(perm.path);

      if (!existing) {
        // Create new permission
        const parentId = await getParentId(perm.parentPath);
        await prisma.permission.create({
          data: {
            name: perm.path,
            displayName: perm.name,
            description: perm.description,
            category: perm.module,
            sortOrder: perm.sortOrder,
            parentId,
          },
        });
        result.created.push(perm.path);
      } else {
        // Check if update needed
        const parentId = await getParentId(perm.parentPath);
        const needsUpdate =
          existing.displayName !== perm.name ||
          existing.description !== perm.description ||
          existing.category !== perm.module ||
          existing.sortOrder !== perm.sortOrder ||
          existing.parentId !== parentId;

        if (needsUpdate) {
          await prisma.permission.update({
            where: { id: existing.id },
            data: {
              displayName: perm.name,
              description: perm.description,
              category: perm.module,
              sortOrder: perm.sortOrder,
              parentId,
            },
          });
          result.updated.push(perm.path);
        }
      }
    }

    // Mark removed permissions as deprecated (don't delete for audit trail)
    // Note: We could add a 'deprecated' field to the schema later
    for (const existing of existingPermissions) {
      if (!registeredPaths.has(existing.name)) {
        // Permission was removed from code - log it
        result.deprecated.push(existing.name);
        // Could mark as deprecated in DB if we add that field
      }
    }

    return result;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Clear all registered permissions.
   * Useful for testing.
   */
  clear(): void {
    this.permissions.clear();
    this.sortCounter = 0;
  }

  /**
   * Get statistics about registered permissions.
   */
  getStats(): { total: number; byModule: Record<string, number>; byScope: Record<string, number> } {
    const byModule: Record<string, number> = {};
    const byScope: Record<string, number> = {};

    for (const perm of this.permissions.values()) {
      byModule[perm.module] = (byModule[perm.module] ?? 0) + 1;
      byScope[perm.scope] = (byScope[perm.scope] ?? 0) + 1;
    }

    return {
      total: this.permissions.size,
      byModule,
      byScope,
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to define permissions with proper typing.
 * Use this in definition files for better IDE support.
 */
export function definePermissions<T extends PermissionDefinitions>(
  _module: string,
  definitions: T
): T {
  return definitions;
}

// =============================================================================
// Singleton Export
// =============================================================================

export const permissionRegistry = new PermissionRegistry();
