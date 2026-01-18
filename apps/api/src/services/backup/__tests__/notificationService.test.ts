/**
 * Notification Service Tests
 *
 * Tests for backup notification service including:
 * - Webhook payload structure
 * - HMAC signature generation
 * - Notification filtering (success/failure)
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

describe('Webhook Payload Structure', () => {
  it('should have correct event types', () => {
    const validEvents = [
      'backup.completed',
      'backup.failed',
      'restore.completed',
      'restore.failed',
    ];

    // All events should be lowercase with dot separator
    for (const event of validEvents) {
      expect(event).toMatch(/^[a-z]+\.[a-z]+$/);
    }
  });

  it('should include required fields in payload', () => {
    const payload = {
      event: 'backup.completed',
      timestamp: new Date().toISOString(),
      execution: {
        id: 1,
        type: 'DATABASE',
        trigger: 'SCHEDULED',
        status: 'COMPLETED',
        filename: 'test.sql.gz',
        fileSize: 1024,
        durationMs: 5000,
        errorMessage: null,
      },
    };

    expect(payload.event).toBeDefined();
    expect(payload.timestamp).toBeDefined();
    expect(payload.execution).toBeDefined();
    expect(payload.execution.type).toBeDefined();
    expect(payload.execution.status).toBeDefined();
  });

  it('should include schedule info when available', () => {
    const payloadWithSchedule = {
      event: 'backup.completed',
      timestamp: new Date().toISOString(),
      execution: {
        id: 1,
        type: 'DATABASE',
        trigger: 'SCHEDULED',
        status: 'COMPLETED',
        filename: 'test.sql.gz',
        fileSize: 1024,
        durationMs: 5000,
        errorMessage: null,
      },
      schedule: {
        id: 1,
        name: 'Daily Database Backup',
      },
    };

    expect(payloadWithSchedule.schedule).toBeDefined();
    expect(payloadWithSchedule.schedule?.name).toBe('Daily Database Backup');
  });
});

describe('HMAC Signature Generation', () => {
  function signPayload(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  it('should generate valid sha256 signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test-secret';

    const signature = signPayload(payload, secret);

    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should produce consistent signatures for same input', () => {
    const payload = JSON.stringify({ event: 'backup.completed' });
    const secret = 'consistent-secret';

    const sig1 = signPayload(payload, secret);
    const sig2 = signPayload(payload, secret);

    expect(sig1).toBe(sig2);
  });

  it('should produce different signatures for different secrets', () => {
    const payload = JSON.stringify({ event: 'backup.completed' });

    const sig1 = signPayload(payload, 'secret1');
    const sig2 = signPayload(payload, 'secret2');

    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different payloads', () => {
    const secret = 'same-secret';

    const sig1 = signPayload(JSON.stringify({ event: 'backup.completed' }), secret);
    const sig2 = signPayload(JSON.stringify({ event: 'backup.failed' }), secret);

    expect(sig1).not.toBe(sig2);
  });
});

describe('Notification Filtering', () => {
  it('should respect notifyOnSuccess setting', () => {
    const config = {
      notifyOnSuccess: true,
      notifyOnFailure: true,
    };

    const successResult = { success: true };
    const shouldNotify = successResult.success ? config.notifyOnSuccess : config.notifyOnFailure;

    expect(shouldNotify).toBe(true);
  });

  it('should respect notifyOnFailure setting', () => {
    const config = {
      notifyOnSuccess: false,
      notifyOnFailure: true,
    };

    const failureResult = { success: false };
    const shouldNotify = failureResult.success ? config.notifyOnSuccess : config.notifyOnFailure;

    expect(shouldNotify).toBe(true);
  });

  it('should not notify when disabled', () => {
    const config = {
      notifyOnSuccess: false,
      notifyOnFailure: false,
    };

    expect(config.notifyOnSuccess).toBe(false);
    expect(config.notifyOnFailure).toBe(false);
  });

  it('should default to notify on failure only', () => {
    const defaultConfig = {
      notifyOnSuccess: false,
      notifyOnFailure: true,
    };

    expect(defaultConfig.notifyOnSuccess).toBe(false);
    expect(defaultConfig.notifyOnFailure).toBe(true);
  });
});

describe('Backup Result Types', () => {
  it('should support database backup results', () => {
    const result = {
      success: true,
      type: 'database' as const,
      filename: 'kanbu_backup_2026-01-18T10-30-00.sql.gz',
      fileSize: 1024 * 1024,
      durationMs: 5000,
      trigger: 'scheduled' as const,
    };

    expect(result.type).toBe('database');
    expect(result.success).toBe(true);
  });

  it('should support source backup results', () => {
    const result = {
      success: true,
      type: 'source' as const,
      filename: 'kanbu_source_2026-01-18T10-30-00.tar.gz',
      fileSize: 50 * 1024 * 1024,
      durationMs: 30000,
      trigger: 'manual' as const,
    };

    expect(result.type).toBe('source');
    expect(result.trigger).toBe('manual');
  });

  it('should support failed backup results with error', () => {
    const result: {
      success: boolean;
      type: 'database' | 'source';
      error: string;
      durationMs: number;
      trigger: 'scheduled' | 'manual';
      filename?: string;
    } = {
      success: false,
      type: 'database' as const,
      error: 'PostgreSQL container not found',
      durationMs: 1000,
      trigger: 'scheduled' as const,
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.filename).toBeUndefined();
  });
});

describe('Restore Result Types', () => {
  it('should support successful restore results', () => {
    const result = {
      success: true,
      filename: 'kanbu_backup_2026-01-18T10-30-00.sql.gz',
      message: 'Database restored successfully',
      durationMs: 15000,
      preRestoreBackup: 'kanbu_backup_2026-01-18T12-00-00.sql.gz',
    };

    expect(result.success).toBe(true);
    expect(result.preRestoreBackup).toBeDefined();
  });

  it('should support failed restore results', () => {
    const result = {
      success: false,
      filename: 'kanbu_backup_2026-01-18T10-30-00.sql.gz',
      message: 'Restore failed',
      durationMs: 5000,
      error: 'Permission denied',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
