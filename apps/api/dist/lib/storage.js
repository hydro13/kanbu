"use strict";
/*
 * Storage Library
 * Version: 1.0.0
 *
 * File storage abstraction with configurable limits per file type.
 * Local storage for development, S3-compatible for production.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:15 CET
 * ═══════════════════════════════════════════════════════════════════
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageProvider = exports.LocalStorageProvider = exports.IMAGE_MIME_TYPES = exports.BLOCKED_EXTENSIONS = exports.BLOCKED_MIME_TYPES = exports.FILE_SIZE_LIMITS = void 0;
exports.getFileSizeLimit = getFileSizeLimit;
exports.isBlockedExtension = isBlockedExtension;
exports.isBlockedMimeType = isBlockedMimeType;
exports.isImageMimeType = isImageMimeType;
exports.validateFile = validateFile;
exports.generateUniqueFilename = generateUniqueFilename;
exports.sanitizeFilename = sanitizeFilename;
exports.getStorageProvider = getStorageProvider;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
// =============================================================================
// Configuration
// =============================================================================
/**
 * File size limits per MIME type category (in bytes)
 * NOTE: These are SIZE limits only, NOT resolution limits.
 * Images and videos can have any resolution as long as file size is within limits.
 */
exports.FILE_SIZE_LIMITS = {
    // Images - no resolution limit, 50MB size limit
    'image/*': 50 * 1024 * 1024,
    // Videos - no resolution limit, 100MB size limit (videos are larger)
    'video/*': 100 * 1024 * 1024,
    // Audio
    'audio/*': 50 * 1024 * 1024,
    // Documents
    'application/pdf': 50 * 1024 * 1024,
    'application/msword': 50 * 1024 * 1024,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 50 * 1024 * 1024,
    'application/vnd.ms-excel': 50 * 1024 * 1024,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 50 * 1024 * 1024,
    'application/vnd.ms-powerpoint': 50 * 1024 * 1024,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 50 * 1024 * 1024,
    // Archives
    'application/zip': 100 * 1024 * 1024,
    'application/x-rar-compressed': 100 * 1024 * 1024,
    'application/x-7z-compressed': 100 * 1024 * 1024,
    // Text files
    'text/*': 10 * 1024 * 1024,
    // Default for anything else
    '*': 50 * 1024 * 1024,
};
/**
 * Blocked MIME types (security)
 */
exports.BLOCKED_MIME_TYPES = [
    'application/x-executable',
    'application/x-msdos-program',
    'application/x-msdownload',
    'application/x-sh',
    'application/x-shellscript',
    'application/x-bat',
    'application/x-msi',
    'application/x-dosexec',
];
/**
 * Blocked file extensions (security)
 */
exports.BLOCKED_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
    '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
    '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
    '.msc', '.msp', '.cpl', '.hta', '.jar',
    '.sh', '.bash', '.zsh', '.fish',
];
/**
 * Image MIME types (for isImage detection)
 */
exports.IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/avif',
    'image/heic',
    'image/heif',
];
// =============================================================================
// Utilities
// =============================================================================
/**
 * Get file size limit for a given MIME type
 */
function getFileSizeLimit(mimeType) {
    // Check exact match first
    const exactMatch = exports.FILE_SIZE_LIMITS[mimeType];
    if (exactMatch !== undefined) {
        return exactMatch;
    }
    // Check wildcard match (e.g., 'image/*')
    const category = mimeType.split('/')[0] + '/*';
    const categoryMatch = exports.FILE_SIZE_LIMITS[category];
    if (categoryMatch !== undefined) {
        return categoryMatch;
    }
    // Return default (50MB if not defined)
    return exports.FILE_SIZE_LIMITS['*'] ?? 50 * 1024 * 1024;
}
/**
 * Check if a file extension is blocked
 */
function isBlockedExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return exports.BLOCKED_EXTENSIONS.includes(ext);
}
/**
 * Check if a MIME type is blocked
 */
function isBlockedMimeType(mimeType) {
    return exports.BLOCKED_MIME_TYPES.includes(mimeType.toLowerCase());
}
/**
 * Check if a MIME type is an image
 */
function isImageMimeType(mimeType) {
    return exports.IMAGE_MIME_TYPES.includes(mimeType.toLowerCase()) ||
        mimeType.toLowerCase().startsWith('image/');
}
/**
 * Validate a file before upload
 */
