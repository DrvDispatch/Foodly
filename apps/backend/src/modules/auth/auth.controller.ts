import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto, ExchangeSessionDto } from './dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * POST /api/auth/register
     * Register a new user with email/password
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    /**
     * POST /api/auth/login
     * Login with email/password
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    /**
     * POST /api/auth/demo
     * Create a demo session
     */
    @Post('demo')
    @HttpCode(HttpStatus.OK)
    async demo() {
        return this.authService.createDemoSession();
    }

    /**
     * POST /api/auth/forgot-password
     * Request password reset email
     */
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    /**
     * POST /api/auth/reset-password
     * Reset password with token
     */
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    /**
     * POST /api/auth/refresh
     * Refresh access token
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto.refreshToken);
    }

    /**
     * POST /api/auth/exchange
     * Exchange NextAuth session for NestJS JWT
     * Used for OAuth users (Google) who authenticate via NextAuth
     */
    @Post('exchange')
    @HttpCode(HttpStatus.OK)
    async exchange(@Body() dto: ExchangeSessionDto) {
        return this.authService.exchangeSession(dto);
    }
    /**
     * POST /api/auth/google
     * Login with Google ID Token (Secure)
     */
    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleLogin(@Body() dto: { token: string }) {
        return this.authService.googleLogin(dto.token);
    }
}
