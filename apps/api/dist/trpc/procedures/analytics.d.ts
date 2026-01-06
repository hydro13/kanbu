export declare const analyticsRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Get project stats - task counts, completion rate, trends
     */
    getProjectStats: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            dateFrom?: string | undefined;
            dateTo?: string | undefined;
        };
        output: {
            totalTasks: number;
            openTasks: number;
            closedTasks: number;
            completionRate: number;
            trend: number;
            recentCompletions: number;
            tasksByPriority: {
                priority: number;
                count: number;
            }[];
            tasksByColumn: {
                columnId: number;
                columnName: string;
                count: number;
            }[];
            timeEstimated: number;
            timeSpent: number;
        };
        meta: object;
    }>;
    /**
     * Get velocity - tasks completed per week
     */
    getVelocity: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
            weeks?: number | undefined;
        };
        output: {
            dataPoints: {
                weekStart: string;
                tasksCompleted: number;
                pointsCompleted: number;
            }[];
            avgVelocity: number;
            totalCompleted: number;
        };
        meta: object;
    }>;
    /**
     * Get cycle time - average time tasks spend in each column
     */
    getCycleTime: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            cycleTimeByColumn: {
                columnId: number;
                columnName: string;
                position: number;
                avgHours: number;
                avgDays: number;
                taskCount: number;
            }[];
            bottleneck: {
                columnId: number;
                columnName: string;
                position: number;
                avgHours: number;
                avgDays: number;
                taskCount: number;
            } | null;
            avgTotalCycleHours: number;
            avgTotalCycleDays: number;
            completedTasksAnalyzed: number;
        };
        meta: object;
    }>;
    /**
     * Get team workload - tasks per assignee
     * Shows ALL project members, not just those with assigned tasks
     */
    getTeamWorkload: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectId: number;
        };
        output: {
            teamMembers: {
                userId: number;
                username: string;
                name: string;
                avatarUrl: string | null;
                totalTasks: number;
                overdueCount: number;
                byPriority: {
                    priority: number;
                    count: number;
                }[];
                timeEstimated: number;
                timeSpent: number;
            }[];
            unassignedTasks: number;
            avgTasksPerPerson: number;
            totalTeamMembers: number;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=analytics.d.ts.map