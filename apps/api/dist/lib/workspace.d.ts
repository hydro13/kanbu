import { WorkspaceRole } from '@prisma/client';
export interface WorkspaceAccess {
    workspaceId: number;
    userId: number;
    role: WorkspaceRole;
}
/**
 * Check if a user has access to a workspace with at least the minimum role.
 * Throws FORBIDDEN if access denied.
 *
 * @param userId - The user ID to check
 * @param workspaceId - The workspace ID to check access for
 * @param minRole - Minimum required role (default: VIEWER)
 * @returns WorkspaceAccess with user's actual role
 * @throws TRPCError FORBIDDEN if access denied
 */
export declare function requireWorkspaceAccess(userId: number, workspaceId: number, minRole?: WorkspaceRole): Promise<WorkspaceAccess>;
/**
 * Check if a user has access to a workspace without throwing.
 * Returns null if no access.
 *
 * @param userId - The user ID to check
 * @param workspaceId - The workspace ID to check access for
 * @returns WorkspaceAccess or null
 */
export declare function getWorkspaceAccess(userId: number, workspaceId: number): Promise<WorkspaceAccess | null>;
/**
 * Check if a role meets the minimum requirement
 *
 * @param userRole - The user's current role
 * @param minRole - The minimum required role
 * @returns true if userRole >= minRole
 */
export declare function hasMinRole(userRole: WorkspaceRole, minRole: WorkspaceRole): boolean;
/**
 * Create a default workspace for a newly registered user.
 * The user becomes the OWNER of this workspace.
 *
 * @param userId - The user ID to create workspace for
 * @param userName - The user's name for workspace naming
 * @returns The created workspace
 */
export declare function createDefaultWorkspace(userId: number, userName: string): Promise<{
    id: number;
    name: string;
    slug: string;
}>;
/**
 * Generate a unique slug for a workspace name.
 * Appends a number if the slug already exists.
 *
 * @param name - The workspace name to generate slug from
 * @returns A unique slug
 */
export declare function generateUniqueSlug(name: string): Promise<string>;
/**
 * Generate a secure random token for workspace invitations.
 *
 * @returns A 64-character hex token
 */
export declare function generateInviteToken(): string;
/**
 * Calculate invitation expiration date (7 days from now by default)
 *
 * @param days - Number of days until expiration
 * @returns Expiration date
 */
export declare function getInviteExpiration(days?: number): Date;
//# sourceMappingURL=workspace.d.ts.map