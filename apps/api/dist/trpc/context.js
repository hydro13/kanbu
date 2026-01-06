"use strict";
/**
 * tRPC Context
 *
 * Creates the context that is passed to all tRPC procedures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
async function createContext({ req, res }) {
    // Extract and verify JWT token from Authorization header
    let user = null;
    const token = (0, auth_1.extractBearerToken)(req.headers.authorization);
    if (token) {
        const payload = await (0, auth_1.verifyToken)(token);
        if (payload && payload.sub) {
            user = {
                id: parseInt(payload.sub, 10),
                email: payload.email,
                username: payload.username,
            };
        }
    }
    return {
        req,
        res,
        prisma: prisma_1.prisma,
        user,
    };
}
//# sourceMappingURL=context.js.map