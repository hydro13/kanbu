/**
 * Auth Library
 *
 * Password hashing (argon2) and JWT handling (jose)
 */

import * as argon2 from 'argon2';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'CHANGE-ME-IN-PRODUCTION-unsafe-default'
);
const JWT_ISSUER = 'kanbu';
const JWT_AUDIENCE = 'kanbu-users';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

// =============================================================================
// Types
// =============================================================================

export interface JWTUserPayload extends JWTPayload {
  sub: string; // user id as string
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  expiresAt: Date;
}

// =============================================================================
// Password Hashing (argon2)
// =============================================================================

/**
 * Hash a password using argon2id
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
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
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
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
function parseDuration(duration: string): number {
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
export async function generateToken(
  userId: number,
  email: string,
  username: string
): Promise<TokenPair> {
  const expiresIn = parseDuration(JWT_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresIn);

  const accessToken = await new SignJWT({
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
export async function verifyToken(token: string): Promise<JWTUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as JWTUserPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param header - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}
