export declare const workspaceRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
        res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
        prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
        user: import("../context").AuthUser | null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Create a new workspace
     * User becomes OWNER automatically
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            description?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            slug: string;
            description: string | null;
            createdAt: Date;
        };
        meta: object;
    }>;
    /**
     * List all workspaces the user has access to
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            role: import("@prisma/client").$Enums.WorkspaceRole;
            memberCount: number;
            projectCount: number;
            name: string;
            id: number;
            slug: string;
            description: string | null;
            createdAt: Date;
            _count: {
                users: number;
                projects: number;
            };
        }[];
        meta: object;
    }>;
    /**
     * Get workspace details
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: number;
        };
        output: {
            memberCount: number;
            projectCount: number;
            name: string;
            id: number;
            slug: string;
            description: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
            updatedAt: Date;
            _count: {
                users: number;
                projects: number;
            };
        };
        meta: object;
    }>;
    /**
     * Update workspace settings
     * Requires OWNER or ADMIN access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: number;
            name?: string | undefined;
            description?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            slug: string;
            description: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            updatedAt: Date;
        };
        meta: object;
    }>;
    /**
     * Delete a workspace
     * Requires OWNER access only
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get workspace members
     * Requires at least VIEWER access
     */
    getMembers: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: number;
        };
        output: {
            role: import("@prisma/client").$Enums.WorkspaceRole;
            joinedAt: Date;
            name: string;
            id: number;
            email: string;
            username: string;
            avatarUrl: string | null;
        }[];
        meta: object;
    }>;
    /**
     * Invite a user to the workspace via email
     * Requires ADMIN or OWNER access
     */
    invite: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: number;
            email: string;
            role?: "ADMIN" | "MEMBER" | "VIEWER" | undefined;
        };
        output: {
            type: "added";
            message: string;
            invitationId?: undefined;
        } | {
            type: "invited";
            message: string;
            invitationId: number;
        };
        meta: object;
    }>;
    /**
     * Remove a member from workspace
     * Requires ADMIN or OWNER access
     * Cannot remove the OWNER
     */
    removeMember: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: number;
            userId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Update a member's role
     * Requires OWNER access to change to/from ADMIN
     * ADMIN can change MEMBER/VIEWER roles
     */
    updateMemberRole: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: number;
            userId: number;
            role: "ADMIN" | "MEMBER" | "VIEWER";
        };
        output: {
            success: boolean;
            newRole: "ADMIN" | "MEMBER" | "VIEWER";
        };
        meta: object;
    }>;
    /**
     * Get pending invitations for a workspace
     * Requires ADMIN access
     */
    getInvitations: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: number;
        };
        output: {
            id: number;
            email: string;
            role: import("@prisma/client").$Enums.WorkspaceRole;
            expiresAt: Date;
            createdAt: Date;
            createdBy: {
                name: string;
                id: number;
                email: string;
            };
        }[];
        meta: object;
    }>;
    /**
     * Cancel a pending invitation
     * Requires ADMIN access
     */
    cancelInvitation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            invitationId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=workspace.d.ts.map