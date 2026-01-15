/*
 * TwoFactorAuth Page
 * Version: 1.1.0
 *
 * User profile page for managing two-factor authentication.
 * Compact layout with smaller QR code and tighter spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Component
// =============================================================================

export function TwoFactorAuth() {
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUri: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisable, setShowDisable] = useState(false)

  const utils = trpc.useUtils()
  const { data: status, isLoading } = trpc.user.get2FAStatus.useQuery()

  const setup2FA = trpc.user.setup2FA.useMutation({
    onSuccess: (data) => {
      setSetupData(data)
    },
  })

  const verify2FA = trpc.user.verify2FA.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes)
      setSetupData(null)
      setVerificationCode('')
      utils.user.get2FAStatus.invalidate()
    },
  })

  const disable2FA = trpc.user.disable2FA.useMutation({
    onSuccess: () => {
      setShowDisable(false)
      setDisablePassword('')
      utils.user.get2FAStatus.invalidate()
    },
  })

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      verify2FA.mutate({ token: verificationCode })
    }
  }

  const handleDisable = () => {
    if (disablePassword) {
      disable2FA.mutate({ password: disablePassword })
    }
  }

  if (isLoading) {
    return (
      <ProfileLayout title="Two-Factor Authentication" description="Secure your account with 2FA">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    )
  }

  // Show backup codes after successful setup
  if (backupCodes) {
    return (
      <ProfileLayout title="Two-Factor Authentication" description="Secure your account with 2FA">
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">2FA Enabled Successfully!</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Save these backup codes - use them if you lose your device</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {backupCodes.map((code, index) => (
                <code key={index} className="font-mono text-xs p-1.5 bg-gray-50 dark:bg-gray-900 rounded border text-center">
                  {code}
                </code>
              ))}
            </div>
            <Button size="sm" onClick={() => setBackupCodes(null)} className="w-full">Done</Button>
          </div>
        </div>
      </ProfileLayout>
    )
  }

  // Show setup flow
  if (setupData) {
    return (
      <ProfileLayout title="Two-Factor Authentication" description="Secure your account with 2FA">
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Setup 2FA</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Scan with Google Authenticator, Authy, etc.</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left: QR Code */}
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white rounded-lg border">
                  <QRCodeSVG value={setupData.qrCodeUri} size={140} />
                </div>
                <code className="mt-2 text-xs text-muted-foreground break-all text-center">
                  {setupData.secret}
                </code>
              </div>

              {/* Right: Verification */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter 6-digit code:</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="flex-1 h-9 px-3 text-sm font-mono text-center tracking-widest rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      onClick={handleVerify}
                      disabled={verificationCode.length !== 6 || verify2FA.isPending}
                    >
                      {verify2FA.isPending ? '...' : 'Verify'}
                    </Button>
                  </div>
                  {verify2FA.isError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{verify2FA.error.message}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setSetupData(null)} className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ProfileLayout>
    )
  }

  // Main view - enabled or disabled state
  return (
    <ProfileLayout title="Two-Factor Authentication" description="Secure your account with 2FA">
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status?.enabled ? 'Your account is protected with 2FA' : 'Add extra security to your account'}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            status?.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {status?.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="p-4">
          {status?.enabled ? (
            !showDisable ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisable(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Disable 2FA
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 border border-red-200 dark:border-red-800 rounded-lg">
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Your password"
                  className="flex-1 h-8 px-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Button size="sm" variant="outline" onClick={() => { setShowDisable(false); setDisablePassword('') }} className="h-8">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDisable}
                  disabled={!disablePassword || disable2FA.isPending}
                  className="h-8 bg-red-600 hover:bg-red-700"
                >
                  {disable2FA.isPending ? '...' : 'Disable'}
                </Button>
                {disable2FA.isError && (
                  <span className="text-xs text-red-600">{disable2FA.error.message}</span>
                )}
              </div>
            )
          ) : (
            <Button size="sm" onClick={() => setup2FA.mutate()} disabled={setup2FA.isPending}>
              {setup2FA.isPending ? 'Setting up...' : 'Enable 2FA'}
            </Button>
          )}
        </div>
      </div>
    </ProfileLayout>
  )
}

export default TwoFactorAuth
