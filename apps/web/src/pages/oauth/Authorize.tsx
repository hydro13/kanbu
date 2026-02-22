/**
 * OAuth Authorization Page (Phase 19.4)
 *
 * Consent screen for OAuth 2.1 authorization flow.
 * Shows the user what permissions the client (Claude.ai) is requesting.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { useAppSelector } from '@/store';
import { selectIsAuthenticated, selectToken, selectUser } from '@/store/authSlice';
import { Loader2, Shield, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

// Scope descriptions for display
const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  read: {
    label: 'Read access',
    description: 'View your projects, tasks, and analytics',
  },
  write: {
    label: 'Write access',
    description: 'Create and update tasks, comments, and subtasks',
  },
  admin: {
    label: 'Admin access',
    description: 'Manage users, workspaces, and system settings',
  },
};

interface ClientInfo {
  client_id: string;
  client_name: string;
  client_uri?: string;
  logo_uri?: string;
  scope: string[];
}

interface OAuthError {
  error: string;
  error_description?: string;
}

export function OAuthAuthorizePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = useAppSelector(selectToken);
  const user = useAppSelector(selectUser);

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [error, setError] = useState<OAuthError | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);

  // Extract OAuth parameters
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const scope = searchParams.get('scope');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Preserve OAuth params in the return URL
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    }
  }, [isAuthenticated, navigate, location]);

  // Fetch client information
  useEffect(() => {
    if (!isAuthenticated || !clientId) return;

    async function fetchClientInfo() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(
          `${apiUrl}/oauth/authorize/client?client_id=${encodeURIComponent(clientId!)}&redirect_uri=${encodeURIComponent(redirectUri || '')}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setClientInfo(data);
        setLoading(false);
      } catch {
        setError({
          error: 'network_error',
          error_description: 'Failed to fetch client information',
        });
        setLoading(false);
      }
    }

    fetchClientInfo();
  }, [isAuthenticated, clientId, redirectUri]);

  // Validate required parameters
  useEffect(() => {
    if (
      !clientId ||
      !redirectUri ||
      !responseType ||
      !state ||
      !codeChallenge ||
      !codeChallengeMethod
    ) {
      setError({
        error: 'invalid_request',
        error_description: 'Missing required OAuth parameters',
      });
      setLoading(false);
    }
  }, [clientId, redirectUri, responseType, state, codeChallenge, codeChallengeMethod]);

  // Handle authorization approval
  const handleAuthorize = async () => {
    if (!token || !clientInfo) return;

    setAuthorizing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/oauth/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          scope: scope || 'read',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData);
        setAuthorizing(false);
        return;
      }

      const data = await response.json();
      // Redirect to the client's callback URL
      window.location.href = data.redirect_url;
    } catch {
      setError({
        error: 'network_error',
        error_description: 'Failed to complete authorization',
      });
      setAuthorizing(false);
    }
  };

  // Handle authorization denial
  const handleDeny = async () => {
    if (!redirectUri) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/oauth/authorize/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirect_uri: redirectUri,
          state: state,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirect_url;
      }
    } catch {
      // On error, just redirect with error
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'User denied authorization');
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
    }
  };

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Authorization Error</CardTitle>
            <CardDescription>{error.error}</CardDescription>
          </CardHeader>
          <CardContent>
            {error.error_description && (
              <p className="text-center text-sm text-muted-foreground">{error.error_description}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Return to Kanbu
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Get requested scopes
  const requestedScopes = scope?.split(' ').filter(Boolean) || ['read'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {clientInfo?.logo_uri ? (
              <img
                src={clientInfo.logo_uri}
                alt={clientInfo.client_name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <Shield className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">Authorize {clientInfo?.client_name}</CardTitle>
          <CardDescription>
            {clientInfo?.client_name} wants to access your Kanbu account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Logged in as */}
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <p className="text-sm font-medium">This will allow {clientInfo?.client_name} to:</p>
            <ul className="space-y-2">
              {requestedScopes.map((scopeKey) => {
                const scopeInfo = SCOPE_DESCRIPTIONS[scopeKey];
                if (!scopeInfo) return null;
                return (
                  <li key={scopeKey} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{scopeInfo.label}</p>
                      <p className="text-xs text-muted-foreground">{scopeInfo.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Client info link */}
          {clientInfo?.client_uri && (
            <div className="text-center">
              <a
                href={clientInfo.client_uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Learn more about {clientInfo.client_name}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleDeny} disabled={authorizing}>
            Deny
          </Button>
          <Button className="flex-1" onClick={handleAuthorize} disabled={authorizing}>
            {authorizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              'Allow'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
