import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/weight/history
 * Get all weight entries for the user
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const entries = await prisma.weightEntry.findMany({
            where: { userId: session.user.id },
            orderBy: { date: 'desc' },
            take: 100 // Limit for performance
        })

        return NextResponse.json({ entries })
    } catch (error) {
        console.error('Weight History Error:', error)
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
    }
}
