import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

/**
 * GET /api/momentum
 * 
 * Calculates the user's behavioral momentum score.
 * Momentum is NOT about hitting numbers - it's about direction, consistency, and showing up.
 * 
 * Returns:
 * - level: 'strong' | 'building' | 'steady' | 'starting'
 * - trend: 'up' | 'stable' | 'down'
 * - streak: days of consecutive logging
 * - weeklyChange: percentage change in momentum
 * - building: what skill/trait is being reinforced today
 * - win: today's micro-win (recognition, not praise)
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userId = session.user.id
        const now = new Date()
        const today = startOfDay(now)

        // Get user profile for goals
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        })

        if (!user?.profile) {
            return NextResponse.json({
                level: 'starting',
                trend: 'stable',
                streak: 0,
                weeklyChange: 0,
                building: null,
                win: null
            })
        }

        // Use correct profile field names
        const targetCalories = user.profile.targetCal || 2000
        const targetProtein = user.profile.proteinTarget || 150

        // Get meals for last 14 days for momentum calculation
        // Include items to calculate nutrition totals
        const twoWeeksAgo = subDays(today, 14)
        const meals = await prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: twoWeeksAgo },
                isAnalyzing: false
            },
            include: {
                items: true
            },
            orderBy: { mealTime: 'desc' }
        })

        // Group meals by day
        const dailyData: Map<string, { calories: number; protein: number; mealCount: number }> = new Map()

        meals.forEach((meal: any) => {
            const dayKey = format(meal.mealTime, 'yyyy-MM-dd')
            const existing = dailyData.get(dayKey) || { calories: 0, protein: 0, mealCount: 0 }

            // Sum nutrition from meal items
            const mealCalories = meal.items.reduce((sum: number, item: any) => sum + (item.calories || 0), 0)
            const mealProtein = meal.items.reduce((sum: number, item: any) => sum + (item.protein || 0), 0)

            dailyData.set(dayKey, {
                calories: existing.calories + mealCalories,
                protein: existing.protein + mealProtein,
                mealCount: existing.mealCount + 1
            })
        })

        // Calculate momentum factors
        const factors = {
            loggingConsistency: 0,    // How often they log (0-1)
            proteinAdherence: 0,      // How close to protein target (0-1)
            calorieStability: 0,      // How consistent calories are (0-1)
            recentActivity: 0,        // Activity in last 3 days (0-1)
            improvement: 0            // Are things getting better? (-1 to 1)
        }

        // 1. Logging Consistency (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'))
        const daysLogged7 = last7Days.filter(d => dailyData.has(d)).length
        factors.loggingConsistency = daysLogged7 / 7

        // 2. Protein Adherence (average across logged days)
        const proteinRatios = Array.from(dailyData.values()).map(d =>
            Math.min(1, d.protein / targetProtein)
        )
        factors.proteinAdherence = proteinRatios.length > 0
            ? proteinRatios.reduce((a, b) => a + b, 0) / proteinRatios.length
            : 0

        // 3. Calorie Stability (low variance = high stability)
        const calorieValues = Array.from(dailyData.values()).map(d => d.calories)
        if (calorieValues.length >= 3) {
            const mean = calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length
            const variance = calorieValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / calorieValues.length
            const cv = Math.sqrt(variance) / mean // Coefficient of variation
            factors.calorieStability = Math.max(0, 1 - cv) // Lower CV = higher stability
        }

        // 4. Recent Activity (last 3 days weighted more)
        const last3Days = Array.from({ length: 3 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'))
        const recentDaysLogged = last3Days.filter(d => dailyData.has(d)).length
        factors.recentActivity = recentDaysLogged / 3

        // 5. Improvement (compare last 7 days to previous 7)
        const prev7Days = Array.from({ length: 7 }, (_, i) => format(subDays(today, 7 + i), 'yyyy-MM-dd'))
        const daysLoggedPrev7 = prev7Days.filter(d => dailyData.has(d)).length
        factors.improvement = (daysLogged7 - daysLoggedPrev7) / 7 // -1 to 1

        // Calculate overall momentum score (0-100)
        const momentumScore = Math.round(
            (factors.loggingConsistency * 35) +
            (factors.proteinAdherence * 25) +
            (factors.calorieStability * 15) +
            (factors.recentActivity * 15) +
            ((factors.improvement + 1) / 2 * 10) // Normalize -1 to 1 → 0 to 1
        )

        // Determine level
        let level: 'strong' | 'building' | 'steady' | 'starting'
        if (momentumScore >= 70) level = 'strong'
        else if (momentumScore >= 50) level = 'building'
        else if (momentumScore >= 25) level = 'steady'
        else level = 'starting'

        // Determine trend
        let trend: 'up' | 'stable' | 'down'
        if (factors.improvement > 0.1) trend = 'up'
        else if (factors.improvement < -0.1) trend = 'down'
        else trend = 'stable'

        // Calculate streak
        let streak = 0
        for (let i = 0; i < 30; i++) {
            const dayKey = format(subDays(today, i), 'yyyy-MM-dd')
            if (dailyData.has(dayKey)) {
                streak++
            } else if (i > 0) { // Allow today to be empty
                break
            }
        }

        // Determine what they're building today
        const todayData = dailyData.get(format(today, 'yyyy-MM-dd'))
        let building: string | null = null

        if (todayData) {
            if (todayData.protein >= targetProtein * 0.8) {
                building = 'Protein Consistency'
            } else if (todayData.mealCount >= 3) {
                building = 'Structured Eating'
            } else if (Math.abs(todayData.calories - targetCalories) <= targetCalories * 0.1) {
                building = 'Caloric Awareness'
            } else {
                building = 'Logging Habit'
            }
        } else if (factors.loggingConsistency >= 0.7) {
            building = 'Consistent Tracking'
        } else {
            building = 'Foundation'
        }

        // Determine today's win (micro-validation)
        let win: string | null = null

        if (todayData) {
            if (todayData.protein >= targetProtein * 0.9) {
                win = 'Protein target within reach'
            } else if (todayData.mealCount >= 2) {
                win = 'Multiple meals logged'
            } else {
                win = 'Started logging today'
            }
        } else if (streak >= 3) {
            win = `${streak}-day logging streak active`
        } else if (factors.loggingConsistency >= 0.5) {
            win = 'Good week so far'
        }

        // Weekly change percentage
        const weeklyChange = Math.round(factors.improvement * 100)

        return NextResponse.json({
            level,
            trend,
            score: momentumScore,
            streak,
            weeklyChange,
            building,
            win,
            factors: {
                loggingConsistency: Math.round(factors.loggingConsistency * 100),
                proteinAdherence: Math.round(factors.proteinAdherence * 100),
                calorieStability: Math.round(factors.calorieStability * 100),
                recentActivity: Math.round(factors.recentActivity * 100)
            }
        })

    } catch (error) {
        console.error('Momentum Error:', error)
        return NextResponse.json({ error: 'Failed to calculate momentum' }, { status: 500 })
    }
}
