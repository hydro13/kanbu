export declare const milestoneRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List milestones for a project with progress stats
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            includeCompleted?: boolean | undefined;
        };
        output: {
            totalTasks: number;
            completedTasks: number;
            openTasks: number;
            progress: number;
            dueStatus: "overdue" | "due_soon" | "on_track" | "no_date";
            _count: {
                tasks: number;
            };
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            dateDue: Date | null;
            isCompleted: boolean;
        }[];
        meta: object;
    }>;
    /**
     * Get a single milestone with optional tasks
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            milestoneId: number;
            includeTasks?: boolean | undefined;
        };
        output: {
            totalTasks: number;
            completedTasks: number;
            openTasks: number;
            progress: number;
            dueStatus: "overdue" | "due_soon" | "on_track" | "no_date";
            project: {
                name: string;
                id: number;
            };
            _count: {
                tasks: number;
            };
            tasks: {
                id: number;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                color: string | null;
                projectId: number;
                columnId: number;
                swimlaneId: number | null;
                creatorId: number;
                title: string;
                reference: string | null;
                priority: number;
                score: number;
                progress: number;
                position: number;
                dateStarted: Date | null;
                dateDue: Date | null;
                dateCompleted: Date | null;
                reminderAt: Date | null;
                timeEstimated: number;
                timeSpent: number;
                isDraggable: boolean;
                recurrenceData: import("@prisma/client/runtime/library").JsonValue | null;
                milestoneId: number | null;
                moduleId: number | null;
                sprintId: number | null;
                categoryId: number | null;
            }[];
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            dateDue: Date | null;
            isCompleted: boolean;
        };
        meta: object;
    }>;
    /**
     * Create a new milestone
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name: string;
            description?: string | undefined;
            dateDue?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            dateDue: Date | null;
            isCompleted: boolean;
        };
        meta: object;
    }>;
    /**
     * Update a milestone
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            milestoneId: number;
            name?: string | undefined;
            description?: string | undefined;
            dateDue?: string | null | undefined;
            isCompleted?: boolean | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            projectId: number;
            dateDue: Date | null;
            isCompleted: boolean;
        };
        meta: object;
    }>;
    /**
     * Delete a milestone
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            milestoneId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Set milestone for a task (or remove by setting null)
     */
    setForTask: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            taskId: number;
            milestoneId: number | null;
        };
        output: {
            id: number;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            color: string | null;
            projectId: number;
            columnId: number;
            swimlaneId: number | null;
            creatorId: number;
            title: string;
            reference: string | null;
            priority: number;
            score: number;
            progress: number;
            position: number;
            dateStarted: Date | null;
            dateDue: Date | null;
            dateCompleted: Date | null;
            reminderAt: Date | null;
            timeEstimated: number;
            timeSpent: number;
            isDraggable: boolean;
            recurrenceData: import("@prisma/client/runtime/library").JsonValue | null;
            milestoneId: number | null;
            moduleId: number | null;
            sprintId: number | null;
            categoryId: number | null;
        };
        meta: object;
    }>;
    /**
     * Get progress stats for a milestone
     */
    getProgress: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            milestoneId: number;
        };
        output: {
            milestoneId: number;
            milestoneName: string;
            isCompleted: boolean;
            dateDue: string | null;
            daysUntilDue: number | null;
            dueStatus: "overdue" | "due_soon" | "on_track" | "no_date";
            totalTasks: number;
            completedTasks: number;
            openTasks: number;
            progress: number;
            avgTaskProgress: number;
            byPriority: {
                urgent: number;
                high: number;
                medium: number;
                low: number;
            };
            tasks: {
                id: number;
                title: string;
                isActive: boolean;
                priority: number;
                progress: number;
            }[];
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=milestone.d.ts.map