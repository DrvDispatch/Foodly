import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Email Service - Resend Integration
 * 
 * Handles all transactional emails:
 * - Email verification
 * - Password reset
 * - Welcome emails
 */
@Injectable()
export class EmailService {
    private resend: Resend | null = null;
    private fromEmail: string;
    private frontendUrl: string;
    private isConfigured: boolean;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        this.isConfigured = !!apiKey;

        if (apiKey) {
            this.resend = new Resend(apiKey);
            console.log('[EmailService] Resend configured successfully');
        } else {
            console.warn('[EmailService] RESEND_API_KEY not configured - emails will be logged only');
        }

        this.fromEmail = this.configService.get<string>('FROM_EMAIL') || 'Foodly <noreply@send.trackwithfoodly.com>';
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    }

    /**
     * Send email verification code (6-digit)
     */
    async sendVerificationEmail(to: string, code: string, name?: string): Promise<boolean> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22c55e; font-size: 28px; margin: 0;">🍽️ Foodly</h1>
        </div>
        
        <h2 style="color: #18181b; font-size: 20px; margin-bottom: 16px; text-align: center;">Verify your email</h2>
        
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
            Hi${name ? ` ${name}` : ''},<br><br>
            Use this code to verify your email address:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px 40px; border-radius: 16px; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">
                ${code}
            </div>
        </div>
        
        <p style="color: #71717a; font-size: 14px; margin-top: 32px; text-align: center;">
            This code expires in 10 minutes.<br>
            If you didn't request this code, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Foodly. Track your nutrition with AI.
        </p>
    </div>
</body>
</html>
        `.trim();

        return this.send(to, 'Your Foodly verification code', html);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
        const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22c55e; font-size: 28px; margin: 0;">🍽️ Foodly</h1>
        </div>
        
        <h2 style="color: #18181b; font-size: 20px; margin-bottom: 16px;">Reset your password</h2>
        
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            We received a request to reset your password. Click the button below to create a new password.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Reset Password
            </a>
        </div>
        
        <p style="color: #71717a; font-size: 14px; margin-top: 32px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
            This link expires in 1 hour.<br>
            © ${new Date().getFullYear()} Foodly. Track your nutrition with AI.
        </p>
    </div>
</body>
</html>
        `.trim();

        return this.send(to, 'Reset your Foodly password', html);
    }

    /**
     * Send welcome email after verification
     */
    async sendWelcomeEmail(to: string, name?: string): Promise<boolean> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22c55e; font-size: 28px; margin: 0;">🍽️ Foodly</h1>
        </div>
        
        <h2 style="color: #18181b; font-size: 20px; margin-bottom: 16px;">Welcome to Foodly! 🎉</h2>
        
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi${name ? ` ${name}` : ''},<br><br>
            Your email has been verified and your account is ready to go! Here's what you can do with Foodly:
        </p>
        
        <ul style="color: #52525b; font-size: 15px; line-height: 1.8; padding-left: 24px;">
            <li>📸 <strong>Snap photos</strong> of your meals for AI-powered nutrition analysis</li>
            <li>📊 <strong>Track your progress</strong> with detailed charts and insights</li>
            <li>🎯 <strong>Set smart goals</strong> tailored to your body and lifestyle</li>
            <li>🤖 <strong>Get AI coaching</strong> with personalized recommendations</li>
        </ul>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${this.frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Open Foodly
            </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Foodly. Track your nutrition with AI.
        </p>
    </div>
</body>
</html>
        `.trim();

        return this.send(to, 'Welcome to Foodly! 🎉', html);
    }

    /**
     * Core send method using Resend
     */
    private async send(to: string, subject: string, html: string): Promise<boolean> {
        // Mock mode when Resend is not configured
        if (!this.resend) {
            console.log(`[EmailService] MOCK: Would send "${subject}" to ${to}`);
            console.log(`[EmailService] MOCK: From: ${this.fromEmail}`);
            return true;
        }

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [to],
                subject,
                html,
            });

            if (error) {
                console.error('[EmailService] Failed to send email:', error);
                return false;
            }

            console.log(`[EmailService] Email sent to ${to}: ${data?.id}`);
            return true;
        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
            return false;
        }
    }
}
