/*
 * User Profile Page
 * Version: 1.0.0
 *
 * Manage user profile: name, timezone, password, and account deletion.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T04:15 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { useAppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { trpc } from '../lib/trpc';
import { useNavigate } from 'react-router-dom';

// =============================================================================
// Component
// =============================================================================

export function UserProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const utils = trpc.useUtils();

  // Fetch profile
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();

  // Form states
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setTimezone(profile.timezone ?? '');
      setLanguage(profile.language ?? '');
    }
  }, [profile]);

  // Mutations
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate();
    },
  });

  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password changed successfully!');
    },
  });

  const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      dispatch(logout());
      navigate('/login');
    },
  });

  // Handlers
  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      name: name || undefined,
      timezone: timezone || undefined,
      language: language || undefined,
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      alert('Please enter your password');
      return;
    }
    if (
      !confirm(
        'Are you absolutely sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      return;
    }
    deleteAccountMutation.mutate({ password: deletePassword });
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-page-title-lg tracking-tight text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your public profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={profile.email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input value={`@${profile.username}`} disabled />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. Europe/Amsterdam"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. en, nl"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>

        {/* Account Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{profile.workspaceCount}</p>
                <p className="text-sm text-muted-foreground">Workspaces</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{profile.emailVerified ? 'Yes' : 'No'}</p>
                <p className="text-sm text-muted-foreground">Email Verified</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {profile.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </p>
                <p className="text-sm text-muted-foreground">Last Login</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password regularly for security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </CardFooter>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions - proceed with caution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-destructive">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently deactivate your account and remove access to all workspaces
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    className="max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending || !deletePassword}
                  >
                    {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