function validateFile(filename, mimeType, size) {
    // Check blocked extension
    if (isBlockedExtension(filename)) {
        return {
            valid: false,
            error: `File type not allowed: ${path.extname(filename)}`,
        };
    }
    // Check blocked MIME type
    if (isBlockedMimeType(mimeType)) {
        return {
            valid: false,
            error: `MIME type not allowed: ${mimeType}`,
        };
    }
    // Check file size
    const maxSize = getFileSizeLimit(mimeType);
    if (size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        return {
            valid: false,
            error: `File too large. Maximum size for ${mimeType} is ${maxMB}MB`,
            maxSize,
        };
    }
    return { valid: true, maxSize };
}
/**
 * Generate a unique filename with original extension
 */
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
}
/**
 * Sanitize filename (remove potentially dangerous characters)
 */
function sanitizeFilename(filename) {
    // Keep only alphanumeric, dots, underscores, and hyphens
    return filename
        .replace(/[^a-zA-Z0-9.\-_]/g, '_')
        .replace(/\.{2,}/g, '.') // Prevent directory traversal
        .substring(0, 255); // Limit length
}
/**
 * Local filesystem storage provider
 */
class LocalStorageProvider {
    basePath;
    baseUrl;
    constructor(basePath, baseUrl = '/uploads') {
        this.basePath = basePath;
        this.baseUrl = baseUrl;
    }
    async save(buffer, filename, mimeType) {
        // Generate unique filename
        const uniqueName = generateUniqueFilename(filename);
        const sanitizedName = sanitizeFilename(uniqueName);
        // Create directory structure by year/month
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const subDir = `${year}/${month}`;
        const fullDir = path.join(this.basePath, subDir);
        // Ensure directory exists
        await fs.mkdir(fullDir, { recursive: true });
        // Write file
        const filePath = path.join(subDir, sanitizedName);
        const fullPath = path.join(this.basePath, filePath);
        await fs.writeFile(fullPath, buffer);
        return {
            path: filePath,
            name: filename,
            mimeType,
            size: buffer.length,
            isImage: isImageMimeType(mimeType),
        };
    }
    async delete(filePath) {
        const fullPath = path.join(this.basePath, filePath);
        try {
            await fs.unlink(fullPath);
        }
        catch (error) {
            // Ignore if file doesn't exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    getUrl(filePath) {
        return `${this.baseUrl}/${filePath}`;
    }
    async exists(filePath) {
        try {
            await fs.access(path.join(this.basePath, filePath));
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
/**
 * S3-compatible storage provider (stub for future implementation)
 * TODO: Implement when needed for production
 */
class S3StorageProvider {
    bucket;
    region;
    endpoint;
    constructor(bucket, region, endpoint) {
        this.bucket = bucket;
        this.region = region;
        this.endpoint = endpoint;
    }
    async save(_buffer, _filename, _mimeType) {
        // TODO: Implement S3 upload using @aws-sdk/client-s3
        throw new Error('S3 storage not yet implemented');
    }
    async delete(_filePath) {
        // TODO: Implement S3 delete
        throw new Error('S3 storage not yet implemented');
    }
    getUrl(filePath) {
        if (this.endpoint) {
            return `${this.endpoint}/${this.bucket}/${filePath}`;
        }
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
    }
    async exists(_filePath) {
        // TODO: Implement S3 head object
        throw new Error('S3 storage not yet implemented');
    }
}
exports.S3StorageProvider = S3StorageProvider;
// =============================================================================
// Factory
// =============================================================================
/**
 * Get storage provider based on configuration
 */
function getStorageProvider(config) {
    const storageType = config?.type ?? process.env.STORAGE_TYPE ?? 'local';
    if (storageType === 's3') {
        const bucket = config?.bucket ?? process.env.S3_BUCKET;
        const region = config?.region ?? process.env.S3_REGION ?? 'eu-west-1';
        const endpoint = config?.endpoint ?? process.env.S3_ENDPOINT;
        if (!bucket) {
            throw new Error('S3_BUCKET environment variable required for S3 storage');
        }
        return new S3StorageProvider(bucket, region, endpoint);
    }
    // Default to local storage
    const basePath = config?.basePath ?? process.env.UPLOAD_PATH ?? './uploads';
    const baseUrl = process.env.UPLOAD_URL ?? '/uploads';
    return new LocalStorageProvider(basePath, baseUrl);
}
// =============================================================================
// Exports
// =============================================================================
exports.default = {
    validateFile,
    getFileSizeLimit,
    isBlockedExtension,
    isBlockedMimeType,
    isImageMimeType,
    generateUniqueFilename,
    sanitizeFilename,
    getStorageProvider,
    LocalStorageProvider,
    S3StorageProvider,
    FILE_SIZE_LIMITS: exports.FILE_SIZE_LIMITS,
    BLOCKED_MIME_TYPES: exports.BLOCKED_MIME_TYPES,
    BLOCKED_EXTENSIONS: exports.BLOCKED_EXTENSIONS,
    IMAGE_MIME_TYPES: exports.IMAGE_MIME_TYPES,
};
//# sourceMappingURL=storage.js.map