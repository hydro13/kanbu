import { type ImportSource, type FieldMapping, type ImportResult } from '../../lib/importExport';
export declare const importRouter: import("@trpc/server").TRPCBuiltRouter<{
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
     * Preview import - parse file and return field mappings and sample data
     * Use this to show users what will be imported before executing
     */
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
            source: ImportSource;
            detectedSource?: ImportSource;
            headers: string[];
            fieldMappings: FieldMapping[];
            unmappedFields: string[];
            suggestedMappings: FieldMapping[];
            rows: import("../../lib/importExport").ImportPreviewRow[];
            summary: {
                totalRows: number;
                validRows: number;
                errorRows: number;
                warningRows: number;
            };
        } | {
            source: "generic" | "trello" | "asana" | "jira" | "todoist" | "notion" | "monday" | "clickup" | "basecamp" | "wrike" | "kanboard";
            detectedSource: ImportSource;
            headers: string[];
            fieldMappings: FieldMapping[];
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
    /**
     * Execute import - create tasks based on confirmed mappings
     */
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
        output: ImportResult;
        meta: object;
    }>;
    /**
     * Get available import sources
     */
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
            id: ImportSource;
        }[];
        meta: object;
    }>;
    /**
     * Get field mappings for a specific source
     */
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
    /**
     * Validate file content before import
     */
    validate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            content: string;
            fileType: "csv" | "json";
        };
        output: {
            valid: boolean;
            fileType: "csv";
            detectedSource: ImportSource;
            headers: string[];
            rowCount: number;
            errors: import("../../lib/importExport").ParseError[];
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
            detectedSource: ImportSource;
            taskCount: number;
            errors: import("../../lib/importExport").ParseError[];
            warnings: import("../../lib/importExport").ParseError[];
            headers?: undefined;
            rowCount?: undefined;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=import.d.ts.map