/*
 * Logger Utility
 * Version: 1.0.0
 *
 * Centralized logger configuration using Pino.
 * Provides structured JSON logging in production and pretty printing in development.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-16
 * Fase: MCP Server Hardening
 * ═══════════════════════════════════════════════════════════════════
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

// Log startup info
logger.debug(`Logger initialized (env: ${process.env.NODE_ENV || 'development'})`)
