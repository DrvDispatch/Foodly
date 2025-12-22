/**
 * API Client for NestJS Backend
 * 
 * Handles all communication with the NestJS backend:
 * - Base URL configuration
 * - JWT token management (localStorage)
 * - Automatic token injection
 * - Response/error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Token storage keys
const TOKEN_KEY = 'nutri_access_token';
const REFRESH_TOKEN_KEY = 'nutri_refresh_token';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Get the current access token from localStorage
 */
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the refresh token from localStorage
 */
export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store tokens in localStorage
 */
export function setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
}

/**
 * Clear all tokens (logout)
 */
export function clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if user has a valid token
 */
export function hasValidToken(): boolean {
    const token = getAccessToken();
    if (!token) return false;

    // Basic JWT expiry check (decode payload without verification)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to ms
        return Date.now() < exp;
    } catch {
        return false;
    }
}

// ============================================================================
// API CLIENT
// ============================================================================

interface ApiResponse<T> {
    data: T;
    status: number;
    ok: boolean;
}

interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}

/**
 * Make an authenticated request to the NestJS backend
 */
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth header if token exists
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 - token expired or invalid
        if (response.status === 401) {
            // Try to refresh token
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                // Retry the original request with new token
                const newToken = getAccessToken();
                (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
                const retryResponse = await fetch(url, { ...options, headers });
                const data = await retryResponse.json().catch(() => null);
                return { data, status: retryResponse.status, ok: retryResponse.ok };
            }

            // Refresh failed - clear tokens
            clearTokens();
        }

        const data = await response.json().catch(() => null);

        return {
            data,
            status: response.status,
            ok: response.ok,
        };
    } catch (error) {
        console.error('[API Client] Request failed:', error);
        throw error;
    }
}

/**
 * Try to refresh the access token
 */
async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            setTokens(data.accessToken, data.refreshToken);
            return true;
        }
    } catch (error) {
        console.error('[API Client] Token refresh failed:', error);
    }

    return false;
}

// ============================================================================
// PUBLIC API METHODS
// ============================================================================

export const apiClient = {
    /**
     * GET request
     */
    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await request<T>(endpoint, { ...options, method: 'GET' });
        if (!response.ok) {
            throw new Error((response.data as unknown as ApiError)?.message || 'Request failed');
        }
        return response.data;
    },

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
        const response = await request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error((response.data as unknown as ApiError)?.message || 'Request failed');
        }
        return response.data;
    },

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
        const response = await request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error((response.data as unknown as ApiError)?.message || 'Request failed');
        }
        return response.data;
    },

    /**
     * PUT request
     */
    async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
        const response = await request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error((response.data as unknown as ApiError)?.message || 'Request failed');
        }
        return response.data;
    },

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await request<T>(endpoint, { ...options, method: 'DELETE' });
        if (!response.ok) {
            throw new Error((response.data as unknown as ApiError)?.message || 'Request failed');
        }
        return response.data;
    },

    /**
     * Raw request (returns full response)
     */
    async raw<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        return request<T>(endpoint, options);
    },
};

// ============================================================================
// SWR FETCHER
// ============================================================================

/**
 * SWR-compatible fetcher that uses the API client
 * Use this with useSWR for authenticated requests
 */
export async function apiFetcher<T>(endpoint: string): Promise<T> {
    return apiClient.get<T>(endpoint);
}

/**
 * Create a fetcher for SWR that handles errors gracefully
 */
export function createApiFetcher<T>() {
    return async (endpoint: string): Promise<T> => {
        return apiClient.get<T>(endpoint);
    };
}

export default apiClient;
