export declare const subtaskRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List subtasks for a task
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
        };
        output: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubtaskStatus;
            title: string;
            position: number;
            timeEstimated: number;
            timeSpent: number;
            assignee: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            } | null;
        }[];
        meta: object;
    }>;
    /**
     * Create a new subtask
     * Requires at least MEMBER access
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            title: string;
            assigneeId?: number | undefined;
            timeEstimated?: number | undefined;
        };
        output: {
            id: number;
            createdAt: Date;
            status: import("@prisma/client").$Enums.SubtaskStatus;
            title: string;
            position: number;
            timeEstimated: number;
        };
        meta: object;
    }>;
    /**
     * Get subtask details
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            subtaskId: number;
        };
        output: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubtaskStatus;
            title: string;
            position: number;
            timeEstimated: number;
            timeSpent: number;
            taskId: number;
            assignee: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            } | null;
        } | null;
        meta: object;
    }>;
    /**
     * Update subtask (title, status, time, assignee)
     * Requires at least MEMBER access
     * Automatically updates parent task progress on status change
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subtaskId: number;
            title?: string | undefined;
            status?: "TODO" | "IN_PROGRESS" | "DONE" | undefined;
            assigneeId?: number | null | undefined;
            timeEstimated?: number | undefined;
            timeSpent?: number | undefined;
        };
        output: {
            id: number;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubtaskStatus;
            title: string;
            timeEstimated: number;
            timeSpent: number;
        };
        meta: object;
    }>;
    /**
     * Delete a subtask
     * Requires at least MEMBER access
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subtaskId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Reorder subtasks within a task
     * Requires at least MEMBER access
     */
    reorder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            subtaskId: number;
            newPosition: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Start time tracking on a subtask
     * Sets status to IN_PROGRESS
     * Returns the timer start time (updatedAt) for client-side tracking
     * Requires at least MEMBER access
     */
    startTimer: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subtaskId: number;
        };
        output: {
            timerStartedAt: Date;
            timeSpentDisplay: string;
            id: number;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubtaskStatus;
            title: string;
            timeEstimated: number;
            timeSpent: number;
        };
        meta: object;
    }>;
    /**
     * Stop time tracking and mark as done
     * Sets status to DONE
     * Optionally adds elapsed time to timeSpent
     * Requires at least MEMBER access
     */
    stopTimer: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subtaskId: number;
            addTimeSpent?: number | undefined;
        };
        output: {
            timeSpentDisplay: string;
            id: number;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubtaskStatus;
            title: string;
            timeEstimated: number;
            timeSpent: number;
        };
        meta: object;
    }>;
    /**
     * Log time manually on a subtask
     * Adds time to existing timeSpent (does not change status)
     * Requires at least MEMBER access
     */
    logTime: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            subtaskId: number;
            hours: number;
        };
        output: {
            timeSpentDisplay: string;
            id: number;
            updatedAt: Date;
            timeSpent: number;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=subtask.d.ts.map