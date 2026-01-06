export declare const sprintRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List sprints for a project
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            status?: "ACTIVE" | "COMPLETED" | "PLANNING" | undefined;
        };
        output: {
            totalTasks: number;
            completedTasks: number;
            openTasks: number;
            progress: number;
            _count: {
                tasks: number;
            };
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        }[];
        meta: object;
    }>;
    /**
     * Get a single sprint with optional tasks
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sprintId: number;
            includeTasks?: boolean | undefined;
        };
        output: {
            totalTasks: number;
            completedTasks: number;
            openTasks: number;
            progress: number;
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
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        };
        meta: object;
    }>;
    /**
     * Create a new sprint
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            projectId: number;
            name: string;
            dateStart: string;
            dateEnd: string;
            description?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        };
        meta: object;
    }>;
    /**
     * Update a sprint
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sprintId: number;
            name?: string | undefined;
            description?: string | undefined;
            dateStart?: string | undefined;
            dateEnd?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        };
        meta: object;
    }>;
    /**
     * Start a sprint (PLANNING -> ACTIVE)
     */
    start: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sprintId: number;
        };
        output: {
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        };
        meta: object;
    }>;
    /**
     * Complete a sprint (ACTIVE -> COMPLETED)
     * Optionally moves remaining tasks back to backlog (null sprintId)
     */
    complete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sprintId: number;
            moveRemainingToBacklog?: boolean | undefined;
        };
        output: {
            movedTasksCount: number;
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        };
        meta: object;
    }>;
    /**
     * Delete a sprint
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sprintId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Add a task to a sprint
     */
    addTask: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sprintId: number;
            taskId: number;
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
     * Remove a task from a sprint
     */
    removeTask: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sprintId: number;
            taskId: number;
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
     * Get burndown data for a sprint
     */
    getBurndown: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sprintId: number;
        };
        output: {
            sprintId: number;
            sprintName: string;
            startDate: string;
            endDate: string;
            totalWork: number;
            totalTasks: number;
            completedTasks: number;
            dataPoints: {
                date: string;
                ideal: number;
                actual: number | null;
                completed: number;
            }[];
        };
        meta: object;
    }>;
    /**
     * Get the active sprint for a project
     */
    getActive: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            totalTasks: number;
            completedTasks: number;
            progress: number;
            _count: {
                tasks: number;
            };
            name: string;
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SprintStatus;
            projectId: number;
            dateStart: Date;
            dateEnd: Date;
        } | null;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=sprint.d.ts.map