import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * DELETE /api/account/delete
 * Deletes user account and all associated data
 */
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { confirmation } = body

        // Require explicit confirmation
        if (confirmation !== 'DELETE MY ACCOUNT') {
            return NextResponse.json({
                error: 'Confirmation phrase required'
            }, { status: 400 })
        }

        // Delete user (cascades to all related data due to onDelete: Cascade)
        await prisma.user.delete({
            where: { id: session.user.id }
        })

        return NextResponse.json({
            success: true,
            message: 'Account deleted successfully'
        })

    } catch (error) {
        console.error('Account Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }
}
