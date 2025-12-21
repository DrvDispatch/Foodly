/**
 * Coach State API
 * GET: Get unread badge state
 * POST: Mark as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/coach/state
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        let state = await prisma.coachState.findUnique({
            where: { userId: session.user.id },
        })

        // Create state if doesn't exist
        if (!state) {
            state = await prisma.coachState.create({
                data: { userId: session.user.id },
            })
        }

        return NextResponse.json({
            hasUnread: state.hasUnread,
            lastReflectionDate: state.lastReflectionDate,
        })
    } catch (error) {
        console.error('[coach/state] Error:', error)
        return NextResponse.json({ error: 'Failed to get state' }, { status: 500 })
    }
}

// POST /api/coach/state - Mark as read
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        await prisma.coachState.upsert({
            where: { userId: session.user.id },
            update: { hasUnread: false },
            create: { userId: session.user.id, hasUnread: false },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[coach/state] POST Error:', error)
        return NextResponse.json({ error: 'Failed to update state' }, { status: 500 })
    }
}
