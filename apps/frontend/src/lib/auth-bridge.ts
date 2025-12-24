/**
 * Auth Bridge - Exchange NextAuth session for NestJS JWT
 * 
 * This bridges NextAuth OAuth with NestJS JWT authentication:
 * 1. User logs in via NextAuth (Google OAuth or Credentials)
 * 2. After successful login, we exchange the session for a NestJS JWT
 * 3. The JWT is stored in localStorage for API calls
 */

import { setTokens, clearTokens, getAccessToken, hasValidToken } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Exchange NextAuth session for NestJS JWT
 * Call this after successful NextAuth login
 */
export async function exchangeSessionForJWT(session: {
    user?: {
        id?: string;
        email?: string | null;
        name?: string | null;
    };
    idToken?: string;
}): Promise<boolean> {
    if (!session?.user?.email) {
        console.error('[Auth Bridge] No session or email');
        return false;
    }

    // Check if we already have a valid token
    if (hasValidToken()) {
        console.log('[Auth Bridge] Already have valid token');
        return true;
    }

    try {
        let response;

        // If we have a Google ID Token, use the secure endpoint
        if (session.idToken) {
            console.log('[Auth Bridge] Using secure Google login');
            response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: session.idToken,
                }),
            });
        } else {
            console.warn('[Auth Bridge] No ID token found, falling back to legacy exchange (insecure)');
            // Fallback for credentials users (or if token missing)
            // Note: Ideally we should migrate credentials flow to direct backend login too
            response = await fetch(`${API_BASE_URL}/auth/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: session.user.email,
                    name: session.user.name,
                    sessionUserId: session.user.id,
                }),
            });
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[Auth Bridge] Login failed:', error);
            return false;
        }

        const data = await response.json();

        if (data.accessToken) {
            setTokens(data.accessToken, data.refreshToken);
            console.log('[Auth Bridge] JWT obtained successfully');
            return true;
        }

        return false;
    } catch (error) {
        console.error('[Auth Bridge] Auth error:', error);
        return false;
    }
}

/**
 * Sync auth state with NestJS backend
 * Call this on app load to ensure JWT is valid
 */
export async function syncAuthState(session: {
    user?: {
        id?: string;
        email?: string | null;
        name?: string | null;
    };
} | null): Promise<void> {
    // No session = clear tokens
    if (!session?.user) {
        clearTokens();
        return;
    }

    // Have session but no valid token = exchange
    if (!hasValidToken()) {
        await exchangeSessionForJWT(session);
    }
}

/**
 * Clear all auth state (logout)
 */
export function clearAuthState(): void {
    clearTokens();
}

/**
 * Check if user is authenticated with NestJS backend
 */
export function isAuthenticated(): boolean {
    return hasValidToken();
}

/**
 * Get auth headers for manual fetch calls
 */
export function getAuthHeaders(): HeadersInit {
    const token = getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}
