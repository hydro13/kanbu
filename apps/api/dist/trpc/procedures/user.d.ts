export declare const userRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Get current user's full profile
     */
    getProfile: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            workspaceCount: number;
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            username: string;
            avatarUrl: string | null;
            timezone: string;
            language: string;
            emailVerified: boolean;
            lastLoginAt: Date | null;
            twofactorActivated: boolean;
            failedLoginCount: number;
            lockedUntil: Date | null;
            googleId: string | null;
            githubId: string | null;
            gitlabId: number | null;
            theme: string;
            defaultFilter: string | null;
            publicToken: string | null;
            hourlyRate: import("@prisma/client/runtime/library").Decimal | null;
            notificationsEnabled: boolean;
            notificationFilter: number;
            _count: {
                workspaces: number;
            };
        };
        meta: object;
    }>;
    /**
     * Update current user's profile
     */
    updateProfile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name?: string | undefined;
            timezone?: string | undefined;
            language?: string | undefined;
            theme?: "light" | "dark" | "system" | undefined;
            defaultFilter?: string | undefined;
        };
        output: {
            name: string;
            id: number;
            updatedAt: Date;
            email: string;
            username: string;
            avatarUrl: string | null;
            timezone: string;
            language: string;
            theme: string;
            defaultFilter: string | null;
        };
        meta: object;
    }>;
    /**
     * Change current user's password
     */
    changePassword: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            currentPassword: string;
            newPassword: string;
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Upload avatar with base64 encoded image
     * Stores in database for reliability
     */
    uploadAvatar: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            base64: string;
            mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        };
        output: {
            success: boolean;
            avatarUrl: string;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Remove avatar
     */
    removeAvatar: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Delete current user's account
     * Soft delete by deactivating
     */
    deleteAccount: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            password: string;
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Get time tracking data for current user
     * Shows hours worked across all projects/tasks
     */
    getTimeTracking: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            dateFrom?: string | undefined;
            dateTo?: string | undefined;
            limit?: number | undefined;
        };
        output: {
            totalEstimated: number;
            totalSpent: number;
            byProject: {
                projectId: number;
                projectName: string;
                timeEstimated: number;
                timeSpent: number;
            }[];
            recentEntries: ({
                type: "subtask";
                id: number;
                title: string;
                taskId: number;
                taskTitle: string;
                projectId: number;
                projectName: string;
                timeEstimated: number;
                timeSpent: number;
                updatedAt: Date;
                isActive: boolean;
            } | {
                type: "task";
                id: number;
                title: string;
                taskId: number;
                taskTitle: string;
                projectId: number;
                projectName: string;
                timeEstimated: number;
                timeSpent: number;
                updatedAt: Date;
                isActive: boolean;
            })[];
        };
        meta: object;
    }>;
    /**
     * Get last logins for current user
     */
    getLastLogins: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            logins: {
                id: number;
                createdAt: Date;
                userId: number;
                userAgent: string;
                ip: string;
                authType: string;
            }[];
            total: number;
            hasMore: boolean;
        };
        meta: object;
    }>;
    /**
     * Get active sessions (persistent connections)
     */
    getSessions: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            ipAddress: string | null;
            userAgent: string | null;
            expiresAt: Date;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    /**
     * Get remember tokens
     */
    getRememberTokens: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: number;
            tokenPreview: string;
            expiresAt: Date;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    /**
     * Revoke a session
     */
    revokeSession: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Revoke a remember token
     */
    revokeRememberToken: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tokenId: number;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Revoke all sessions except current
     */
    revokeAllSessions: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get password reset history
     */
    getPasswordResets: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            resets: {
                id: number;
                createdAt: Date;
                expiresAt: Date;
                userAgent: string;
                ip: string;
                isUsed: boolean;
            }[];
            total: number;
            hasMore: boolean;
        };
        meta: object;
    }>;
    /**
     * Get user metadata (custom key-value pairs)
     */
    getMetadata: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            userId: number;
            key: string;
            value: string;
        }[];
        meta: object;
    }>;
    /**
     * Set a metadata value
     */
    setMetadata: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            key: string;
            value: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Delete a metadata key
     */
    deleteMetadata: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            key: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get 2FA status
     */
    get2FAStatus: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            enabled: boolean;
        };
        meta: object;
    }>;
    /**
     * Setup 2FA - generate secret and return QR code URI
     */
    setup2FA: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            secret: string;
            qrCodeUri: string;
        };
        meta: object;
    }>;
    /**
     * Verify and activate 2FA
     */
    verify2FA: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            token: string;
        };
        output: {
            success: boolean;
            backupCodes: string[];
        };
        meta: object;
    }>;
    /**
     * Disable 2FA
     */
    disable2FA: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            password: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get public access status
     */
    getPublicAccess: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            enabled: boolean;
            token: string | null;
        };
        meta: object;
    }>;
    /**
     * Enable public access - generate a token
     */
    enablePublicAccess: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            token: string;
        };
        meta: object;
    }>;
    /**
     * Disable public access - remove token
     */
    disablePublicAccess: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Regenerate public access token
     */
    regeneratePublicToken: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            token: string;
        };
        meta: object;
    }>;
    /**
     * Get connected OAuth accounts
     */
    getConnectedAccounts: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            google: {
                connected: boolean;
                id: string | null;
            };
            github: {
                connected: boolean;
                id: string | null;
            };
            gitlab: {
                connected: boolean;
                id: string | null;
            };
        };
        meta: object;
    }>;
    /**
     * Unlink an OAuth account
     */
    unlinkAccount: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: "google" | "github" | "gitlab";
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get hourly rate
     */
    getHourlyRate: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            hourlyRate: number | null;
        };
        meta: object;
    }>;
    /**
     * Update hourly rate
     */
    updateHourlyRate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            hourlyRate: number | null;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=user.d.ts.map