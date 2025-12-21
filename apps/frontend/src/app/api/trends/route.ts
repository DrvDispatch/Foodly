import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * GET /api/trends
 * 
 * Returns aggregated trend data for charting.
 * Params:
 *   - range: '7d' | '30d' | '90d' | '180d'
 *   - metric: 'calories' | 'protein' | 'carbs' | 'fat' (optional, returns all if not specified)
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '30d'
    const metric = searchParams.get('metric') // Optional: focus metric

    // Parse range
    const rangeDays: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '180d': 180
    }
    const days = rangeDays[range] || 30

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get user's timezone (default UTC)
        const timezone = (user.profile as any)?.timezone || 'UTC'

        // Calculate date range
        const now = new Date()
        const endDate = endOfDay(now)
        const startDate = startOfDay(subDays(now, days - 1))

        // Fetch meals with active snapshots in range
        const meals = await prisma.meal.findMany({
            where: {
                userId: user.id,
                mealTime: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1
                }
            },
            orderBy: { mealTime: 'asc' }
        })

        // Aggregate by day
        const dailyData: Record<string, {
            date: string
            calories: number
            protein: number
            carbs: number
            fat: number
            mealCount: number
        }> = {}

        // Initialize all days in range
        for (let i = 0; i < days; i++) {
            const date = subDays(now, days - 1 - i)
            const dayKey = format(date, 'yyyy-MM-dd')
            dailyData[dayKey] = {
                date: dayKey,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                mealCount: 0
            }
        }

        // Populate with actual data
        meals.forEach(meal => {
            const dayKey = format(toZonedTime(meal.mealTime, timezone), 'yyyy-MM-dd')
            if (dailyData[dayKey]) {
                const snapshot = meal.snapshots[0]
                if (snapshot) {
                    dailyData[dayKey].calories += snapshot.calories || 0
                    dailyData[dayKey].protein += snapshot.protein || 0
                    dailyData[dayKey].carbs += snapshot.carbs || 0
                    dailyData[dayKey].fat += snapshot.fat || 0
                    dailyData[dayKey].mealCount++
                }
            }
        })

        // Convert to array sorted by date
        const dataPoints = Object.values(dailyData).sort((a, b) =>
            a.date.localeCompare(b.date)
        )

        // User's goals
        const goals = {
            calories: user.profile?.targetCal || 2000,
            protein: user.profile?.proteinTarget || 150,
            carbs: user.profile?.carbTarget || 200,
            fat: user.profile?.fatTarget || 70
        }

        // Calculate statistics for each metric
        const calculateStats = (values: number[], goal: number) => {
            const nonZeroValues = values.filter(v => v > 0)
            if (nonZeroValues.length === 0) {
                return { mean: 0, stdDev: 0, consistencyScore: 0, trend: 'stable' as const }
            }

            const sum = nonZeroValues.reduce((a, b) => a + b, 0)
            const mean = sum / nonZeroValues.length

            // Standard deviation
            const squaredDiffs = nonZeroValues.map(v => Math.pow(v - mean, 2))
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / nonZeroValues.length
            const stdDev = Math.sqrt(variance)

            // Consistency score: 100 - normalize(stdDev / goal) * 100, clamped 0-100
            // Lower std dev relative to goal = higher consistency
            const normalizedVolatility = (stdDev / goal) * 100
            const consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - normalizedVolatility)))

            // Trend: compare first half average to second half average
            const half = Math.floor(nonZeroValues.length / 2)
            if (half < 2) {
                return { mean: Math.round(mean), stdDev: Math.round(stdDev), consistencyScore, trend: 'stable' as const }
            }

            const firstHalf = nonZeroValues.slice(0, half)
            const secondHalf = nonZeroValues.slice(-half)
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

            const changePct = ((secondAvg - firstAvg) / firstAvg) * 100
            let trend: 'up' | 'down' | 'stable' = 'stable'
            if (changePct > 5) trend = 'up'
            else if (changePct < -5) trend = 'down'

            return {
                mean: Math.round(mean),
                stdDev: Math.round(stdDev),
                consistencyScore,
                trend
            }
        }

        const stats = {
            calories: calculateStats(dataPoints.map(d => d.calories), goals.calories),
            protein: calculateStats(dataPoints.map(d => d.protein), goals.protein),
            carbs: calculateStats(dataPoints.map(d => d.carbs), goals.carbs),
            fat: calculateStats(dataPoints.map(d => d.fat), goals.fat)
        }

        // Data confidence indicator
        const loggedDays = dataPoints.filter(d => d.mealCount > 0).length
        const totalDays = days
        const confidencePct = Math.round((loggedDays / totalDays) * 100)
        let confidenceLevel: 'high' | 'medium' | 'low' = 'low'
        if (confidencePct >= 80) confidenceLevel = 'high'
        else if (confidencePct >= 50) confidenceLevel = 'medium'

        return NextResponse.json({
            range,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            goals,
            dataPoints,
            stats,
            confidence: {
                loggedDays,
                totalDays,
                percentage: confidencePct,
                level: confidenceLevel
            }
        })

    } catch (error) {
        console.error('Trends API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
