"use strict";
/**
 * Auth Procedures
 *
 * Authentication endpoints: register, login, logout, me
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const auth_1 = require("../../lib/auth");
// =============================================================================
// Input Schemas
// =============================================================================
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
    name: zod_1.z.string()
        .min(1, 'Name is required')
        .max(255, 'Name must be at most 255 characters'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// =============================================================================
// Auth Router
// =============================================================================
exports.authRouter = (0, router_1.router)({
    /**
     * Register a new user
     */
    register: router_1.publicProcedure
        .input(registerSchema)
        .mutation(async ({ ctx, input }) => {
        const { email, username, name, password } = input;
        // Check if email already exists
        const existingEmail = await ctx.prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            throw new server_1.TRPCError({
                code: 'CONFLICT',
                message: 'Email already registered',
            });
        }
        // Check if username already exists
        const existingUsername = await ctx.prisma.user.findUnique({
            where: { username },
        });
        if (existingUsername) {
            throw new server_1.TRPCError({
                code: 'CONFLICT',
                message: 'Username already taken',
            });
        }
        // Hash password
        const passwordHash = await (0, auth_1.hashPassword)(password);
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
        const tokenPair = await (0, auth_1.generateToken)(user.id, user.email, user.username);
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
            accessToken: tokenPair.accessToken,
            expiresAt: tokenPair.expiresAt.toISOString(),
        };
    }),
    /**
     * Login with email and password
     */
    login: router_1.publicProcedure
        .input(loginSchema)
        .mutation(async ({ ctx, input }) => {
        const { email, password } = input;
        // Find user by email
        const user = await ctx.prisma.user.findUnique({
            where: { email },
        });
        if (!user || !user.passwordHash) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid email or password',
            });
        }
        // Check if user is active
        if (!user.isActive) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Account is deactivated',
            });
        }
        // Verify password
        const validPassword = await (0, auth_1.verifyPassword)(user.passwordHash, password);
        if (!validPassword) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid email or password',
            });
        }
        // Update last login
        await ctx.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        // Generate token
        const tokenPair = await (0, auth_1.generateToken)(user.id, user.email, user.username);
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
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
    logout: router_1.publicProcedure
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
    me: router_1.publicProcedure
        .query(async ({ ctx }) => {
        // Extract token from Authorization header
        const authHeader = ctx.req.headers.authorization;
        const token = (0, auth_1.extractBearerToken)(authHeader);
        if (!token) {
            return null;
        }
        // Verify token
        const payload = await (0, auth_1.verifyToken)(token);
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
            timezone: user.timezone,
            language: user.language,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
        };
    }),
});
//# sourceMappingURL=auth.js.map