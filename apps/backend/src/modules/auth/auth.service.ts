import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateDemoUserId } from '@nutri/shared';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { JwtPayload } from '@nutri/shared';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    /**
     * Register a new user with email/password
     */
    async register(dto: RegisterDto) {
        const { email, password, name } = dto;

        if (password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new BadRequestException('An account with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with empty profile
        const user = await this.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                profile: {
                    create: {
                        onboarded: false,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        return {
            message: 'Account created successfully',
            user,
        };
    }

    /**
     * Login with email/password
     */
    async login(dto: LoginDto) {
        const { email, password } = dto;

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { profile: true },
        });

        if (!user) {
            throw new UnauthorizedException('No account found with this email');
        }

        // Demo users bypass password check
        if (user.isDemo) {
            return this.generateAuthResponse(user);
        }

        // Regular users need password validation
        if (!user.password) {
            throw new UnauthorizedException('No password set - use Google sign in');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }

        return this.generateAuthResponse(user);
    }

    /**
     * Create a demo session
     */
    async createDemoSession() {
        const demoEnabled = this.configService.get('DEMO_MODE_ENABLED');

        if (demoEnabled !== 'true') {
            throw new ForbiddenException('Demo mode is not enabled');
        }

        // Create a demo user
        const demoId = generateDemoUserId();
        const demoEmail = `${demoId}@demo.nutri.app`;

        const user = await this.prisma.user.create({
            data: {
                id: demoId,
                email: demoEmail,
                name: 'Demo User',
                isDemo: true,
                profile: {
                    create: {
                        sex: 'male',
                        age: 30,
                        heightCm: 175,
                        currentWeight: 75,
                        targetWeight: 70,
                        activityLevel: 'moderate',
                        goalType: 'lose',
                        weeklyPace: 0.5,
                        maintenanceCal: 2400,
                        targetCal: 1900,
                        proteinTarget: 150,
                        carbTarget: 190,
                        fatTarget: 60,
                        onboarded: true,
                        unitSystem: 'metric',
                    },
                },
                goals: {
                    create: {
                        dailyCal: 1900,
                        proteinG: 150,
                        carbsG: 190,
                        fatG: 60,
                        isActive: true,
                    },
                },
            },
            include: { profile: true },
        });

        // Create sample meals for demo
        const today = new Date();
        const meals = [
            {
                userId: user.id,
                type: 'breakfast',
                description: 'Oatmeal with berries and almond butter',
                mealTime: new Date(today.setHours(8, 30, 0, 0)),
            },
            {
                userId: user.id,
                type: 'lunch',
                description: 'Grilled chicken salad with avocado',
                mealTime: new Date(today.setHours(12, 30, 0, 0)),
            },
        ];

        for (const mealData of meals) {
            const meal = await this.prisma.meal.create({
                data: mealData,
            });

            // Create sample nutrition snapshot
            await this.prisma.nutritionSnapshot.create({
                data: {
                    mealId: meal.id,
                    version: 'ai_v1',
                    calories: mealData.type === 'breakfast' ? 420 : 550,
                    protein: mealData.type === 'breakfast' ? 15 : 45,
                    carbs: mealData.type === 'breakfast' ? 55 : 25,
                    fat: mealData.type === 'breakfast' ? 18 : 32,
                    fiber: mealData.type === 'breakfast' ? 8 : 12,
                    confidence: 0.85,
                    isActive: true,
                },
            });
        }

        return {
            message: 'Demo session created',
            ...this.generateAuthResponse(user),
        };
    }

    /**
     * Request password reset
     */
    async forgotPassword(dto: ForgotPasswordDto) {
        const { email } = dto;

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return {
                message: 'If an account exists with this email, you will receive a password reset link.',
            };
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Delete any existing reset tokens for this email
        await this.prisma.passwordResetToken.deleteMany({
            where: { email },
        });

        // Create new reset token (expires in 1 hour)
        await this.prisma.passwordResetToken.create({
            data: {
                email,
                token: hashedToken,
                expires: new Date(Date.now() + 3600000), // 1 hour
            },
        });

        // In production, send email here with reset link
        // For now, log the token (remove in production)
        console.log(`Password reset token for ${email}: ${resetToken}`);

        return {
            message: 'If an account exists with this email, you will receive a password reset link.',
        };
    }

    /**
     * Reset password with token
     */
    async resetPassword(dto: ResetPasswordDto) {
        const { token, password } = dto;

        if (password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find valid reset token
        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                token: hashedToken,
                expires: { gt: new Date() },
            },
        });

        if (!resetToken) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user password
        await this.prisma.user.update({
            where: { email: resetToken.email },
            data: { password: hashedPassword },
        });

        // Delete used reset token
        await this.prisma.passwordResetToken.delete({
            where: { id: resetToken.id },
        });

        return {
            message: 'Password reset successfully',
        };
    }

    /**
     * Validate user from JWT payload
     */
    async validateUser(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { profile: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }

    /**
     * Generate tokens and auth response
     */
    private generateAuthResponse(user: any) {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            isDemo: user.isDemo,
            onboarded: user.profile?.onboarded ?? false,
        };

        const accessToken = this.jwtService.sign(payload);

        // Refresh token with longer expiry
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '30d',
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                onboarded: user.profile?.onboarded ?? false,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken) as JwtPayload;
            const user = await this.validateUser(payload);
            return this.generateAuthResponse(user);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
