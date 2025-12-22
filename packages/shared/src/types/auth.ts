/**
 * Authentication Types
 */

export interface JwtPayload {
    sub: string;        // User ID
    email: string;
    name: string | null;
    isDemo: boolean;
    onboarded: boolean;
    iat?: number;       // Issued at
    exp?: number;       // Expiration
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string | null;
        onboarded: boolean;
    };
    tokens: TokenPair;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    name?: string;
}
