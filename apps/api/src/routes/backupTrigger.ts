/**
 * Backup Trigger HTTP Endpoint
 *
 * External HTTP endpoint for triggering backups from external cron jobs.
 * Used by SaaS deployments (Coolify, systemd timers, external cron services).
 *
 * Authentication: API key via header or body parameter.
 * The API key is stored in SystemSetting with key 'BACKUP_TRIGGER_API_KEY'.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { scheduleService } from '../services/backup';

interface TriggerBody {
  type: 'database' | 'source';
  apiKey?: string;
}

interface TriggerHeaders {
  'x-backup-key'?: string;
}

/**
 * Validate the backup trigger API key
 */
async function validateApiKey(key: string | undefined): Promise<boolean> {
  if (!key) return false;

  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'BACKUP_TRIGGER_API_KEY' },
  });

  if (!setting?.value) {
    console.warn('[BackupTrigger] No BACKUP_TRIGGER_API_KEY configured in system settings');
    return false;
  }

  return setting.value === key;
}

/**
 * Register backup trigger routes
 */
export async function registerBackupTriggerRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /api/backup/trigger
   *
   * Trigger a backup externally.
   *
   * Authentication:
   * - Header: X-Backup-Key: <api-key>
   * - OR body: { apiKey: "<api-key>", type: "database" }
   *
   * Body:
   * - type: "database" | "source" (required)
   *
   * Response:
   * - 200: Backup completed/started
   * - 401: Invalid or missing API key
   * - 400: Invalid request body
   * - 500: Backup failed
   */
  server.post<{
    Body: TriggerBody;
    Headers: TriggerHeaders;
  }>(
    '/api/backup/trigger',
    async (
      request: FastifyRequest<{
        Body: TriggerBody;
        Headers: TriggerHeaders;
      }>,
      reply: FastifyReply
    ) => {
      const startTime = Date.now();

      try {
        // Get API key from header or body
        const apiKey = request.headers['x-backup-key'] ?? request.body?.apiKey;

        // Validate API key
        const isValid = await validateApiKey(apiKey);
        if (!isValid) {
          console.warn('[BackupTrigger] Invalid or missing API key');
          return reply.status(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid or missing API key. Set BACKUP_TRIGGER_API_KEY in system settings.',
          });
        }

        // Validate request body
        const { type } = request.body ?? {};
        if (!type || !['database', 'source'].includes(type)) {
          return reply.status(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Invalid or missing type. Must be "database" or "source".',
          });
        }

        console.log(`[BackupTrigger] Triggered ${type} backup via external request`);

        // Execute backup
        const result = await scheduleService.executeByType(
          type.toUpperCase() as 'DATABASE' | 'SOURCE',
          'EXTERNAL'
        );

        const duration = Date.now() - startTime;

        if (result.success) {
          return reply.status(200).send({
            success: true,
            message: result.message,
            execution: {
              id: result.execution.id,
              type: result.execution.type,
              status: result.execution.status,
              filename: result.execution.filename,
              fileSize: result.execution.fileSize,
              durationMs: result.execution.durationMs ?? duration,
            },
          });
        } else {
          return reply.status(500).send({
            success: false,
            error: 'Backup Failed',
            message: result.message,
            execution: {
              id: result.execution.id,
              type: result.execution.type,
              status: result.execution.status,
              errorMessage: result.execution.errorMessage,
              durationMs: result.execution.durationMs ?? duration,
            },
          });
        }
      } catch (error) {
        console.error('[BackupTrigger] Error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message,
        });
      }
    }
  );

  /**
   * GET /api/backup/trigger/health
   *
   * Health check for backup trigger endpoint.
   * Does NOT require authentication.
   */
  server.get('/api/backup/trigger/health', async (_request, reply) => {
    const hasApiKey = !!(
      await prisma.systemSetting.findUnique({
        where: { key: 'BACKUP_TRIGGER_API_KEY' },
      })
    )?.value;

    return reply.status(200).send({
      status: 'ok',
      configured: hasApiKey,
      message: hasApiKey
        ? 'Backup trigger endpoint is configured and ready'
        : 'WARNING: BACKUP_TRIGGER_API_KEY not set in system settings',
    });
  });
}
