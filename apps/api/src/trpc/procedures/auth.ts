/**
 * Auth Procedures
 *
 * Authentication endpoints: register, login, logout, me
 *
 * ═══════════════════════════════════════════════════════════════════
 * Modified by:
 * Session: 9a49de0d-74ae-4a76-a6f6-53c7e3f2218b
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T16:53 CET
 * Change: Added login tracking (last_logins + sessions records)
 *
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added validateInvite and acceptInvite procedures (ADMIN-01)
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../router';
import { hashPassword, verifyPassword, generateToken, verifyToken, extractBearerToken } from '../../lib/auth';

// =============================================================================
// Input Schemas
// =============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

// =============================================================================
// Output Types
// =============================================================================

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
  accessToken: string;
  expiresAt: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  timezone: string;
  language: string;
  emailVerified: boolean;
  createdAt: string;
}

// =============================================================================
// Auth Router
// =============================================================================

export const authRouter = router({
  /**
   * Register a new user
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const { email, username, name, password } = input;

      // Check if email already exists
      const existingEmail = await ctx.prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }

      // Check if username already exists
      const existingUsername = await ctx.prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already taken',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await ctx.prisma.user.create({
        data: {
          email,
          username,
          name,
          passwordHash,
        },
      });

      // Generate token
      const tokenPair = await generateToken(user.id, user.email, user.username);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        accessToken: tokenPair.accessToken,
        expiresAt: tokenPair.expiresAt.toISOString(),
      };
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const { email, password } = input;

      // Find user by email
      const user = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Account is deactivated',
        });
      }

      // Get security settings from database
      const securitySettings = await ctx.prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'security.max_login_attempts',
              'security.lockout_duration',
              'security.max_lockouts',
            ],
          },
        },
      });
      const settingsMap = new Map(securitySettings.map(s => [s.key, s.value]));
      const maxAttempts = parseInt(settingsMap.get('security.max_login_attempts') ?? '5', 10);
      const baseLockoutMinutes = parseInt(settingsMap.get('security.lockout_duration') ?? '15', 10);
      const maxLockouts = parseInt(settingsMap.get('security.max_lockouts') ?? '5', 10); // 0 = no permanent lock

      // Check if user is permanently locked (lockoutCount >= maxLockouts and maxLockouts > 0)
      if (maxLockouts > 0 && user.lockoutCount >= maxLockouts) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Account is permanently locked due to repeated failed login attempts. Contact an administrator.',
        });
      }

      // Check if user is temporarily locked out
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        const remainingHours = Math.floor(remainingMs / 3600000);

        let timeMessage: string;
        if (remainingHours >= 1) {
          const mins = Math.ceil((remainingMs % 3600000) / 60000);
          timeMessage = `${remainingHours} hour${remainingHours === 1 ? '' : 's'}${mins > 0 ? ` and ${mins} minute${mins === 1 ? '' : 's'}` : ''}`;
        } else {
          timeMessage = `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
        }

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Account is locked. Try again in ${timeMessage}.`,
        });
      }

      // Verify password
      const validPassword = await verifyPassword(user.passwordHash, password);
      if (!validPassword) {
        // Increment failed login count
        const newFailedCount = user.failedLoginCount + 1;

        // Check if this triggers a lockout
        if (newFailedCount >= maxAttempts) {
          const newLockoutCount = user.lockoutCount + 1;

          // Check if this would be a permanent lock
          if (maxLockouts > 0 && newLockoutCount >= maxLockouts) {
            // Permanent lock - set lockedUntil far in the future
            await ctx.prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginCount: 0,
                lockoutCount: newLockoutCount,
                lockedUntil: new Date('2099-12-31'), // Effectively permanent
              },
            });

            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Account is now permanently locked due to repeated failed login attempts. Contact an administrator.',
            });
          }

          // Exponential backoff: baseLockoutMinutes * 2^(lockoutCount)
          // e.g., 15min, 30min, 60min, 120min, 240min (4 hours)
          const lockoutMinutes = baseLockoutMinutes * Math.pow(2, user.lockoutCount);
          const maxLockoutMinutes = 24 * 60; // Cap at 24 hours
          const actualLockoutMinutes = Math.min(lockoutMinutes, maxLockoutMinutes);

          await ctx.prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0, // Reset for next round
              lockoutCount: newLockoutCount,
              lockedUntil: new Date(Date.now() + actualLockoutMinutes * 60 * 1000),
            },
          });

          const lockoutHours = Math.floor(actualLockoutMinutes / 60);
          const lockoutMins = actualLockoutMinutes % 60;
          let lockoutTimeMessage: string;
          if (lockoutHours >= 1) {
            lockoutTimeMessage = `${lockoutHours} hour${lockoutHours === 1 ? '' : 's'}${lockoutMins > 0 ? ` and ${lockoutMins} minute${lockoutMins === 1 ? '' : 's'}` : ''}`;
          } else {
            lockoutTimeMessage = `${actualLockoutMinutes} minute${actualLockoutMinutes === 1 ? '' : 's'}`;
          }

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Too many failed login attempts. Account is locked for ${lockoutTimeMessage}.`,
          });
        }

        // Just increment failed count, not locked yet
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: newFailedCount },
        });

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Successful login - reset failed login count (but keep lockoutCount for history)
      if (user.failedLoginCount > 0 || user.lockedUntil) {
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            // Note: lockoutCount is NOT reset on successful login
            // This ensures exponential backoff persists across lockout cycles
            // Admin must manually unlock to reset lockoutCount
          },
        });
      }

      // Get IP and user agent from request
      const ip = ctx.req.headers['x-forwarded-for']?.toString().split(',')[0] ||
                 ctx.req.socket?.remoteAddress ||
                 'unknown';
      const userAgent = ctx.req.headers['user-agent'] || 'unknown';

      // Update last login timestamp on user
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Record login in last_logins table
      await ctx.prisma.lastLogin.create({
        data: {
          userId: user.id,
          authType: 'password',
          ip: ip.substring(0, 45), // Max 45 chars for IPv6
          userAgent: userAgent.substring(0, 255),
        },
      });

      // Generate token
      const tokenPair = await generateToken(user.id, user.email, user.username);

      // Create session record
      const crypto = await import('crypto');
      const sessionId = crypto.randomBytes(32).toString('hex');
      await ctx.prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          ipAddress: ip.substring(0, 45),
          userAgent: userAgent,
          expiresAt: tokenPair.expiresAt,
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        accessToken: tokenPair.accessToken,
        expiresAt: tokenPair.expiresAt.toISOString(),
      };
    }),

  /**
   * Logout - invalidate token (client-side token removal)
   * Note: With stateless JWT, logout is primarily client-side.
   * For token blacklisting, use sessions table.
   */
  logout: publicProcedure
    .mutation(async () => {
      // With stateless JWT, logout is handled client-side by removing the token
      // For enhanced security, we could add the token to a blacklist table
      // But for now, we just return success
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }),

  /**
   * Get current authenticated user
   */
  me: publicProcedure
    .query(async ({ ctx }): Promise<UserResponse | null> => {
      // Extract token from Authorization header
      const authHeader = ctx.req.headers.authorization;
      const token = extractBearerToken(authHeader);

      if (!token) {
        return null;
      }

      // Verify token
      const payload = await verifyToken(token);
      if (!payload || !payload.sub) {
        return null;
      }

      // Get user from database
      const userId = parseInt(payload.sub, 10);
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        timezone: user.timezone,
        language: user.language,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      };
    }),

  /**
   * Validate an invite token (public endpoint)
   */
  validateInvite: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findUnique({
        where: { token: input.token },
        include: {
          invitedBy: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!invite) {
        return {
          valid: false,
          error: 'Invite not found',
        };
      }

      if (invite.acceptedAt) {
        return {
          valid: false,
          error: 'Invite has already been used',
        };
      }

      if (invite.expiresAt < new Date()) {
        return {
          valid: false,
          error: 'Invite has expired',
        };
      }

      // Check if email is already registered
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (existingUser) {
        return {
          valid: false,
          error: 'An account with this email already exists',
        };
      }

      return {
        valid: true,
        invite: {
          email: invite.email,
          role: invite.role,
          invitedBy: invite.invitedBy.name,
          expiresAt: invite.expiresAt.toISOString(),
        },
      };
    }),

  /**
   * Accept an invite and create account (public endpoint)
   */
  acceptInvite: publicProcedure
    .input(acceptInviteSchema)
    .mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const { token, username, name, password } = input;

      // Find and validate invite
      const invite = await ctx.prisma.invite.findUnique({
        where: { token },
      });

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite has already been used',
        });
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite has expired',
        });
      }

      // Check if email is already registered
      const existingEmail = await ctx.prisma.user.findUnique({
        where: { email: invite.email },
      });
      if (existingEmail) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
        });
      }

      // Check if username is taken
      const existingUsername = await ctx.prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already taken',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user with the role from the invite
      const user = await ctx.prisma.user.create({
        data: {
          email: invite.email,
          username,
          name,
          passwordHash,
          role: invite.role,
          emailVerified: true, // Invited users are verified
        },
      });

      // Mark invite as accepted
      await ctx.prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      // Generate token
      const tokenPair = await generateToken(user.id, user.email, user.username);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        accessToken: tokenPair.accessToken,
        expiresAt: tokenPair.expiresAt.toISOString(),
      };
    }),
});
