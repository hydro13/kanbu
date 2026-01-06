/**
 * File size limits per MIME type category (in bytes)
 * NOTE: These are SIZE limits only, NOT resolution limits.
 * Images and videos can have any resolution as long as file size is within limits.
 */
export declare const FILE_SIZE_LIMITS: Record<string, number>;
/**
 * Blocked MIME types (security)
 */
export declare const BLOCKED_MIME_TYPES: string[];
/**
 * Blocked file extensions (security)
 */
export declare const BLOCKED_EXTENSIONS: string[];
/**
 * Image MIME types (for isImage detection)
 */
export declare const IMAGE_MIME_TYPES: string[];
export interface FileValidationResult {
    valid: boolean;
    error?: string;
    maxSize?: number;
}
export interface StoredFile {
    path: string;
    name: string;
    mimeType: string;
    size: number;
    isImage: boolean;
}
export interface StorageConfig {
    type: 'local' | 's3';
    basePath?: string;
    bucket?: string;
    region?: string;
    endpoint?: string;
}
/**
 * Get file size limit for a given MIME type
 */
export declare function getFileSizeLimit(mimeType: string): number;
/**
 * Check if a file extension is blocked
 */
export declare function isBlockedExtension(filename: string): boolean;
/**
 * Check if a MIME type is blocked
 */
export declare function isBlockedMimeType(mimeType: string): boolean;
/**
 * Check if a MIME type is an image
 */
export declare function isImageMimeType(mimeType: string): boolean;
/**
 * Validate a file before upload
 */
export declare function validateFile(filename: string, mimeType: string, size: number): FileValidationResult;
/**
 * Generate a unique filename with original extension
 */
export declare function generateUniqueFilename(originalName: string): string;
/**
 * Sanitize filename (remove potentially dangerous characters)
 */
export declare function sanitizeFilename(filename: string): string;
/**
 * Abstract storage interface
 */
export interface StorageProvider {
    save(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile>;
    delete(filePath: string): Promise<void>;
    getUrl(filePath: string): string;
    exists(filePath: string): Promise<boolean>;
}
/**
 * Local filesystem storage provider
 */
export declare class LocalStorageProvider implements StorageProvider {
    private basePath;
    private baseUrl;
    constructor(basePath: string, baseUrl?: string);
    save(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile>;
    delete(filePath: string): Promise<void>;
    getUrl(filePath: string): string;
    exists(filePath: string): Promise<boolean>;
}
/**
 * S3-compatible storage provider (stub for future implementation)
 * TODO: Implement when needed for production
 */
export declare class S3StorageProvider implements StorageProvider {
    private bucket;
    private region;
    private endpoint?;
    constructor(bucket: string, region: string, endpoint?: string);
    save(_buffer: Buffer, _filename: string, _mimeType: string): Promise<StoredFile>;
    delete(_filePath: string): Promise<void>;
    getUrl(filePath: string): string;
    exists(_filePath: string): Promise<boolean>;
}
/**
 * Get storage provider based on configuration
 */
export declare function getStorageProvider(config?: StorageConfig): StorageProvider;
declare const _default: {
    validateFile: typeof validateFile;
    getFileSizeLimit: typeof getFileSizeLimit;
    isBlockedExtension: typeof isBlockedExtension;
    isBlockedMimeType: typeof isBlockedMimeType;
    isImageMimeType: typeof isImageMimeType;
    generateUniqueFilename: typeof generateUniqueFilename;
    sanitizeFilename: typeof sanitizeFilename;
    getStorageProvider: typeof getStorageProvider;
    LocalStorageProvider: typeof LocalStorageProvider;
    S3StorageProvider: typeof S3StorageProvider;
    FILE_SIZE_LIMITS: Record<string, number>;
    BLOCKED_MIME_TYPES: string[];
    BLOCKED_EXTENSIONS: string[];
    IMAGE_MIME_TYPES: string[];
};
export default _default;
//# sourceMappingURL=storage.d.ts.map