/**
 * API endpoint for generating insights using Gemini
 * 
 * POST /api/insights
 * Body: { signal, userContext, level?: 'brief' | 'detailed' }
 * Returns: { insight: string } or { error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
    generateInsightCached,
    generateDetailedInsightCached
} from '@/lib/insight-gemini'
import { InsightSignal, UserContext } from '@/lib/insights'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { signal, userContext, level = 'brief' } = body as {
            signal: InsightSignal
            userContext: UserContext
            level?: 'brief' | 'detailed'
        }

        if (!signal || !userContext) {
            return NextResponse.json(
                { error: 'Missing signal or userContext' },
                { status: 400 }
            )
        }

        // Generate insight based on level
        let insight: string | null
        if (level === 'detailed') {
            insight = await generateDetailedInsightCached(
                signal,
                userContext,
                session.user.id
            )
        } else {
            insight = await generateInsightCached(
                signal,
                userContext,
                session.user.id
            )
        }

        if (!insight) {
            return NextResponse.json(
                { insight: null, fallback: true },
                { status: 200 }
            )
        }

        return NextResponse.json({ insight })
    } catch (error) {
        console.error('[/api/insights] Error:', error)
        return NextResponse.json(
            { error: 'Failed to generate insight' },
            { status: 500 }
        )
    }
}
