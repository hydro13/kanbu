/*
 * NotificationSettings Page
 * Version: 1.0.0
 *
 * User notification preferences and settings.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:15 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface NotificationPreference {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  inApp: boolean
  email: boolean
}

// =============================================================================
// Default Preferences
// =============================================================================

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  {
    key: 'task_assigned',
    label: 'Task Assignments',
    description: 'When you are assigned to a task',
    icon: <UserPlus className="w-5 h-5" />,
    inApp: true,
    email: true,
  },
  {
    key: 'task_completed',
    label: 'Task Completions',
    description: 'When a task you follow is completed',
    icon: <CheckCircle className="w-5 h-5" />,
    inApp: true,
    email: false,
  },
  {
    key: 'task_due_soon',
    label: 'Due Date Reminders',
    description: 'When a task is due within 24 hours',
    icon: <Clock className="w-5 h-5" />,
    inApp: true,
    email: true,
  },
  {
    key: 'task_overdue',
    label: 'Overdue Alerts',
    description: 'When a task has passed its due date',
    icon: <AlertCircle className="w-5 h-5" />,
    inApp: true,
    email: true,
  },
  {
    key: 'comment_added',
    label: 'New Comments',
    description: 'When someone comments on your tasks',
    icon: <MessageSquare className="w-5 h-5" />,
    inApp: true,
    email: false,
  },
  {
    key: 'comment_mentioned',
    label: 'Mentions',
    description: 'When someone mentions you in a comment',
    icon: <MessageSquare className="w-5 h-5" />,
    inApp: true,
    email: true,
  },
]

// =============================================================================
// Component
// =============================================================================

export function NotificationSettings() {
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES)
  const [isSaving, setIsSaving] = useState(false)
  const [masterInApp, setMasterInApp] = useState(true)
  const [masterEmail, setMasterEmail] = useState(true)

  const handleToggle = (key: string, field: 'inApp' | 'email') => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.key === key ? { ...pref, [field]: !pref[field] } : pref
      )
    )
  }

  const handleMasterToggle = (field: 'inApp' | 'email') => {
    if (field === 'inApp') {
      const newValue = !masterInApp
      setMasterInApp(newValue)
      setPreferences((prev) =>
        prev.map((pref) => ({ ...pref, inApp: newValue }))
      )
    } else {
      const newValue = !masterEmail
      setMasterEmail(newValue)
      setPreferences((prev) =>
        prev.map((pref) => ({ ...pref, email: newValue }))
      )
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Save preferences to backend when user preferences API is implemented
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-muted-foreground" />
              <h1 className="text-section-title text-foreground">
                Notification Settings
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Master Controls */}
        <div className="bg-card rounded-card border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Master Controls
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {masterInApp ? (
                  <Bell className="w-5 h-5 text-blue-500" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    In-App Notifications
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show notifications in the app
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleMasterToggle('inApp')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  masterInApp ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    masterInApp ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${masterEmail ? 'text-blue-500' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Email Notifications
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Send notifications to your email
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleMasterToggle('email')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  masterEmail ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    masterEmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Individual Preferences */}
        <div className="bg-card rounded-card border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notification Types
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure which notifications you want to receive
            </p>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="col-span-8">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Notification Type
              </span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                In-App
              </span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Email
              </span>
            </div>
          </div>

          {/* Preference Rows */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {preferences.map((pref) => (
              <div
                key={pref.key}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
              >
                <div className="col-span-8 flex items-center gap-3">
                  <div className="text-gray-400">{pref.icon}</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {pref.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {pref.description}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => handleToggle(pref.key, 'inApp')}
                    disabled={!masterInApp}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      !masterInApp
                        ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                        : pref.inApp
                          ? 'bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        pref.inApp ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => handleToggle(pref.key, 'email')}
                    disabled={!masterEmail}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      !masterEmail
                        ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                        : pref.email
                          ? 'bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        pref.email ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
