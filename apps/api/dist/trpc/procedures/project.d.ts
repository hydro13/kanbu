export declare const projectRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Create a new project in a workspace
     * Requires MEMBER or higher workspace access
     * Creator becomes project OWNER
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: number;
            name: string;
            identifier?: string | undefined;
            description?: string | undefined;
            isPublic?: boolean | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            identifier: string | null;
            isPublic: boolean;
        };
        meta: object;
    }>;
    /**
     * List projects in a workspace
     * Requires workspace access (VIEWER sees public projects, members see assigned)
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: number;
            includeArchived?: boolean | undefined;
        };
        output: {
            id: number;
            name: string;
            identifier: string | null;
            description: string | null;
            isPublic: boolean;
            isActive: boolean;
            startDate: Date | null;
            endDate: Date | null;
            lastActivityAt: Date | null;
            createdAt: Date;
            taskCount: number;
            memberCount: number;
            userRole: import("@prisma/client").$Enums.ProjectRole | null;
        }[];
        meta: object;
    }>;
    /**
     * Get project details with columns and swimlanes
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            taskCount: number;
            memberCount: number;
            userRole: import("@prisma/client").$Enums.ProjectRole;
            name: string;
            id: number;
            description: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: number;
            identifier: string | null;
            startDate: Date | null;
            endDate: Date | null;
            isPublic: boolean;
            lastActivityAt: Date | null;
            _count: {
                members: number;
                tasks: number;
            };
            columns: {
                id: number;
                description: string | null;
                title: string;
                position: number;
                taskLimit: number;
                isCollapsed: boolean;
                showClosed: boolean;
            }[];
            swimlanes: {
                name: string;
                id: number;
                description: string | null;
                position: number;
            }[];
        };
        meta: object;
    }>;
    /**
     * Update project settings
     * Requires MANAGER or OWNER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name?: string | undefined;
            description?: string | undefined;
            isPublic?: boolean | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            updatedAt: Date;
            identifier: string | null;
            startDate: Date | null;
            endDate: Date | null;
            isPublic: boolean;
        };
        meta: object;
    }>;
    /**
     * Soft delete a project (set isActive = false)
     * Requires OWNER access
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Archive a project (same as soft delete for now)
     * Requires MANAGER or OWNER access
     */
    archive: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Unarchive a project
     * Requires MANAGER or OWNER access
     */
    unarchive: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get project members
     * Requires VIEWER access
     */
    getMembers: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            role: import("@prisma/client").$Enums.ProjectRole;
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
     * Add a member to the project
     * Requires MANAGER or OWNER access
     * User must be a workspace member
     */
    addMember: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            userId: number;
            role?: "MEMBER" | "VIEWER" | "MANAGER" | undefined;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Remove a member from the project
     * Requires MANAGER or OWNER access
     * Cannot remove OWNER
     */
    removeMember: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            userId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Update a member's role
     * Requires OWNER access for MANAGER role changes
     * MANAGER can change MEMBER/VIEWER roles
     */
    updateMemberRole: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            userId: number;
            role: "MEMBER" | "VIEWER" | "MANAGER";
        };
        output: {
            success: boolean;
            newRole: "MEMBER" | "VIEWER" | "MANAGER";
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=project.d.ts.map