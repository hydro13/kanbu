import { ProjectRole } from '@prisma/client';
export interface ProjectAccess {
    projectId: number;
    workspaceId: number;
    userId: number;
    role: ProjectRole;
}
/**
 * Check if a user has access to a project with at least the minimum role.
 * Throws FORBIDDEN if access denied.
 *
 * @param userId - The user ID to check
 * @param projectId - The project ID to check access for
 * @param minRole - Minimum required role (default: VIEWER)
 * @returns ProjectAccess with user's actual role
 * @throws TRPCError FORBIDDEN if access denied
 */
export declare function requireProjectAccess(userId: number, projectId: number, minRole?: ProjectRole): Promise<ProjectAccess>;
/**
 * Check if a user has access to a project without throwing.
 * Returns null if no access.
 *
 * @param userId - The user ID to check
 * @param projectId - The project ID to check access for
 * @returns ProjectAccess or null
 */
export declare function getProjectAccess(userId: number, projectId: number): Promise<ProjectAccess | null>;
/**
 * Check if a role meets the minimum requirement
 *
 * @param userRole - The user's current role
 * @param minRole - The minimum required role
 * @returns true if userRole >= minRole
 */
export declare function hasMinProjectRole(userRole: ProjectRole, minRole: ProjectRole): boolean;
/**
 * Create default columns for a new project.
 * Creates: Backlog, Ready, WIP, Review, Done
 *
 * @param projectId - The project ID to create columns for
 * @returns Array of created columns
 */
export declare function createDefaultColumns(projectId: number): Promise<Array<{
    id: number;
    title: string;
    position: number;
}>>;
/**
 * Create default swimlane for a new project.
 *
 * @param projectId - The project ID to create swimlane for
 * @returns The created swimlane
 */
export declare function createDefaultSwimlane(projectId: number): Promise<{
    id: number;
    name: string;
}>;
/**
 * Generate unique project identifier from name.
 * Creates slug-like identifier for task references (e.g., "PLAN" for PLAN-123)
 *
 * @param name - The project name
 * @param workspaceId - The workspace ID for uniqueness check
 * @returns Unique identifier (max 10 chars, uppercase)
 */
export declare function generateProjectIdentifier(name: string, workspaceId: number): Promise<string>;
/**
 * Generate next task reference number for a project.
 * Format: {identifier}-{number} (e.g., PLAN-123)
 *
 * @param projectId - The project ID
 * @returns Next task reference (e.g., "PLAN-1")
 */
export declare function generateTaskReference(projectId: number): Promise<string>;
//# sourceMappingURL=project.d.ts.map