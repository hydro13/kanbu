/**
 * Main app router
 * All procedure routers are merged here
 */
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
        res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
        prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
        user: import("./context").AuthUser | null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    system: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        health: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                status: string;
                timestamp: string;
                database: string;
            };
            meta: object;
        }>;
        info: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                name: string;
                version: string;
                environment: string;
                node: string;
            };
            meta: object;
        }>;
        echo: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                message: string;
            };
            output: {
                echo: string;
                timestamp: string;
            };
            meta: object;
        }>;
    }>>;
    auth: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        register: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                email: string;
                username: string;
                name: string;
                password: string;
            };
            output: import("./procedures/auth").AuthResponse;
            meta: object;
        }>;
        login: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                email: string;
                password: string;
            };
            output: import("./procedures/auth").AuthResponse;
            meta: object;
        }>;
        logout: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        me: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("./procedures/auth").UserResponse | null;
            meta: object;
        }>;
    }>>;
    workspace: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
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
    user: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        removeAvatar: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
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
        revokeSession: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        revokeRememberToken: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                tokenId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        revokeAllSessions: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                count: number;
            };
            meta: object;
        }>;
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
        deleteMetadata: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                key: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        get2FAStatus: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                enabled: boolean;
            };
            meta: object;
        }>;
        setup2FA: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                secret: string;
                qrCodeUri: string;
            };
            meta: object;
        }>;
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
        disable2FA: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                password: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        getPublicAccess: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                enabled: boolean;
                token: string | null;
            };
            meta: object;
        }>;
        enablePublicAccess: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                token: string;
            };
            meta: object;
        }>;
        disablePublicAccess: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        regeneratePublicToken: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                token: string;
            };
            meta: object;
        }>;
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
        unlinkAccount: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                provider: "google" | "github" | "gitlab";
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        getHourlyRate: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                hourlyRate: number | null;
            };
            meta: object;
        }>;
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
    project: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        archive: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        unarchive: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
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
    column: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
            };
            output: {
                id: number;
                title: string;
                description: string | null;
                position: number;
                taskLimit: number;
                isCollapsed: boolean;
                showClosed: boolean;
                createdAt: Date;
                taskCount: number;
                isOverLimit: boolean;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                title: string;
                description?: string | undefined;
                taskLimit?: number | undefined;
                position?: number | undefined;
            };
            output: {
                id: number;
                description: string | null;
                createdAt: Date;
                title: string;
                position: number;
                taskLimit: number;
                isCollapsed: boolean;
                showClosed: boolean;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                columnId: number;
            };
            output: {
                taskCount: number;
                wipInfo: import("../lib/board").WIPValidation;
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                projectId: number;
                title: string;
                position: number;
                _count: {
                    tasks: number;
                };
                taskLimit: number;
                isCollapsed: boolean;
                showClosed: boolean;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                columnId: number;
                title?: string | undefined;
                description?: string | undefined;
                taskLimit?: number | undefined;
                isCollapsed?: boolean | undefined;
                showClosed?: boolean | undefined;
            };
            output: {
                id: number;
                description: string | null;
                updatedAt: Date;
                title: string;
                position: number;
                taskLimit: number;
                isCollapsed: boolean;
                showClosed: boolean;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                columnId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        reorder: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                columnId: number;
                newPosition: number;
            };
            output: {
                success: boolean;
                newPositions: {
                    id: number;
                    position: number;
                }[];
            };
            meta: object;
        }>;
        checkWIP: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                columnId: number;
            };
            output: import("../lib/board").WIPValidation;
            meta: object;
        }>;
    }>>;
    swimlane: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
            };
            output: {
                id: number;
                name: string;
                description: string | null;
                position: number;
                isActive: boolean;
                createdAt: Date;
                taskCount: number;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                name: string;
                description?: string | undefined;
                position?: number | undefined;
            };
            output: {
                name: string;
                id: number;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                position: number;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                swimlaneId: number;
            };
            output: {
                taskCount: number;
                name: string;
                id: number;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                projectId: number;
                position: number;
                _count: {
                    tasks: number;
                };
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                swimlaneId: number;
                name?: string | undefined;
                description?: string | undefined;
                isActive?: boolean | undefined;
            };
            output: {
                name: string;
                id: number;
                description: string | null;
                isActive: boolean;
                updatedAt: Date;
                position: number;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                swimlaneId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        reorder: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                swimlaneId: number;
                newPosition: number;
            };
            output: {
                success: boolean;
                newPositions: {
                    id: number;
                    position: number;
                }[];
            };
            meta: object;
        }>;
        toggleActive: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                swimlaneId: number;
            };
            output: {
                name: string;
                id: number;
                isActive: boolean;
            };
            meta: object;
        }>;
    }>>;
    task: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
            };
            output: import("../lib/task").TaskWithRelations;
            meta: object;
        }>;
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
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
    subtask: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                subtaskId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
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
    comment: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                comments: {
                    id: number;
                    createdAt: Date;
                    updatedAt: Date;
                    user: {
                        name: string;
                        id: number;
                        username: string;
                        avatarUrl: string | null;
                    };
                    content: string;
                }[];
                total: number;
                hasMore: boolean;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
                content: string;
            };
            output: {
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                };
                content: string;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                commentId: number;
            };
            output: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                };
                taskId: number;
                content: string;
            } | null;
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                commentId: number;
                content: string;
            };
            output: {
                id: number;
                updatedAt: Date;
                content: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                commentId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
    }>>;
    activity: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
                entityType?: "project" | "column" | "swimlane" | "task" | "subtask" | "comment" | undefined;
                entityId?: number | undefined;
                eventType?: string | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                activities: {
                    id: number;
                    createdAt: Date;
                    user: {
                        name: string;
                        id: number;
                        username: string;
                        avatarUrl: string | null;
                    } | null;
                    eventType: string;
                    entityType: string;
                    entityId: number;
                    changes: import("@prisma/client/runtime/library").JsonValue;
                }[];
                total: number;
                hasMore: boolean;
            };
            meta: object;
        }>;
        forTask: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                activities: {
                    id: number;
                    createdAt: Date;
                    user: {
                        name: string;
                        id: number;
                        username: string;
                        avatarUrl: string | null;
                    } | null;
                    eventType: string;
                    entityType: string;
                    entityId: number;
                    changes: import("@prisma/client/runtime/library").JsonValue;
                }[];
                total: number;
                hasMore: boolean;
            };
            meta: object;
        }>;
        getRecent: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
                limit?: number | undefined;
            };
            output: {
                activities: {
                    id: number;
                    createdAt: Date;
                    user: {
                        name: string;
                        id: number;
                        username: string;
                        avatarUrl: string | null;
                    } | null;
                    eventType: string;
                    entityType: string;
                    entityId: number;
                    changes: import("@prisma/client/runtime/library").JsonValue;
                }[];
            };
            meta: object;
        }>;
        getStats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
            };
            output: {
                byEventType: {
                    eventType: string;
                    count: number;
                }[];
                total: number;
                periodDays: number;
            };
            meta: object;
        }>;
    }>>;
    tag: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
            };
            output: {
                taskCount: number;
                name: string;
                id: number;
                createdAt: Date;
                color: string;
                _count: {
                    tasks: number;
                };
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                tagId: number;
            };
            output: {
                taskCount: number;
                name: string;
                id: number;
                createdAt: Date;
                color: string;
                projectId: number;
                _count: {
                    tasks: number;
                };
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                name: string;
                color?: string | undefined;
            };
            output: {
                name: string;
                id: number;
                createdAt: Date;
                color: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                tagId: number;
                name?: string | undefined;
                color?: string | undefined;
            };
            output: {
                name: string;
                id: number;
                color: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                tagId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        addToTask: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
                tagId: number;
            };
            output: {
                success: boolean;
                alreadyTagged: boolean;
            };
            meta: object;
        }>;
        removeFromTask: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
                tagId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        getTaskTags: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
            };
            output: {
                name: string;
                id: number;
                color: string;
            }[];
            meta: object;
        }>;
    }>>;
    category: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
            };
            output: {
                taskCount: number;
                name: string;
                id: number;
                description: string | null;
                createdAt: Date;
                color: string;
                _count: {
                    tasks: number;
                };
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                categoryId: number;
            };
            output: {
                taskCount: number;
                name: string;
                id: number;
                description: string | null;
                createdAt: Date;
                color: string;
                projectId: number;
                _count: {
                    tasks: number;
                };
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                name: string;
                description?: string | undefined;
                color?: string | undefined;
            };
            output: {
                name: string;
                id: number;
                description: string | null;
                createdAt: Date;
                color: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                categoryId: number;
                name?: string | undefined;
                description?: string | null | undefined;
                color?: string | undefined;
            };
            output: {
                name: string;
                id: number;
                description: string | null;
                color: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                categoryId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        setForTask: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
                categoryId: number | null;
            };
            output: {
                id: number;
                category: {
                    name: string;
                    id: number;
                    description: string | null;
                    createdAt: Date;
                    color: string;
                    projectId: number;
                } | null;
                categoryId: number | null;
            };
            meta: object;
        }>;
        getTasks: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                categoryId: number;
            };
            output: {
                id: number;
                isActive: boolean;
                column: {
                    id: number;
                    title: string;
                };
                title: string;
                priority: number;
            }[];
            meta: object;
        }>;
    }>>;
    taskLink: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
            };
            output: {
                outgoing: {
                    id: number;
                    direction: "outgoing";
                    linkType: import("@prisma/client").$Enums.TaskLinkType;
                    linkedTask: {
                        id: number;
                        title: string;
                        reference: string | null;
                        isActive: boolean;
                        columnTitle: string;
                    };
                    createdAt: Date;
                }[];
                incoming: {
                    id: number;
                    direction: "incoming";
                    linkType: string;
                    originalLinkType: import("@prisma/client").$Enums.TaskLinkType;
                    linkedTask: {
                        id: number;
                        title: string;
                        reference: string | null;
                        isActive: boolean;
                        columnTitle: string;
                    };
                    createdAt: Date;
                }[];
                all: ({
                    id: number;
                    direction: "outgoing";
                    linkType: import("@prisma/client").$Enums.TaskLinkType;
                    linkedTask: {
                        id: number;
                        title: string;
                        reference: string | null;
                        isActive: boolean;
                        columnTitle: string;
                    };
                    createdAt: Date;
                } | {
                    id: number;
                    direction: "incoming";
                    linkType: string;
                    originalLinkType: import("@prisma/client").$Enums.TaskLinkType;
                    linkedTask: {
                        id: number;
                        title: string;
                        reference: string | null;
                        isActive: boolean;
                        columnTitle: string;
                    };
                    createdAt: Date;
                })[];
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
                oppositeTaskId: number;
                linkType: "RELATES_TO" | "BLOCKS" | "IS_BLOCKED_BY" | "DUPLICATES" | "IS_DUPLICATED_BY" | "IS_CHILD_OF" | "IS_PARENT_OF" | "FOLLOWS" | "IS_FOLLOWED_BY" | "FIXES" | "IS_FIXED_BY";
            };
            output: {
                id: number;
                createdAt: Date;
                linkType: import("@prisma/client").$Enums.TaskLinkType;
                oppositeTask: {
                    id: number;
                    title: string;
                    reference: string | null;
                };
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                linkId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        getBlocking: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
            };
            output: {
                isBlocked: boolean;
                blockingTasks: {
                    id: number;
                    title: string;
                    reference: string | null;
                    isActive: boolean;
                    columnTitle: string;
                }[];
                blockedTasks: {
                    id: number;
                    title: string;
                    reference: string | null;
                    isActive: boolean;
                    columnTitle: string;
                }[];
                blockingCount: number;
                blockedCount: number;
            };
            meta: object;
        }>;
        getLinkTypes: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                type: string;
                label: string;
                description: string;
            }[];
            meta: object;
        }>;
        searchTasks: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
                query: string;
                limit?: number | undefined;
            };
            output: {
                id: number;
                title: string;
                reference: string | null;
                isActive: boolean;
                columnTitle: string;
            }[];
            meta: object;
        }>;
    }>>;
    search: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        tasks: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
                query: string;
                limit?: number | undefined;
                includeCompleted?: boolean | undefined;
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
                id: number;
                isActive: boolean;
                column: {
                    id: number;
                    title: string;
                };
                title: string;
                reference: string | null;
                priority: number;
                dateDue: Date | null;
            }[];
            meta: object;
        }>;
        global: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
                query: string;
                limit?: number | undefined;
                entityTypes?: ("task" | "comment" | "wiki")[] | undefined;
            };
            output: {
                type: "task" | "comment" | "wiki";
                id: number;
                title: string;
                snippet: string;
                taskId?: number;
                taskTitle?: string;
                updatedAt: Date;
            }[];
            meta: object;
        }>;
    }>>;
    attachment: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                taskId: number;
            };
            output: {
                url: string;
                name: string;
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                };
                path: string;
                mimeType: string | null;
                size: number;
                isImage: boolean;
            }[];
            meta: object;
        }>;
        getLimits: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                limits: Record<string, number>;
                maxSizeMB: number;
            };
            meta: object;
        }>;
        upload: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                taskId: number;
                filename: string;
                mimeType: string;
                data: string;
            };
            output: {
                url: string;
                name: string;
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                };
                path: string;
                mimeType: string | null;
                size: number;
                isImage: boolean;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                attachmentId: number;
            };
            output: {
                url: string;
                name: string;
                id: number;
                createdAt: Date;
                user: {
                    name: string;
                    id: number;
                    username: string;
                    avatarUrl: string | null;
                };
                taskId: number;
                path: string;
                mimeType: string | null;
                size: number;
                isImage: boolean;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                attachmentId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        getSizeLimit: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                mimeType: string;
            };
            output: {
                mimeType: string;
                maxBytes: number;
                maxMB: number;
            };
            meta: object;
        }>;
    }>>;
    notification: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
                data: import("../lib/notificationService").NotificationData;
                isRead: boolean;
                createdAt: Date;
                link: string | undefined;
            }[];
            meta: object;
        }>;
        getUnreadCount: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                count: number;
            };
            meta: object;
        }>;
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
        markAllRead: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                count: number;
            };
            meta: object;
        }>;
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
        deleteAllRead: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                count: number;
            };
            meta: object;
        }>;
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
    sprint: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sprintId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
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
    milestone: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                milestoneId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
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
    analytics: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    import: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        preview: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                content: string;
                fileType?: "csv" | "json" | undefined;
                source?: "generic" | "trello" | "asana" | "jira" | "todoist" | "notion" | "monday" | "clickup" | "basecamp" | "wrike" | "kanboard" | undefined;
                previewLimit?: number | undefined;
            };
            output: {
                projectColumns: {
                    id: number;
                    title: string;
                }[];
                projectTags: {
                    name: string;
                    id: number;
                }[];
                sourceInfo: {
                    name: string;
                    description: string;
                    fileTypes: string[];
                    example: string;
                };
                source: import("../lib/importExport").ImportSource;
                detectedSource?: import("../lib/importExport").ImportSource;
                headers: string[];
                fieldMappings: import("../lib/importExport").FieldMapping[];
                unmappedFields: string[];
                suggestedMappings: import("../lib/importExport").FieldMapping[];
                rows: import("../lib/importExport").ImportPreviewRow[];
                summary: {
                    totalRows: number;
                    validRows: number;
                    errorRows: number;
                    warningRows: number;
                };
            } | {
                source: "generic" | "trello" | "asana" | "jira" | "todoist" | "notion" | "monday" | "clickup" | "basecamp" | "wrike" | "kanboard";
                detectedSource: import("../lib/importExport").ImportSource;
                headers: string[];
                fieldMappings: import("../lib/importExport").FieldMapping[];
                unmappedFields: never[];
                suggestedMappings: never[];
                rows: {
                    rowNumber: number;
                    original: {
                        [k: string]: string;
                    };
                    mapped: {
                        title: {};
                        description: {};
                        priority: {};
                        column: {};
                        tags: {};
                        dateDue: {} | null;
                    };
                    errors: never[];
                    warnings: never[];
                    willImport: boolean;
                }[];
                summary: {
                    totalRows: number;
                    validRows: number;
                    errorRows: number;
                    warningRows: number;
                };
                projectColumns: {
                    id: number;
                    title: string;
                }[];
                projectTags: {
                    name: string;
                    id: number;
                }[];
                sourceInfo: {
                    name: string;
                    description: string;
                    fileTypes: string[];
                    example: string;
                };
            };
            meta: object;
        }>;
        execute: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                content: string;
                fieldMappings: {
                    sourceField: string;
                    targetField: string;
                    transform?: {
                        type: "number" | "boolean" | "status" | "priority" | "date" | "list" | "direct";
                        mapping?: Record<string, string | number> | undefined;
                        separator?: string | undefined;
                        trueValues?: string[] | undefined;
                        format?: string | undefined;
                    } | undefined;
                    required?: boolean | undefined;
                }[];
                fileType?: "csv" | "json" | undefined;
                source?: "generic" | "trello" | "asana" | "jira" | "todoist" | "notion" | "monday" | "clickup" | "basecamp" | "wrike" | "kanboard" | undefined;
                options?: {
                    skipDuplicates?: boolean | undefined;
                    createMissingColumns?: boolean | undefined;
                    createMissingTags?: boolean | undefined;
                    defaultColumn?: string | undefined;
                    batchSize?: number | undefined;
                } | undefined;
            };
            output: import("../lib/importExport").ImportResult;
            meta: object;
        }>;
        sources: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                fieldMappings: {
                    sourceField: string;
                    targetField: string;
                    required: boolean;
                }[];
                name: string;
                description: string;
                fileTypes: string[];
                example: string;
                id: import("../lib/importExport").ImportSource;
            }[];
            meta: object;
        }>;
        getMappings: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                source: "generic" | "trello" | "asana" | "jira" | "todoist" | "notion" | "monday" | "clickup" | "basecamp" | "wrike" | "kanboard";
            };
            output: {
                sourceField: string;
                targetField: string;
                required: boolean;
                transform: {
                    trueValues?: string[] | undefined;
                    separator?: string | undefined;
                    mapping?: Record<string, number> | undefined;
                    type: "number" | "boolean" | "status" | "priority" | "date" | "list" | "custom" | "direct";
                } | undefined;
            }[];
            meta: object;
        }>;
        validate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                fileType: "csv" | "json";
            };
            output: {
                valid: boolean;
                fileType: "csv";
                detectedSource: import("../lib/importExport").ImportSource;
                headers: string[];
                rowCount: number;
                errors: import("../lib/importExport").ParseError[];
                taskCount?: undefined;
                warnings?: undefined;
            } | {
                valid: boolean;
                fileType: "json";
                errors: {
                    message: string;
                    type: "error";
                }[];
                detectedSource?: undefined;
                headers?: undefined;
                rowCount?: undefined;
                taskCount?: undefined;
                warnings?: undefined;
            } | {
                valid: boolean;
                fileType: "json";
                detectedSource: import("../lib/importExport").ImportSource;
                taskCount: number;
                errors: import("../lib/importExport").ParseError[];
                warnings: import("../lib/importExport").ParseError[];
                headers?: undefined;
                rowCount?: undefined;
            };
            meta: object;
        }>;
    }>>;
    export: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        tasks: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
                format?: "trello" | "csv" | "json" | undefined;
                includeClosedTasks?: boolean | undefined;
                columnIds?: number[] | undefined;
                tagIds?: number[] | undefined;
                assigneeIds?: number[] | undefined;
            };
            output: {
                content: string;
                filename: string;
                mimeType: string;
                taskCount: number;
                format: "trello" | "csv" | "json";
            };
            meta: object;
        }>;
        project: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
                format?: "json" | undefined;
                includeClosedTasks?: boolean | undefined;
            };
            output: {
                content: string;
                filename: string;
                mimeType: string;
                taskCount: number;
                format: import("../lib/importExport").ExportFormat;
            };
            meta: object;
        }>;
        formats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                name: string;
                description: string;
                extension: string;
                mimeType: string;
            }[];
            meta: object;
        }>;
    }>>;
    apiKey: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                permissions: import("./procedures/apiKey").ApiPermission[];
                isExpired: boolean;
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                expiresAt: Date | null;
                keyPrefix: string;
                rateLimit: number;
                lastUsedAt: Date | null;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                permissions?: ("tasks:read" | "tasks:write" | "projects:read" | "projects:write" | "comments:read" | "comments:write" | "webhooks:read" | "webhooks:write")[] | undefined;
                rateLimit?: number | undefined;
                expiresAt?: string | undefined;
            };
            output: {
                permissions: import("./procedures/apiKey").ApiPermission[];
                key: string;
                name: string;
                id: number;
                createdAt: Date;
                expiresAt: Date | null;
                keyPrefix: string;
                rateLimit: number;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                keyId: number;
                name?: string | undefined;
                permissions?: ("tasks:read" | "tasks:write" | "projects:read" | "projects:write" | "comments:read" | "comments:write" | "webhooks:read" | "webhooks:write")[] | undefined;
                rateLimit?: number | undefined;
                isActive?: boolean | undefined;
            };
            output: {
                success: boolean;
                message: string;
                key?: undefined;
            } | {
                success: boolean;
                key: {
                    permissions: import("./procedures/apiKey").ApiPermission[];
                    name: string;
                    id: number;
                    isActive: boolean;
                    updatedAt: Date;
                    keyPrefix: string;
                    rateLimit: number;
                };
                message?: undefined;
            };
            meta: object;
        }>;
        revoke: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                keyId: number;
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
        getPermissions: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                value: "tasks:read" | "tasks:write" | "projects:read" | "projects:write" | "comments:read" | "comments:write" | "webhooks:read" | "webhooks:write";
                label: string;
                description: string;
            }[];
            meta: object;
        }>;
    }>>;
    webhook: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            req: import("fastify").FastifyRequest<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown, import("fastify").FastifyBaseLogger, import("fastify/types/type-provider").ResolveFastifyRequestType<import("fastify").FastifyTypeProviderDefault, import("fastify").FastifySchema, import("fastify").RouteGenericInterface>>;
            res: import("fastify").FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
            prisma: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            user: import("./context").AuthUser | null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectId: number;
            };
            output: {
                events: string[];
                status: "active" | "failing" | "disabled";
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                url: string;
                lastSuccess: Date | null;
                lastFailure: Date | null;
                failureCount: number;
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                webhookId: number;
            };
            output: {
                events: string[];
                status: "active" | "failing" | "disabled";
                hasSecret: boolean;
                project: {
                    name: string;
                    id: number;
                };
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                projectId: number;
                url: string;
                secret: string;
                lastSuccess: Date | null;
                lastFailure: Date | null;
                failureCount: number;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectId: number;
                name: string;
                url: string;
                events: string[];
            };
            output: {
                events: string[];
                secret: string;
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                url: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                webhookId: number;
                name?: string | undefined;
                url?: string | undefined;
                events?: string[] | undefined;
                isActive?: boolean | undefined;
            };
            output: {
                success: boolean;
                webhook: {
                    events: string[];
                    name: string;
                    id: number;
                    isActive: boolean;
                    updatedAt: Date;
                    url: string;
                };
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                webhookId: number;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        regenerateSecret: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                webhookId: number;
            };
            output: {
                success: boolean;
                secret: string;
            };
            meta: object;
        }>;
        test: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                webhookId: number;
            };
            output: import("../lib/webhookService").DeliveryResult;
            meta: object;
        }>;
        getDeliveries: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                webhookId: number;
                limit?: number | undefined;
            };
            output: {
                id: number;
                webhookId: number;
                event: string;
                payload: import("@prisma/client/runtime/library").JsonValue;
                statusCode: number | null;
                response: string | null;
                duration: number | null;
                success: boolean;
                attempts: number;
                deliveredAt: Date;
            }[];
            meta: object;
        }>;
        getEventTypes: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                value: import("../lib/webhookService").WebhookEventType;
                label: string;
                category: string;
            }[];
            meta: object;
        }>;
    }>>;
}>>;
/**
 * Export type for client usage
 */
export type AppRouter = typeof appRouter;
/**
 * Re-export for convenience
 */
export { createContext } from './context';
export type { Context } from './context';
//# sourceMappingURL=index.d.ts.map