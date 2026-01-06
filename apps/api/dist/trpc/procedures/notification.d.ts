import { type NotificationData } from '../../lib/notificationService';
export declare const notificationRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * List notifications for the current user
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            offset?: number | undefined;
            unreadOnly?: boolean | undefined;
        };
        output: {
            id: number;
            type: string;
            title: string;
            content: string | null;
            data: NotificationData;
            isRead: boolean;
            createdAt: Date;
            link: string | undefined;
        }[];
        meta: object;
    }>;
    /**
     * Get unread notification count
     */
    getUnreadCount: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            count: number;
        };
        meta: object;
    }>;
    /**
     * Mark specific notifications as read
     */
    markRead: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            notificationIds: number[];
        };
        output: {
            success: boolean;
            count: number;
        };
        meta: object;
    }>;
    /**
     * Mark all notifications as read
     */
    markAllRead: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            count: number;
        };
        meta: object;
    }>;
    /**
     * Delete a notification
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            notificationId: number;
        };
        output: {
            success: boolean;
            message: string;
        } | {
            success: boolean;
            message?: undefined;
        };
        meta: object;
    }>;
    /**
     * Delete all read notifications
     */
    deleteAllRead: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get notification settings for the current user
     */
    getSettings: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            enabled: boolean;
            filter: number;
            filterLabel: string;
            types: {
                type: string;
                enabled: boolean;
            }[];
        };
        meta: object;
    }>;
    /**
     * Update main notification settings (enabled, filter)
     */
    updateSettings: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            notificationsEnabled?: boolean | undefined;
            notificationFilter?: number | undefined;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Update per-type notification setting (email, web, push)
     */
    updateTypeSetting: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            notificationType: "email" | "push" | "web";
            isEnabled: boolean;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=notification.d.ts.map