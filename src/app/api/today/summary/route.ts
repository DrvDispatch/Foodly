/**
 * Unified Today Summary API
 * 
 * Returns ALL data needed for the Today page in ONE request:
 * - Profile & goals
 * - Meals with snapshots
 * - Daily summary (pre-calculated)
 * - Weight data
 * - Habits snapshot
 * - Cached AI insight (if available)
 * - Coach unread state
 * 
 * AI insights are NOT generated on this endpoint - they are:
 * 1. Cached in DB when meals are created/updated
 * 2. Served from cache here
 * 3. Client can trigger refresh separately if stale
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userId = session.user.id
        const url = new URL(req.url)
        const dateParam = url.searchParams.get('date')

        // Parse date or default to today
        const targetDate = dateParam ? new Date(dateParam) : new Date()
        const dayStart = startOfDay(targetDate)
        const dayEnd = endOfDay(targetDate)
        const dayKey = format(targetDate, 'yyyy-MM-dd')

        // Fetch everything in parallel for speed
        const [
            user,
            meals,
            weightEntry,
            coachState,
            recentMeals7d
        ] = await Promise.all([
            // 1. User with profile
            prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true }
            }),

            // 2. Today's meals with active snapshots
            prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: dayStart, lte: dayEnd }
                },
                include: {
                    snapshots: {
                        where: { isActive: true },
                        take: 1
                    },
                    items: true
                },
                orderBy: { mealTime: 'asc' }
            }),

            // 3. Today's weight (if any)
            prisma.weightEntry.findFirst({
                where: {
                    userId,
                    date: { gte: dayStart, lte: dayEnd }
                },
                orderBy: { date: 'desc' }
            }),

            // 4. Coach unread state
            prisma.coachState.findUnique({
                where: { userId }
            }),

            // 5. Recent meals for habits/streak (last 7 days)
            prisma.meal.groupBy({
                by: ['mealTime'],
                where: {
                    userId,
                    mealTime: { gte: subDays(new Date(), 7) }
                },
                _count: true
            })
        ])

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const profile = user.profile

        // Calculate daily summary (server-side aggregation)
        let totalCalories = 0
        let totalProtein = 0
        let totalCarbs = 0
        let totalFat = 0

        const formattedMeals = meals.map((meal: any) => {
            const snapshot = meal.snapshots[0] || null
            if (snapshot) {
                totalCalories += snapshot.calories
                totalProtein += snapshot.protein
                totalCarbs += snapshot.carbs
                totalFat += snapshot.fat
            }

            return {
                id: meal.id,
                type: meal.type,
                title: (meal as any).title || null, // May not exist yet
                description: meal.description,
                photoUrl: meal.photoUrl,
                mealTime: meal.mealTime.toISOString(),
                isAnalyzing: meal.isAnalyzing,
                activeSnapshot: snapshot ? {
                    calories: snapshot.calories,
                    protein: snapshot.protein,
                    carbs: snapshot.carbs,
                    fat: snapshot.fat,
                    confidence: snapshot.confidence
                } : null,
                items: meal.items.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    portion: item.portionDesc,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat
                }))
            }
        })

        // Goals from profile
        const goals = {
            calories: profile?.targetCal || 2000,
            protein: profile?.proteinTarget || 150,
            carbs: profile?.carbTarget || 200,
            fat: profile?.fatTarget || 65
        }

        // Calculate streak (consecutive days with meals)
        const daysWithMeals = new Set(
            recentMeals7d.map((m: any) => format(m.mealTime, 'yyyy-MM-dd'))
        )
        let streak = 0
        for (let i = 0; i < 7; i++) {
            const checkDay = format(subDays(new Date(), i), 'yyyy-MM-dd')
            if (daysWithMeals.has(checkDay)) {
                streak++
            } else if (i > 0) {
                break // Streak broken
            }
        }

        // Check if today is current day
        const today = new Date()
        const isToday = dayKey === format(today, 'yyyy-MM-dd')

        return NextResponse.json({
            // Profile
            profile: {
                onboarded: profile?.onboarded || false,
                goalType: profile?.goalType || 'maintenance',
                secondaryFocus: profile?.secondaryFocus || '[]',
                unitSystem: profile?.unitSystem || 'metric'
            },

            // Goals
            goals,

            // Meals
            meals: formattedMeals,

            // Pre-calculated summary
            summary: {
                calories: Math.round(totalCalories),
                protein: Math.round(totalProtein * 10) / 10,
                carbs: Math.round(totalCarbs * 10) / 10,
                fat: Math.round(totalFat * 10) / 10,
                mealCount: meals.length
            },

            // Weight
            weight: weightEntry ? {
                kg: weightEntry.weight,
                date: weightEntry.date.toISOString()
            } : null,

            // Habits
            habits: {
                streak,
                daysWithMeals: daysWithMeals.size,
                todayMealCount: meals.length
            },

            // Coach
            coachUnread: coachState?.hasUnread || false,

            // Metadata
            date: dayKey,
            isToday,

            // AI insight placeholder - client fetches separately if needed
            // This keeps initial load fast, AI updates async
            cachedInsight: null
        })

    } catch (error) {
        console.error('[API /today/summary] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch today summary' },
            { status: 500 }
        )
    }
}
