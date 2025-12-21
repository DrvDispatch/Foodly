import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email } = body

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            )
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
        })

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({
                message: 'If an account exists with this email, you will receive a password reset link.',
            })
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex')

        // Delete any existing reset tokens for this email
        await prisma.passwordResetToken.deleteMany({
            where: { email },
        })

        // Create new reset token (expires in 1 hour)
        await prisma.passwordResetToken.create({
            data: {
                email,
                token: hashedToken,
                expires: new Date(Date.now() + 3600000), // 1 hour
            },
        })

        // In production, send email here with reset link
        // For now, log the token (remove in production)
        console.log(`Password reset token for ${email}: ${resetToken}`)

        // TODO: Send email with reset link
        // const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

        return NextResponse.json({
            message: 'If an account exists with this email, you will receive a password reset link.',
        })
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        )
    }
}
