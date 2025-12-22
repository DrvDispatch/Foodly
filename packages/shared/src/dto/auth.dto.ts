/**
 * Auth DTOs for request/response validation
 */

// Login
export interface LoginDto {
    email: string;
    password: string;
}

export interface LoginResponseDto {
    user: {
        id: string;
        email: string;
        name: string | null;
        onboarded: boolean;
    };
    accessToken: string;
    refreshToken: string;
}

// Register
export interface RegisterDto {
    email: string;
    password: string;
    name?: string;
}

export interface RegisterResponseDto {
    message: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
}

// Demo
export interface DemoResponseDto {
    message: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
    accessToken: string;
    refreshToken: string;
}

// Password Reset
export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    password: string;
}

export interface MessageResponseDto {
    message: string;
}

// Refresh Token
export interface RefreshTokenDto {
    refreshToken: string;
}

export interface RefreshTokenResponseDto {
    accessToken: string;
    refreshToken: string;
}
