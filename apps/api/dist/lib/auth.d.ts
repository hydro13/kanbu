/**
 * Auth Library
 *
 * Password hashing (argon2) and JWT handling (jose)
 */
import { type JWTPayload } from 'jose';
export interface JWTUserPayload extends JWTPayload {
    sub: string;
    email: string;
    username: string;
}
export interface TokenPair {
    accessToken: string;
    expiresAt: Date;
}
/**
 * Hash a password using argon2id
 * @param password - Plain text password
 * @returns Hashed password
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a hash
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns true if password matches
 */
export declare function verifyPassword(hash: string, password: string): Promise<boolean>;
/**
 * Generate a JWT access token
 * @param userId - User ID
 * @param email - User email
 * @param username - Username
 * @returns Token pair with access token and expiration
 */
export declare function generateToken(userId: number, email: string, username: string): Promise<TokenPair>;
/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export declare function verifyToken(token: string): Promise<JWTUserPayload | null>;
/**
 * Extract token from Authorization header
 * @param header - Authorization header value
 * @returns Token string or null
 */
export declare function extractBearerToken(header: string | undefined): string | null;
//# sourceMappingURL=auth.d.ts.map