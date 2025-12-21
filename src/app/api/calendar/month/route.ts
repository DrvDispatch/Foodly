import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDayKey, PATTERNS, getDominantContext, PatternType } from '@/lib/calendar'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // "YYYY-MM"
    const pattern = searchParams.get('pattern') as PatternType | null

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Invalid month format (YYYY-MM)' }, { status: 400 })
    }

    // Calculate day key range for the month
    const [year, monthNum] = month.split('-').map(Number)
    const daysInMonth = new Date(year, monthNum, 0).getDate()

    // Date range for querying meals
    const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0)
    const endDate = new Date(year, monthNum, 0, 23, 59, 59)

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Get user timezone
        const timezone = user.profile?.timezone || 'UTC'

        // Fetch meals with their active snapshots for the month
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
            }
        })

        // Fetch contexts for the month
        const startKey = `${month}-01`
        const endKey = `${month}-${daysInMonth}`

        const contexts = await prisma.dayContext.findMany({
            where: {
                userId: user.id,
                dayKey: { gte: startKey, lte: endKey }
            }
        })

        // Aggregate meals by day
        const dayTotals: Record<string, {
            mealCount: number,
            calories: number,
            protein: number,
            carbs: number,
            fat: number
        }> = {}

        meals.forEach((meal: any) => {
            const dayKey = format(new Date(meal.mealTime), 'yyyy-MM-dd')
            const snapshot = meal.snapshots[0]

            if (!dayTotals[dayKey]) {
                dayTotals[dayKey] = { mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
            }

            dayTotals[dayKey].mealCount++
            if (snapshot) {
                dayTotals[dayKey].calories += snapshot.calories || 0
                dayTotals[dayKey].protein += snapshot.protein || 0
                dayTotals[dayKey].carbs += snapshot.carbs || 0
                dayTotals[dayKey].fat += snapshot.fat || 0
            }
        })

        // Transform Data
        const daysMap: Record<string, any> = {}
        const contextsMap: Record<string, any> = {}
        const patternHighlight: Record<string, string> = {}

        // Stats calculation variables
        let activeDaysCount = 0
        const activeDaysSet = new Set<string>()
        const todayKey = getDayKey(new Date(), timezone)

        // 1. Process Contexts
        contexts.forEach((ctx: any) => {
            const tags = JSON.parse(ctx.tags) as string[]
            contextsMap[ctx.dayKey] = {
                tags,
                dominant: getDominantContext(tags),
                note: ctx.note
            }
        })

        // 2. Get goals for pattern calc
        const targetProtein = user.profile?.proteinTarget || 150
        const targetCarbs = user.profile?.carbTarget || 200
        const targetCalories = user.profile?.targetCal || 2000
        const targetFat = user.profile?.fatTarget || 70

        // 3. Process each day
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `${month}-${String(d).padStart(2, '0')}`
            const dayData = dayTotals[dayKey]

            // Calculate goal achievement score (0-100)
            let goalScore = 0

            if (dayData && dayData.mealCount > 0) {
                // Calculate individual macro scores (0-100 each)
                const calDev = Math.abs(dayData.calories - targetCalories) / targetCalories
                const proteinDev = Math.abs(dayData.protein - targetProtein) / targetProtein
                const carbsDev = Math.abs(dayData.carbs - targetCarbs) / targetCarbs
                const fatDev = Math.abs(dayData.fat - targetFat) / targetFat

                // Convert deviation to score (100 = perfect, 0 = 50%+ off)
                const calScore = Math.max(0, 100 - (calDev * 200))
                const proteinScore = Math.max(0, 100 - (proteinDev * 200))
                const carbsScore = Math.max(0, 100 - (carbsDev * 200))
                const fatScore = Math.max(0, 100 - (fatDev * 200))

                // Weighted average: Calories 40%, Protein 30%, Carbs 15%, Fat 15%
                goalScore = Math.round(
                    calScore * 0.4 +
                    proteinScore * 0.3 +
                    carbsScore * 0.15 +
                    fatScore * 0.15
                )

                activeDaysCount++
                activeDaysSet.add(dayKey)
            }

            // Enhanced Day Status (4 levels)
            let status: 'on_track' | 'off_target' | 'far_off' | 'no_data' = 'no_data'
            if (dayData && dayData.mealCount > 0) {
                if (goalScore >= 70) {
                    status = 'on_track'
                } else if (goalScore >= 40) {
                    status = 'off_target'
                } else {
                    status = 'far_off'
                }
            }

            daysMap[dayKey] = {
                mealCount: dayData?.mealCount || 0,
                calories: Math.round(dayData?.calories || 0),
                protein: Math.round(dayData?.protein || 0),
                carbs: Math.round(dayData?.carbs || 0),
                fat: Math.round(dayData?.fat || 0),
                dayStatus: status,
                goalScore
            }

            // Pattern Computation
            if (pattern && dayData && dayData.mealCount > 0) {
                let isHighlight = false
                switch (pattern) {
                    case PATTERNS.LOW_PROTEIN:
                        if (dayData.protein < (targetProtein * 0.7)) isHighlight = true
                        break
                    case PATTERNS.HIGH_CARB:
                        if (dayData.carbs > (targetCarbs * 1.2)) isHighlight = true
                        break
                    case PATTERNS.ON_TRACK:
                        if (Math.abs(dayData.calories - targetCalories) < (targetCalories * 0.1)) isHighlight = true
                        break
                    case PATTERNS.OVER_TARGET:
                        if (dayData.calories > (targetCalories * 1.1)) isHighlight = true
                        break
                }

                if (isHighlight) {
                    patternHighlight[dayKey] = pattern
                }
            }

            // Check Training context
            if (pattern === PATTERNS.TRAINING) {
                const ctx = contextsMap[dayKey]
                if (ctx?.tags?.includes('training')) {
                    patternHighlight[dayKey] = 'training'
                }
            }

            // Check Missed Logging pattern
            if (pattern === PATTERNS.MISSED_LOGGING) {
                if (!dayData || dayData.mealCount === 0) {
                    if (dayKey < todayKey) {
                        patternHighlight[dayKey] = 'missed_logging'
                    }
                }
            }
        }

        // Count missed days (past days with no meals)
        let missedDaysCount = 0
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `${month}-${String(d).padStart(2, '0')}`
            if (dayKey < todayKey && daysMap[dayKey].mealCount === 0) {
                missedDaysCount++
            }
        }

        // Calculate Current Streak (consecutive days ending today/yesterday with meals)
        let currentStreak = 0
        let checkDate = new Date()
        // If today has no meals yet, start from yesterday
        if (!activeDaysSet.has(todayKey)) {
            checkDate.setDate(checkDate.getDate() - 1)
        }
        while (true) {
            const checkKey = getDayKey(checkDate, timezone)
            if (activeDaysSet.has(checkKey)) {
                currentStreak++
                checkDate.setDate(checkDate.getDate() - 1)
            } else {
                break
            }
            // Safety limit
            if (currentStreak > 365) break
        }

        // Compute Stats (Consistent Weeks: >= 4 active days)
        let consistentWeeks = 0
        let currentWeekActive = 0
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, monthNum - 1, d)
            const dayKey = `${month}-${String(d).padStart(2, '0')}`

            if (date.getDay() === 1) { // Monday reset
                if (currentWeekActive >= 4) consistentWeeks++
                currentWeekActive = 0
            }

            if (activeDaysSet.has(dayKey)) {
                currentWeekActive++
            }

            // End of month check
            if (d === daysInMonth) {
                if (currentWeekActive >= 4) consistentWeeks++
            }
        }

        return NextResponse.json({
            month,
            days: daysMap,
            contexts: contextsMap,
            patternHighlight,
            stats: {
                activeDays: activeDaysCount,
                totalDays: daysInMonth,
                missedDays: missedDaysCount,
                currentStreak,
                consistentWeeks
            }
        })

    } catch (error) {
        console.error('Calendar API Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
    }
}
