import type { PendingApproval, ApprovalDecision } from './types.js';

interface ApprovalEntry {
  approval: PendingApproval;
  resolve: (decision: ApprovalDecision) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Manages human-in-the-loop approval requests from agents.
 *
 * Flow:
 * 1. Agent hits a blocker → calls waitForApproval()
 * 2. Kanbu creates a blocking subtask in the UI
 * 3. Human approves/rejects → Kanbu calls resolve()
 * 4. Agent resumes or gets cancelled
 */
export class ApprovalBridge {
  private readonly pending = new Map<string, ApprovalEntry>();

  /**
   * Register a pending approval and wait for a human decision.
   * Auto-rejects after approval.timeoutMs milliseconds.
   */
  async waitForApproval(approval: PendingApproval): Promise<ApprovalDecision> {
    return new Promise<ApprovalDecision>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(approval.approvalId);
        resolve('rejected');
      }, approval.timeoutMs);

      this.pending.set(approval.approvalId, { approval, resolve, timer });
    });
  }

  /**
   * Resolve a pending approval from the Kanbu UI.
   * Safe to call with an unknown approvalId (no-op).
   */
  resolve(approvalId: string, decision: ApprovalDecision): void {
    const entry = this.pending.get(approvalId);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(approvalId);
    entry.resolve(decision);
  }

  /**
   * Get all currently pending approvals (e.g. to render in the UI).
   */
  getPending(): PendingApproval[] {
    return Array.from(this.pending.values()).map((e) => e.approval);
  }
}
