/**
 * Bootstrap API - Returns ALL core app data in ONE request
 * 
 * This is called once at app launch to hydrate the global store.
 * MUST be fast (<150ms target) - NO AI calls, NO heavy computation.
 * 
 * Returns:
 * - Profile & goals
 * - Today summary
 * - Coach unread state
 * - Latest weight
 * - Calendar month summary (light)
 * - Feature flags
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    // Not authenticated - return minimal bootstrap
    if (!session?.user?.id) {
        return NextResponse.json({
            authenticated: false,
            ready: true
        })
    }

    try {
        const userId = session.user.id
        const now = new Date()
        const today = startOfDay(now)
        const todayEnd = endOfDay(now)
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)

        // Fetch ALL core data in PARALLEL - this is the key to speed
        const [
            user,
            todayMeals,
            latestWeight,
            coachState,
            calendarSummaries,
            recentMealsCount
        ] = await Promise.all([
            // 1. User with profile
            prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true }
            }),

            // 2. Today's meals with snapshots (for summary)
            prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: today, lte: todayEnd }
                },
                include: {
                    snapshots: {
                        where: { isActive: true },
                        take: 1
                    }
                },
                orderBy: { mealTime: 'asc' }
            }),

            // 3. Latest weight entry
            prisma.weightEntry.findFirst({
                where: { userId },
                orderBy: { date: 'desc' }
            }),

            // 4. Coach unread state
            prisma.coachState.findUnique({
                where: { userId }
            }),

            // 5. Calendar summaries for current month (light)
            prisma.calendarDaySummary.findMany({
                where: {
                    userId,
                    dayKey: {
                        gte: format(monthStart, 'yyyy-MM-dd'),
                        lte: format(monthEnd, 'yyyy-MM-dd')
                    }
                }
            }),

            // 6. Streak calculation (days with meals in last 7 days)
            prisma.meal.groupBy({
                by: ['mealTime'],
                where: {
                    userId,
                    mealTime: { gte: subDays(now, 7) }
                },
                _count: true
            })
        ])

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const profile = user.profile

        // Calculate today's totals
        let totalCalories = 0
        let totalProtein = 0
        let totalCarbs = 0
        let totalFat = 0

        todayMeals.forEach((meal: any) => {
            const snapshot = meal.snapshots[0]
            if (snapshot) {
                totalCalories += snapshot.calories
                totalProtein += snapshot.protein
                totalCarbs += snapshot.carbs
                totalFat += snapshot.fat
            }
        })

        // Goals from profile
        const goals = {
            calories: profile?.targetCal || 2000,
            protein: profile?.proteinTarget || 150,
            carbs: profile?.carbTarget || 200,
            fat: profile?.fatTarget || 65
        }

        // Calculate streak
        const daysWithMeals = new Set(
            recentMealsCount.map((m: any) => format(m.mealTime, 'yyyy-MM-dd'))
        )
        let streak = 0
        for (let i = 0; i < 7; i++) {
            const checkDay = format(subDays(now, i), 'yyyy-MM-dd')
            if (daysWithMeals.has(checkDay)) {
                streak++
            } else if (i > 0) {
                break
            }
        }

        return NextResponse.json({
            authenticated: true,
            ready: true,

            // Profile
            profile: {
                id: profile?.id,
                name: user.name,
                email: user.email,
                onboarded: profile?.onboarded || false,
                goalType: profile?.goalType || 'maintenance',
                unitSystem: profile?.unitSystem || 'metric'
            },

            // Goals
            goals,

            // Today summary (pre-calculated)
            today: {
                date: format(today, 'yyyy-MM-dd'),
                mealCount: todayMeals.length,
                calories: Math.round(totalCalories),
                protein: Math.round(totalProtein * 10) / 10,
                carbs: Math.round(totalCarbs * 10) / 10,
                fat: Math.round(totalFat * 10) / 10,
                hasAnalyzing: todayMeals.some((m: any) => m.isAnalyzing)
            },

            // Weight
            weight: latestWeight ? {
                value: latestWeight.weight,
                date: latestWeight.date.toISOString()
            } : null,

            // Coach
            coach: {
                unread: coachState?.hasUnread || false
            },

            // Calendar (light summary for month view)
            calendar: {
                month: format(now, 'yyyy-MM'),
                days: calendarSummaries.map((day: any) => ({
                    date: day.dayKey,
                    calories: day.calories,
                    mealCount: day.mealCount
                }))
            },

            // Habits
            habits: {
                streak,
                daysWithMeals: daysWithMeals.size
            }
        })

    } catch (error) {
        console.error('[API /bootstrap] Error:', error)
        return NextResponse.json(
            { error: 'Bootstrap failed', ready: false },
            { status: 500 }
        )
    }
}
