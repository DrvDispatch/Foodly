import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/weight
 * Returns weight history for the user
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '30')

        const entries = await prisma.weightEntry.findMany({
            where: { userId: session.user.id },
            orderBy: { date: 'desc' },
            take: limit
        })

        // Get profile for target weight, goal type, and pace
        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { targetWeight: true, currentWeight: true, unitSystem: true, goalType: true, weeklyPace: true }
        })

        return NextResponse.json({
            entries,
            targetWeight: profile?.targetWeight,
            currentWeight: profile?.currentWeight,
            unitSystem: profile?.unitSystem || 'metric',
            goalType: profile?.goalType,
            weeklyPace: profile?.weeklyPace
        })

    } catch (error) {
        console.error('Weight GET Error:', error)
        return NextResponse.json({ error: 'Failed to fetch weight' }, { status: 500 })
    }
}

/**
 * POST /api/weight
 * Adds a new weight entry
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { weight, date, note } = body

        if (!weight || typeof weight !== 'number') {
            return NextResponse.json({ error: 'Weight is required' }, { status: 400 })
        }

        // Create weight entry
        const entry = await prisma.weightEntry.create({
            data: {
                userId: session.user.id,
                weight,
                date: date ? new Date(date) : new Date(),
                note: note || null
            }
        })

        // Update current weight in profile
        await prisma.profile.update({
            where: { userId: session.user.id },
            data: { currentWeight: weight }
        })

        return NextResponse.json({ success: true, entry })

    } catch (error) {
        console.error('Weight POST Error:', error)
        return NextResponse.json({ error: 'Failed to add weight' }, { status: 500 })
    }
}

/**
 * DELETE /api/weight
 * Deletes a weight entry
 */
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
        }

        await prisma.weightEntry.deleteMany({
            where: { id, userId: session.user.id }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Weight DELETE Error:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}
