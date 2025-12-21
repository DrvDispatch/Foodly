import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { subDays, format, startOfDay, endOfDay, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

/**
 * GET /api/trends/compare
 * 
 * Compares two time periods for before/after analysis.
 * Params:
 *   - preset: '14d' | '30d' (compare last N days vs previous N days)
 *   OR
 *   - period1Start, period1End, period2Start, period2End (custom ranges)
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const preset = searchParams.get('preset') // '14d' or '30d'

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const timezone = (user.profile as any)?.timezone || 'UTC'
        const now = new Date()

        // Calculate periods based on preset
        let period1Start: Date, period1End: Date, period2Start: Date, period2End: Date
        let presetLabel: string

        if (preset === '14d') {
            period1End = endOfDay(now)
            period1Start = startOfDay(subDays(now, 13))
            period2End = endOfDay(subDays(now, 14))
            period2Start = startOfDay(subDays(now, 27))
            presetLabel = 'Last 14 days vs Previous 14 days'
        } else if (preset === '30d') {
            period1End = endOfDay(now)
            period1Start = startOfDay(subDays(now, 29))
            period2End = endOfDay(subDays(now, 30))
            period2Start = startOfDay(subDays(now, 59))
            presetLabel = 'Last 30 days vs Previous 30 days'
        } else {
            // Default to 14 days
            period1End = endOfDay(now)
            period1Start = startOfDay(subDays(now, 13))
            period2End = endOfDay(subDays(now, 14))
            period2Start = startOfDay(subDays(now, 27))
            presetLabel = 'Last 14 days vs Previous 14 days'
        }

        // Fetch meals for both periods
        const [period1Meals, period2Meals] = await Promise.all([
            prisma.meal.findMany({
                where: {
                    userId: user.id,
                    mealTime: { gte: period1Start, lte: period1End }
                },
                include: {
                    snapshots: { where: { isActive: true }, take: 1 }
                }
            }),
            prisma.meal.findMany({
                where: {
                    userId: user.id,
                    mealTime: { gte: period2Start, lte: period2End }
                },
                include: {
                    snapshots: { where: { isActive: true }, take: 1 }
                }
            })
        ])

        // Aggregate each period
        const aggregatePeriod = (meals: typeof period1Meals, start: Date, end: Date) => {
            const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {}

            // Initialize days
            const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

            meals.forEach(meal => {
                const dayKey = format(toZonedTime(meal.mealTime, timezone), 'yyyy-MM-dd')
                if (!dailyTotals[dayKey]) {
                    dailyTotals[dayKey] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
                }
                const snapshot = meal.snapshots[0]
                if (snapshot) {
                    dailyTotals[dayKey].calories += snapshot.calories || 0
                    dailyTotals[dayKey].protein += snapshot.protein || 0
                    dailyTotals[dayKey].carbs += snapshot.carbs || 0
                    dailyTotals[dayKey].fat += snapshot.fat || 0
                }
            })

            const loggedDays = Object.keys(dailyTotals).length
            const values = Object.values(dailyTotals)

            if (values.length === 0) {
                return {
                    avgCalories: 0,
                    avgProtein: 0,
                    avgCarbs: 0,
                    avgFat: 0,
                    loggedDays: 0,
                    totalDays,
                    calorieVariability: 0
                }
            }

            const avgCalories = Math.round(values.reduce((s, v) => s + v.calories, 0) / values.length)
            const avgProtein = Math.round(values.reduce((s, v) => s + v.protein, 0) / values.length)
            const avgCarbs = Math.round(values.reduce((s, v) => s + v.carbs, 0) / values.length)
            const avgFat = Math.round(values.reduce((s, v) => s + v.fat, 0) / values.length)

            // Calorie variability (std dev)
            const calValues = values.map(v => v.calories)
            const calMean = calValues.reduce((a, b) => a + b, 0) / calValues.length
            const calVariance = calValues.reduce((sum, v) => sum + Math.pow(v - calMean, 2), 0) / calValues.length
            const calorieVariability = Math.round(Math.sqrt(calVariance))

            return {
                avgCalories,
                avgProtein,
                avgCarbs,
                avgFat,
                loggedDays,
                totalDays,
                calorieVariability
            }
        }

        const period1Data = aggregatePeriod(period1Meals, period1Start, period1End)
        const period2Data = aggregatePeriod(period2Meals, period2Start, period2End)

        // Calculate deltas
        const calcDelta = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0
            return Math.round(((current - previous) / previous) * 100)
        }

        return NextResponse.json({
            preset: presetLabel,
            period1: {
                label: 'Current Period',
                start: format(period1Start, 'MMM d'),
                end: format(period1End, 'MMM d'),
                ...period1Data
            },
            period2: {
                label: 'Previous Period',
                start: format(period2Start, 'MMM d'),
                end: format(period2End, 'MMM d'),
                ...period2Data
            },
            deltas: {
                calories: calcDelta(period1Data.avgCalories, period2Data.avgCalories),
                protein: calcDelta(period1Data.avgProtein, period2Data.avgProtein),
                carbs: calcDelta(period1Data.avgCarbs, period2Data.avgCarbs),
                fat: calcDelta(period1Data.avgFat, period2Data.avgFat),
                variability: calcDelta(period1Data.calorieVariability, period2Data.calorieVariability)
            }
        })

    } catch (error) {
        console.error('Trends Compare API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
