"use strict";
/**
 * Kanbu Shared - Prisma schema and shared types
 *
 * @see SETUP-02 voor database schema
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KANBU_VERSION = void 0;
exports.KANBU_VERSION = '0.1.0';
// Note: Prisma client is imported directly in each app via @prisma/client
// The schema is defined in this package (prisma/schema.prisma)
// Run `pnpm db:generate` in packages/shared to regenerate the client
// GitHub Connector Types (Fase 1)
__exportStar(require("./types/github"), exports);
//# sourceMappingURL=index.js.map