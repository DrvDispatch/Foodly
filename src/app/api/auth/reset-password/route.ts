import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { token, password } = body

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')

        // Find valid reset token
        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                token: hashedToken,
                expires: { gt: new Date() },
            },
        })

        if (!resetToken) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Update user password
        await prisma.user.update({
            where: { email: resetToken.email },
            data: { password: hashedPassword },
        })

        // Delete used reset token
        await prisma.passwordResetToken.delete({
            where: { id: resetToken.id },
        })

        return NextResponse.json({
            message: 'Password reset successfully',
        })
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        )
    }
}
