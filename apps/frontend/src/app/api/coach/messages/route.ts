/**
 * Coach Messages API
 * GET: Fetch messages (paginated, last 7 days by default)
 * POST: Send user question to coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCoachReply } from '@/lib/coach-ai'

// GET /api/coach/messages
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Default: last 7 days
    const daysBack = parseInt(searchParams.get('days') || '7')
    const since = new Date()
    since.setDate(since.getDate() - daysBack)
    since.setHours(0, 0, 0, 0)

    try {
        const messages = await prisma.coachMessage.findMany({
            where: {
                userId: session.user.id,
                createdAt: cursor ? undefined : { gte: since },
                ...(cursor ? { id: { lt: cursor } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })

        // Return in chronological order for display
        const chronological = messages.reverse()

        return NextResponse.json({
            messages: chronological,
            nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
        })
    } catch (error) {
        console.error('[coach/messages] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

// POST /api/coach/messages
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { question } = await request.json()
        if (!question || typeof question !== 'string') {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 })
        }

        const today = new Date().toISOString().split('T')[0]

        // Save user's question
        const userMessage = await prisma.coachMessage.create({
            data: {
                userId: session.user.id,
                role: 'user',
                type: 'question',
                content: question.trim(),
                date: today,
            },
        })

        // Get context for reply - expanded to 7 days for better history
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        const [profile, recentMessages, todayMeals, weekMeals] = await Promise.all([
            prisma.profile.findUnique({ where: { userId: session.user.id } }),
            prisma.coachMessage.findMany({
                where: { userId: session.user.id, date: today },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            prisma.meal.findMany({
                where: {
                    userId: session.user.id,
                    mealTime: {
                        gte: new Date(today + 'T00:00:00'),
                        lte: new Date(today + 'T23:59:59'),
                    },
                },
                include: {
                    snapshots: { where: { isActive: true } },
                    items: true, // Include meal items for detailed context
                },
            }),
            prisma.meal.findMany({
                where: {
                    userId: session.user.id,
                    mealTime: { gte: weekAgo },
                },
                include: {
                    snapshots: { where: { isActive: true } },
                    items: true, // Include meal items for detailed context
                },
                orderBy: { mealTime: 'desc' },
                take: 30, // Last 30 meals for context
            }),
        ])

        // Helper to build rich meal description from items
        const buildMealDescription = (meal: typeof todayMeals[0]) => {
            // If meal has items, build description from them
            if (meal.items && meal.items.length > 0) {
                const itemDescriptions = meal.items.map(item => {
                    const portion = item.portionDesc || ''
                    return portion ? `${item.name} (${portion})` : item.name
                })
                return itemDescriptions.join(', ')
            }
            // Fall back to meal description or type
            return meal.description || meal.type
        }

        // Calculate daily summary
        const daySummary = todayMeals.reduce(
            (acc, meal) => {
                const snapshot = meal.snapshots[0]
                if (snapshot) {
                    acc.calories += snapshot.calories
                    acc.protein += snapshot.protein
                    acc.carbs += snapshot.carbs
                    acc.fat += snapshot.fat
                }
                return acc
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )

        // Build rich meal context with detailed descriptions
        const mealContext = todayMeals.map(m => {
            const desc = buildMealDescription(m)
            const snapshot = m.snapshots[0]
            if (snapshot) {
                return `${desc} (${snapshot.calories} cal, ${Math.round(snapshot.protein)}g protein)`
            }
            return desc
        })

        // Add recent days summary for context
        const recentDaysSummary = weekMeals
            .filter(m => m.mealTime.toISOString().split('T')[0] !== today)
            .slice(0, 10)
            .map(m => `${m.mealTime.toISOString().split('T')[0]}: ${buildMealDescription(m)}`)
            .join('; ')

        // Generate coach reply with expanded context
        const reply = await generateCoachReply({
            question,
            profile,
            recentMessages: recentMessages.reverse(),
            daySummary,
            meals: [...mealContext, recentDaysSummary ? `[Recent days: ${recentDaysSummary}]` : ''].filter(Boolean),
        })

        // Save coach's reply
        const coachMessage = await prisma.coachMessage.create({
            data: {
                userId: session.user.id,
                role: 'coach',
                type: 'reply',
                content: reply,
                date: today,
            },
        })

        return NextResponse.json({
            userMessage,
            coachMessage,
        })
    } catch (error) {
        console.error('[coach/messages] POST Error:', error)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
}
