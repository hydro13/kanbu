/*
 * AI Assistant Page
 * Version: 1.0.0
 *
 * User profile page for managing AI Assistant (Claude Code) integration.
 * Implements one-time setup code pairing flow for secure machine binding.
 *
 * Flow:
 * 1. User clicks "Generate Setup Code" button
 * 2. System generates KNB-XXXX-XXXX code (5 min TTL, one-time use)
 * 3. User tells Claude the code
 * 4. Claude exchanges code for permanent token
 * 5. Claude can now act on behalf of user with inherited ACL permissions
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.7 - Claude Code MCP Integration
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { ProfileLayout } from '../../components/profile/ProfileLayout';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '../../components/ui/card';
import { trpc } from '../../lib/trpc';

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(date: Date | string | null): string {
  if (!date) return 'Never';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateTime(d);
}

// =============================================================================
// Icons
// =============================================================================

function BotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AiAssistant() {
  const [countdown, setCountdown] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: bindings, isLoading: bindingsLoading } = trpc.assistant.getBindings.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Poll every 5 seconds when setup code is active
    }
  );
  const { data: activeSetupCode, refetch: refetchSetupCode } =
    trpc.assistant.getActiveSetupCode.useQuery(undefined, {
      refetchInterval: 2000, // Poll every 2 seconds for countdown and binding detection
    });

  // Mutations
  const generateCode = trpc.assistant.generateSetupCode.useMutation({
    onSuccess: () => {
      refetchSetupCode();
    },
  });

  const revokeBinding = trpc.assistant.revokeBinding.useMutation({
    onSuccess: () => {
      utils.assistant.getBindings.invalidate();
      setConfirmRevoke(null);
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (!activeSetupCode) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const expiresAt = new Date(activeSetupCode.expiresAt);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Expired');
        refetchSetupCode();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeSetupCode, refetchSetupCode]);

  const handleCopyCode = useCallback(async () => {
    if (!activeSetupCode?.code) return;
    await navigator.clipboard.writeText(activeSetupCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeSetupCode?.code]);

  const handleGenerateCode = () => {
    generateCode.mutate();
  };

  const handleRevokeBinding = (bindingId: number) => {
    revokeBinding.mutate({ bindingId });
  };

  if (bindingsLoading) {
    return (
      <ProfileLayout
        title="AI Assistant"
        description="Connect Claude Code to manage projects on your behalf"
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    );
  }

  const hasActiveBindings = (bindings?.length ?? 0) > 0;

  return (
    <ProfileLayout
      title="AI Assistant"
      description="Connect Claude Code to manage projects on your behalf"
    >
      <div className="space-y-6">
        {/* Introduction Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="h-5 w-5" />
              Claude Code Integration
            </CardTitle>
            <CardDescription>
              Connect Claude Code to your Kanbu account. Claude will inherit your permissions and
              can create tasks, update projects, and more on your behalf.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>How it works:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Generate a setup code below</li>
                <li>Tell Claude: "Connect to Kanbu with code KNB-XXXX-XXXX"</li>
                <li>Claude connects and inherits your permissions</li>
              </ol>
            </div>

            {/* Active Setup Code */}
            {activeSetupCode && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Your setup code:</p>
                <div className="flex items-center gap-4">
                  <code className="text-2xl font-mono font-bold tracking-wider text-blue-700 dark:text-blue-300">
                    {activeSetupCode.code}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  Expires in: <span className="font-mono font-bold">{countdown}</span>
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Tell Claude: "Connect to Kanbu with code {activeSetupCode.code}"
                </p>
              </div>
            )}

            {/* Generate Button */}
            {!activeSetupCode && (
              <Button
                onClick={handleGenerateCode}
                disabled={generateCode.isPending}
                className="mt-4"
              >
                {generateCode.isPending
                  ? 'Generating...'
                  : hasActiveBindings
                    ? 'Connect Another Machine'
                    : 'Generate Setup Code'}
              </Button>
            )}

            {activeSetupCode && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateCode}
                  disabled={generateCode.isPending}
                >
                  {generateCode.isPending ? 'Generating...' : 'Generate New Code'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Machines */}
        {hasActiveBindings && (
          <Card>
            <CardHeader>
              <CardTitle>Connected Machines</CardTitle>
              <CardDescription>
                These machines have Claude Code connected to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bindings?.map((binding) => (
                  <div
                    key={binding.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" title="Connected" />
                      <div>
                        <div className="font-medium">
                          {binding.machineName || binding.machineId.substring(0, 8) + '...'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Connected: {formatDateTime(binding.createdAt)}
                          {binding.lastUsedAt && (
                            <> &middot; Last used: {formatRelativeTime(binding.lastUsedAt)}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {confirmRevoke === binding.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-red-600">Disconnect?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokeBinding(binding.id)}
                            disabled={revokeBinding.isPending}
                          >
                            Yes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmRevoke(null)}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setConfirmRevoke(binding.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Info */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-3">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <strong>Permission Inheritance:</strong> Claude inherits your current permissions.
                  If your permissions change, Claude's access changes automatically.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <strong>Machine-Bound:</strong> Each connection is bound to a specific machine.
                  Tokens cannot be copied to other machines.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <strong>Audit Trail:</strong> All actions by Claude are logged with your name and
                  marked as "via Claude Code".
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <strong>Instant Revocation:</strong> Disconnect a machine anytime to immediately
                  revoke Claude's access from that device.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProfileLayout>
  );
}

export default AiAssistant;
