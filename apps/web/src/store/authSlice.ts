/**
 * Auth Slice
 *
 * Redux state management for authentication
 *
 * ═══════════════════════════════════════════════════════════════════
 * Modified by:
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added AppRole type and selectIsAdmin selector (ADMIN-01)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// =============================================================================
// Types
// =============================================================================

export type AppRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  role: AppRole;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginPayload {
  user: {
    id: number;
    email: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    role: string; // API returns string, we cast to AppRole
  };
  accessToken: string;
  expiresAt: string;
}

// =============================================================================
// Initial State
// =============================================================================

const TOKEN_KEY = 'kanbu_token';
const USER_KEY = 'kanbu_user';
const EXPIRES_KEY = 'kanbu_expires';

function loadInitialState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_KEY);

  if (!token || !userJson || !expiresAt) {
    return {
      user: null,
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  // Check if token is expired
  if (new Date(expiresAt) < new Date()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    return {
      user: null,
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  try {
    const parsed = JSON.parse(userJson);
    // Ensure role exists (backwards compatibility with old localStorage data)
    const user: AuthUser = {
      ...parsed,
      role: (parsed.role as AppRole) || 'USER',
    };
    return {
      user,
      token,
      expiresAt,
      isAuthenticated: true,
      isLoading: false,
    };
  } catch {
    return {
      user: null,
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }
}

const initialState: AuthState = loadInitialState();

// =============================================================================
// Slice
// =============================================================================

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Login success - store user and token
     */
    loginSuccess: (state, action: PayloadAction<LoginPayload>) => {
      const { user, accessToken, expiresAt } = action.payload;
      // Cast role from API string to AppRole
      state.user = {
        ...user,
        role: user.role as AppRole,
      };
      state.token = accessToken;
      state.expiresAt = expiresAt;
      state.isAuthenticated = true;
      state.isLoading = false;

      // Persist to localStorage
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      localStorage.setItem(EXPIRES_KEY, expiresAt);
    },

    /**
     * Logout - clear auth state
     */
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.expiresAt = null;
      state.isAuthenticated = false;
      state.isLoading = false;

      // Clear localStorage
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    },

    /**
     * Update user info
     */
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
    },
  },
});

// =============================================================================
// Actions & Selectors
// =============================================================================

export const { setLoading, loginSuccess, logout, updateUser } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectIsAdmin = (state: { auth: AuthState }) => state.auth.user?.role === 'ADMIN';
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.role;

export default authSlice.reducer;
