/**
 * Daily Reflection API
 * POST: Generate daily reflection if not already done today
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDailyReflection } from '@/lib/coach-ai'

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]
    const currentHour = new Date().getHours()

    // Only generate after 8pm
    if (currentHour < 20) {
        return NextResponse.json({ generated: false, reason: 'Too early' })
    }

    try {
        // Check if already generated today
        const state = await prisma.coachState.findUnique({
            where: { userId: session.user.id },
        })

        if (state?.lastReflectionDate === today) {
            return NextResponse.json({ generated: false, reason: 'Already generated' })
        }

        // Get today's meals
        const todayStart = new Date(today + 'T00:00:00')
        const todayEnd = new Date(today + 'T23:59:59')

        const [meals, profile] = await Promise.all([
            prisma.meal.findMany({
                where: {
                    userId: session.user.id,
                    mealTime: { gte: todayStart, lte: todayEnd },
                },
                include: {
                    snapshots: { where: { isActive: true } },
                },
            }),
            prisma.profile.findUnique({ where: { userId: session.user.id } }),
        ])

        if (meals.length === 0) {
            return NextResponse.json({ generated: false, reason: 'No meals today' })
        }

        // Calculate day summary
        const daySummary = meals.reduce(
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

        // Get recent reflections for context
        const recentReflections = await prisma.coachMessage.findMany({
            where: {
                userId: session.user.id,
                type: 'reflection',
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        })

        // Generate reflection
        const reflection = await generateDailyReflection({
            profile,
            daySummary,
            meals: meals.map(m => ({
                description: m.description || m.type,
                nutrition: m.snapshots[0] ? {
                    calories: m.snapshots[0].calories,
                    protein: m.snapshots[0].protein,
                    carbs: m.snapshots[0].carbs,
                    fat: m.snapshots[0].fat,
                } : null,
            })),
            recentReflections: recentReflections.map(r => r.content),
        })

        // Save reflection
        const message = await prisma.coachMessage.create({
            data: {
                userId: session.user.id,
                role: 'coach',
                type: 'reflection',
                content: reflection,
                date: today,
                daySnapshot: JSON.stringify({
                    ...daySummary,
                    mealCount: meals.length,
                    meals: meals.map(m => m.description || m.type),
                }),
            },
        })

        // Update state
        await prisma.coachState.upsert({
            where: { userId: session.user.id },
            update: { lastReflectionDate: today, hasUnread: true },
            create: { userId: session.user.id, lastReflectionDate: today, hasUnread: true },
        })

        return NextResponse.json({ generated: true, message })
    } catch (error) {
        console.error('[coach/reflection] Error:', error)
        return NextResponse.json({ error: 'Failed to generate reflection' }, { status: 500 })
    }
}
