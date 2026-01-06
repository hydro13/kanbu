export declare const taskRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List tasks for a project with filters
     * Requires at least VIEWER access
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            columnId?: number | undefined;
            swimlaneId?: number | undefined;
            isActive?: boolean | undefined;
            search?: string | undefined;
            priority?: number | undefined;
            assigneeId?: number | undefined;
            categoryId?: number | undefined;
            sprintId?: number | undefined;
            milestoneId?: number | undefined;
            moduleId?: number | undefined;
            tagIds?: number[] | undefined;
            dueDateFrom?: string | undefined;
            dueDateTo?: string | undefined;
            createdFrom?: string | undefined;
            createdTo?: string | undefined;
            updatedFrom?: string | undefined;
            updatedTo?: string | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            assignees: {
                name: string;
                id: number;
                username: string;
                avatarUrl: string | null;
            }[];
            tags: {
                name: string;
                id: number;
                color: string;
            }[];
            subtaskCount: number;
            commentCount: number;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            color: string | null;
            column: {
                id: number;
                title: string;
            };
            swimlane: {
                name: string;
                id: number;
            } | null;
            columnId: number;
            swimlaneId: number | null;
            title: string;
            reference: string | null;
            priority: number;
            score: number;
            progress: number;
            position: number;
            dateStarted: Date | null;
            dateDue: Date | null;
            dateCompleted: Date | null;
            timeEstimated: number;
            timeSpent: number;
            _count: {
                comments: number;
                subtasks: number;
            };
        }[];
        meta: object;
    }>;
    /**
     * Get task details with all relations
     * Requires at least VIEWER access
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            taskId: number;
        };
        output: import("../../lib/task").TaskWithRelations;
        meta: object;
    }>;
    /**
     * Create a new task
     * Requires at least MEMBER access
     * Auto-generates reference (PLAN-123)
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            columnId: number;
            title: string;
            swimlaneId?: number | undefined;
            description?: string | undefined;
            priority?: number | undefined;
            score?: number | undefined;
            color?: string | undefined;
            dateDue?: string | undefined;
            timeEstimated?: number | undefined;
            categoryId?: number | undefined;
            sprintId?: number | undefined;
            milestoneId?: number | undefined;
            moduleId?: number | undefined;
            assigneeIds?: number[] | undefined;
            tagIds?: number[] | undefined;
        };
        output: {
            id: number;
            createdAt: Date;
            columnId: number;
            swimlaneId: number | null;
            title: string;
            reference: string | null;
            position: number;
        };
        meta: object;
    }>;
    /**
     * Update task properties
     * Requires at least MEMBER access
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            title?: string | undefined;
            description?: string | undefined;
            priority?: number | undefined;
            score?: number | undefined;
            color?: string | null | undefined;
            dateDue?: string | null | undefined;
            dateStarted?: string | null | undefined;
            reminderAt?: string | null | undefined;
            timeEstimated?: number | undefined;
            categoryId?: number | null | undefined;
            sprintId?: number | null | undefined;
            milestoneId?: number | null | undefined;
            moduleId?: number | null | undefined;
        };
        output: {
            id: number;
            updatedAt: Date;
            color: string | null;
            title: string;
            reference: string | null;
            priority: number;
            score: number;
            dateStarted: Date | null;
            dateDue: Date | null;
            reminderAt: Date | null;
            timeEstimated: number;
        };
        meta: object;
    }>;
    /**
     * Move task to different column/swimlane
     * Respects WIP limits
     * Requires at least MEMBER access
     */
    move: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            columnId: number;
            swimlaneId?: number | null | undefined;
            position?: number | undefined;
        };
        output: {
            id: number;
            updatedAt: Date;
            columnId: number;
            swimlaneId: number | null;
            position: number;
        };
        meta: object;
    }>;
    /**
     * Reorder tasks within a column
     * Requires at least MEMBER access
     */
    reorder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            columnId: number;
            taskId: number;
            newPosition: number;
            swimlaneId?: number | undefined;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Close a task
     * Requires at least MEMBER access
     */
    close: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
        };
        output: {
            id: number;
            isActive: boolean;
            updatedAt: Date;
            dateCompleted: Date | null;
        };
        meta: object;
    }>;
    /**
     * Reopen a closed task
     * Requires at least MEMBER access
     */
    reopen: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
        };
        output: {
            id: number;
            isActive: boolean;
            updatedAt: Date;
            dateCompleted: Date | null;
        };
        meta: object;
    }>;
    /**
     * Soft delete a task
     * Requires at least MANAGER access
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Set assignees for a task (replaces existing)
     * Requires at least MEMBER access
     */
    setAssignees: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            assigneeIds: number[];
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Set tags for a task (replaces existing)
     * Requires at least MEMBER access
     */
    setTags: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            tagIds: number[];
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Set due date for a task
     * Dedicated procedure for date picker UI
     * Requires at least MEMBER access
     */
    setDueDate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            dateDue: string | null;
            includeTime?: boolean | undefined;
        };
        output: {
            id: number;
            updatedAt: Date;
            dateDue: Date | null;
            reminderAt: Date | null;
        };
        meta: object;
    }>;
    /**
     * Set reminder for a task
     * Can use preset offsets from due date or custom datetime
     * Requires at least MEMBER access
     */
    setReminder: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            reminderAt: string | null;
            preset?: "custom" | "none" | "15min" | "1hour" | "1day" | "1week" | undefined;
        };
        output: {
            id: number;
            updatedAt: Date;
            dateDue: Date | null;
            reminderAt: Date | null;
        };
        meta: object;
    }>;
    /**
     * Get tasks with pending reminders
     * For notification processing
     * Requires at least VIEWER access
     */
    getPendingReminders: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            assignees: {
                id: number;
                email: string;
                username: string;
            }[];
            id: number;
            title: string;
            reference: string | null;
            dateDue: Date | null;
            reminderAt: Date | null;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=task.d.ts.map