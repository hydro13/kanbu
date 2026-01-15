/*
 * UserCreatePage Component
 * Version: 1.0.0
 *
 * Admin page for creating new users.
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

interface FormData {
  email: string
  username: string
  name: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  email?: string
  username?: string
  name?: string
  password?: string
  confirmPassword?: string
}

// =============================================================================
// Component
// =============================================================================

export function UserCreatePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      navigate('/admin/users')
    },
    onError: (error) => {
      setServerError(error.message)
    },
  })

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores and hyphens'
    }

    // Name validation
    if (!formData.name) {
      newErrors.name = 'Name is required'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!validate()) {
      return
    }

    createUser.mutate({
      email: formData.email,
      username: formData.username,
      name: formData.name,
      password: formData.password,
    })
  }

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  return (
    <AdminLayout
      title="Create User"
      description="Add a new user to the system"
    >
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server error */}
          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {serverError}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange('email')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-input'
              }`}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={handleChange('username')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.username ? 'border-red-500' : 'border-input'
              }`}
              placeholder="johndoe"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleChange('name')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-input'
              }`}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange('password')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-input'
              }`}
              placeholder="Minimum 8 characters"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.confirmPassword ? 'border-red-500' : 'border-input'
              }`}
              placeholder="Repeat password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="px-6 py-2 border border-input text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default UserCreatePage
