"use strict";
/**
 * tRPC Router Configuration
 *
 * Root router and procedure definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectedProcedure = exports.middleware = exports.publicProcedure = exports.router = void 0;
const server_1 = require("@trpc/server");
/**
 * Initialize tRPC with context
 */
const t = server_1.initTRPC.context().create({
    errorFormatter({ shape }) {
        return shape;
    },
});
/**
 * Export reusable router and procedure helpers
 */
exports.router = t.router;
exports.publicProcedure = t.procedure;
exports.middleware = t.middleware;
/**
 * Protected procedure - requires authentication
 * Adds user to context with non-null type
 */
exports.protectedProcedure = exports.publicProcedure.use((0, exports.middleware)(async ({ ctx, next }) => {
    if (!ctx.user) {
        throw new server_1.TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to access this resource',
        });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user, // Assert non-null
        },
    });
}));
//# sourceMappingURL=router.js.map