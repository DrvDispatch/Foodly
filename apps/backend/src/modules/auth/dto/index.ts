import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}

export class ForgotPasswordDto {
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @IsString()
    token: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    password: string;
}

export class RefreshTokenDto {
    @IsString()
    refreshToken: string;
}

/**
 * DTO for exchanging NextAuth session for NestJS JWT
 * Used when user logs in via Google OAuth through NextAuth
 */
export class ExchangeSessionDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    sessionUserId?: string;
}

/**
 * DTO for sending verification code
 */
export class SendVerificationDto {
    @IsEmail()
    email: string;
}

/**
 * DTO for verifying email code
 */
export class VerifyCodeDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6, { message: 'Code must be 6 digits' })
    code: string;
}
