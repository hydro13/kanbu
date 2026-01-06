"use strict";
/**
 * Auth Library
 *
 * Password hashing (argon2) and JWT handling (jose)
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
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.extractBearerToken = extractBearerToken;
const argon2 = __importStar(require("argon2"));
const jose_1 = require("jose");
// =============================================================================
// Configuration
// =============================================================================
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'CHANGE-ME-IN-PRODUCTION-unsafe-default');
const JWT_ISSUER = 'kanbu';
const JWT_AUDIENCE = 'kanbu-users';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
// =============================================================================
// Password Hashing (argon2)
// =============================================================================
/**
 * Hash a password using argon2id
 * @param password - Plain text password
 * @returns Hashed password
 */
async function hashPassword(password) {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4,
    });
}
/**
 * Verify a password against a hash
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns true if password matches
 */
async function verifyPassword(hash, password) {
    try {
        return await argon2.verify(hash, password);
    }
    catch {
        return false;
    }
}
// =============================================================================
// JWT Handling (jose)
// =============================================================================
/**
 * Parse duration string to milliseconds
 * Supports: 1h, 2d, 7d, 30d, etc.
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([hdwm])$/);
    if (!match || !match[1] || !match[2]) {
        return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
    const value = match[1];
    const unit = match[2];
    const num = parseInt(value, 10);
    switch (unit) {
        case 'h': return num * 60 * 60 * 1000;
        case 'd': return num * 24 * 60 * 60 * 1000;
        case 'w': return num * 7 * 24 * 60 * 60 * 1000;
        case 'm': return num * 30 * 24 * 60 * 60 * 1000;
        default: return 7 * 24 * 60 * 60 * 1000;
    }
}
/**
 * Generate a JWT access token
 * @param userId - User ID
 * @param email - User email
 * @param username - Username
 * @returns Token pair with access token and expiration
 */
async function generateToken(userId, email, username) {
    const expiresIn = parseDuration(JWT_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + expiresIn);
    const accessToken = await new jose_1.SignJWT({
        email,
        username,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId.toString())
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(expiresAt)
        .sign(JWT_SECRET);
    return {
        accessToken,
        expiresAt,
    };
}
/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
async function verifyToken(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        return payload;
    }
    catch {
        return null;
    }
}
/**
 * Extract token from Authorization header
 * @param header - Authorization header value
 * @returns Token string or null
 */
function extractBearerToken(header) {
    if (!header)
        return null;
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token)
        return null;
    return token;
}
//# sourceMappingURL=auth.js.map