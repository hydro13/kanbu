/**
 * Internal Backup Scheduler
 *
 * Uses node-cron to run scheduled backups in-process.
 * Configurable via BACKUP_SCHEDULER_MODE environment variable.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { scheduleService, calculateNextRun } from './scheduleService';
import { retentionService } from './retentionService';

// Scheduler modes
export type SchedulerMode = 'internal' | 'external' | 'both';

/**
 * Get configured scheduler mode
 */
export function getSchedulerMode(): SchedulerMode {
  const mode = process.env.BACKUP_SCHEDULER_MODE?.toLowerCase();
  if (mode === 'external') return 'external';
  if (mode === 'both') return 'both';
  return 'internal'; // default
}

/**
 * Check if internal scheduler should be active
 */
export function isInternalSchedulerEnabled(): boolean {
  const mode = getSchedulerMode();
  return mode === 'internal' || mode === 'both';
}

export class InternalScheduler {
  private jobs: Map<number, ScheduledTask> = new Map();
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler
   *
   * Loads all enabled schedules from database and starts cron jobs.
   * Also starts a periodic check for due schedules (fallback mechanism).
   */
  async start(): Promise<void> {
    if (!isInternalSchedulerEnabled()) {
      console.log('[Scheduler] Internal scheduler disabled (mode: external)');
      return;
    }

    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting internal scheduler...');
    this.isRunning = true;

    try {
      // Load all enabled schedules
      await this.reload();

      // Start periodic check every minute (fallback for missed jobs)
      this.checkInterval = setInterval(() => {
        this.checkDueSchedules().catch((err) => {
          console.error('[Scheduler] Error checking due schedules:', err);
        });
      }, 60000);

      console.log(`[Scheduler] Started with ${this.jobs.size} active job(s)`);
    } catch (error) {
      console.error('[Scheduler] Failed to start:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[Scheduler] Stopping...');

    // Clear periodic check
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Stop all cron jobs
    for (const [scheduleId, task] of this.jobs) {
      task.stop();
      console.log(`[Scheduler] Stopped job for schedule ${scheduleId}`);
    }
    this.jobs.clear();

    this.isRunning = false;
    console.log('[Scheduler] Stopped');
  }

  /**
   * Reload all schedules from database
   *
   * Call this after schedule changes (create, update, delete, toggle)
   */
  async reload(): Promise<void> {
    console.log('[Scheduler] Reloading schedules...');

    // Stop all existing jobs
    for (const task of this.jobs.values()) {
      task.stop();
    }
    this.jobs.clear();

    // Load enabled schedules
    const schedules = await scheduleService.listSchedules();
    const enabledSchedules = schedules.filter((s) => s.enabled);

    for (const schedule of enabledSchedules) {
      this.scheduleJob(schedule.id, schedule.cronExpression, schedule.name);
    }

    console.log(`[Scheduler] Loaded ${this.jobs.size} schedule(s)`);
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(scheduleId: number, cronExpression: string, name: string): void {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(
        `[Scheduler] Invalid cron expression for schedule ${scheduleId}: ${cronExpression}`
      );
      return;
    }

    const task = cron.schedule(
      cronExpression,
      async () => {
        console.log(`[Scheduler] Executing schedule ${scheduleId} (${name})`);
        try {
          const result = await scheduleService.executeSchedule(scheduleId, 'SCHEDULED');
          if (result.success) {
            console.log(`[Scheduler] Schedule ${scheduleId} completed: ${result.message}`);

            // Apply retention policy after successful backup
            try {
              const schedule = await scheduleService.getSchedule(scheduleId);
              if (schedule) {
                await retentionService.applyRetention(schedule);
              }
            } catch (retentionError) {
              console.error(`[Scheduler] Retention cleanup failed:`, retentionError);
            }
          } else {
            console.error(`[Scheduler] Schedule ${scheduleId} failed: ${result.message}`);
          }
        } catch (error) {
          console.error(`[Scheduler] Error executing schedule ${scheduleId}:`, error);
        }
      },
      {
        timezone: process.env.BACKUP_CRON_TIMEZONE || 'Europe/Amsterdam',
      }
    );

    this.jobs.set(scheduleId, task);
    const nextRun = calculateNextRun(cronExpression);
    console.log(
      `[Scheduler] Scheduled job ${scheduleId} (${name}), next run: ${nextRun?.toISOString() ?? 'unknown'}`
    );
  }

  /**
   * Check for due schedules (fallback mechanism)
   *
   * This handles cases where the server was restarted and missed scheduled times.
   */
  private async checkDueSchedules(): Promise<void> {
    const dueSchedules = await scheduleService.getDueSchedules();

    for (const schedule of dueSchedules) {
      // Skip if recently executed (within last 5 minutes)
      if (schedule.lastRunAt) {
        const timeSinceLastRun = Date.now() - schedule.lastRunAt.getTime();
        if (timeSinceLastRun < 5 * 60 * 1000) {
          continue;
        }
      }

      console.log(`[Scheduler] Found due schedule ${schedule.id} (${schedule.name}), executing...`);
      try {
        await scheduleService.executeSchedule(schedule.id, 'SCHEDULED');
      } catch (error) {
        console.error(`[Scheduler] Error executing due schedule ${schedule.id}:`, error);
      }
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    mode: SchedulerMode;
    activeJobs: number;
    jobs: Array<{ scheduleId: number; nextRun: Date | null }>;
  } {
    const jobs: Array<{ scheduleId: number; nextRun: Date | null }> = [];

    // We don't have easy access to next run from cron jobs,
    // so we'll need to calculate it from the schedule
    // This would require storing the cron expression with the job

    return {
      isRunning: this.isRunning,
      mode: getSchedulerMode(),
      activeJobs: this.jobs.size,
      jobs,
    };
  }
}

// Singleton export
export const internalScheduler = new InternalScheduler();
