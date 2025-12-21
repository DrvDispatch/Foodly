import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, subDays, format } from 'date-fns'

/**
 * GET /api/progress
 * 
 * Foodly's signature progression system.
 * Rewards SHOWING UP, not perfection.
 * 
 * Returns:
 * - rank: Current rank (Starter, Bronze I, Silver II, etc.)
 * - tier: Tier name (starter, bronze, silver, gold, platinum)
 * - subLevel: Level within tier (1, 2, 3)
 * - totalXP: Cumulative experience points
 * - currentLevelXP: XP progress within current level
 * - nextLevelXP: XP needed for next level
 * - progressPercent: 0-100 progress to next level
 * - todayWins: Array of today's completed wins
 * - streak: Current consecutive days
 * - comebackBonus: If returning after a break
 */

// Rank definitions with XP thresholds (non-linear progression)
const RANKS = [
    { tier: 'starter', level: 1, name: 'Starter', minXP: 0, icon: '○' },
    { tier: 'bronze', level: 1, name: 'Bronze I', minXP: 50, icon: '◐' },
    { tier: 'bronze', level: 2, name: 'Bronze II', minXP: 120, icon: '◐' },
    { tier: 'bronze', level: 3, name: 'Bronze III', minXP: 220, icon: '◐' },
    { tier: 'silver', level: 1, name: 'Silver I', minXP: 350, icon: '◑' },
    { tier: 'silver', level: 2, name: 'Silver II', minXP: 520, icon: '◑' },
    { tier: 'silver', level: 3, name: 'Silver III', minXP: 750, icon: '◑' },
    { tier: 'gold', level: 1, name: 'Gold I', minXP: 1050, icon: '◕' },
    { tier: 'gold', level: 2, name: 'Gold II', minXP: 1450, icon: '◕' },
    { tier: 'gold', level: 3, name: 'Gold III', minXP: 2000, icon: '◕' },
    { tier: 'platinum', level: 1, name: 'Platinum', minXP: 2800, icon: '●' },
]

// XP rewards
const XP_REWARDS = {
    firstMeal: 10,
    secondMeal: 5,
    thirdMeal: 3,
    comeback: 8,
    perfectDay: 5, // Bonus for 3+ meals
}

function getRankForXP(totalXP: number) {
    // Find the highest rank the user qualifies for
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (totalXP >= RANKS[i].minXP) {
            const currentRank = RANKS[i]
            const nextRank = RANKS[i + 1]

            return {
                ...currentRank,
                nextRankXP: nextRank?.minXP || currentRank.minXP + 500,
                isMaxRank: !nextRank
            }
        }
    }
    return { ...RANKS[0], nextRankXP: RANKS[1].minXP, isMaxRank: false }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userId = session.user.id
        const now = new Date()
        const today = startOfDay(now)
        const todayKey = format(today, 'yyyy-MM-dd')

        // Get all meals for XP calculation (last 90 days for performance)
        const ninetyDaysAgo = subDays(today, 90)
        const meals = await prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: ninetyDaysAgo },
                isAnalyzing: false
            },
            orderBy: { mealTime: 'desc' }
        })

        // Group meals by day
        const dailyMeals: Map<string, number> = new Map()
        meals.forEach((meal: any) => {
            const dayKey = format(meal.mealTime, 'yyyy-MM-dd')
            dailyMeals.set(dayKey, (dailyMeals.get(dayKey) || 0) + 1)
        })

        // Calculate streak
        let streak = 0
        for (let i = 0; i < 90; i++) {
            const dayKey = format(subDays(today, i), 'yyyy-MM-dd')
            if (dailyMeals.has(dayKey)) {
                streak++
            } else if (i > 0) {
                break
            }
        }

        // Check for comeback bonus (logged today after 2+ days break)
        const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd')
        const twoDaysAgoKey = format(subDays(today, 2), 'yyyy-MM-dd')
        const hasComeback = dailyMeals.has(todayKey) &&
            !dailyMeals.has(yesterdayKey) &&
            !dailyMeals.has(twoDaysAgoKey)

        // Calculate total XP from all logged days
        let totalXP = 0
        let comebackDays = 0

        const sortedDays = Array.from(dailyMeals.keys()).sort()
        let prevDayHadMeals = false

        sortedDays.forEach((dayKey, idx) => {
            const mealCount = dailyMeals.get(dayKey) || 0

            // Check if this is a comeback day
            if (idx > 0) {
                const prevDayKey = sortedDays[idx - 1]
                const daysBetween = Math.floor(
                    (new Date(dayKey).getTime() - new Date(prevDayKey).getTime()) / (1000 * 60 * 60 * 24)
                )
                if (daysBetween >= 2) {
                    totalXP += XP_REWARDS.comeback
                    comebackDays++
                }
            }

            // XP for meals (diminishing returns)
            if (mealCount >= 1) totalXP += XP_REWARDS.firstMeal
            if (mealCount >= 2) totalXP += XP_REWARDS.secondMeal
            if (mealCount >= 3) {
                totalXP += XP_REWARDS.thirdMeal
                totalXP += XP_REWARDS.perfectDay // Bonus
            }
        })

        // Get today's wins
        const todayMealCount = dailyMeals.get(todayKey) || 0
        const todayWins: { id: string; label: string; completed: boolean; xp: number }[] = [
            {
                id: 'first_meal',
                label: 'Log first meal',
                completed: todayMealCount >= 1,
                xp: XP_REWARDS.firstMeal
            },
            {
                id: 'second_meal',
                label: 'Log second meal',
                completed: todayMealCount >= 2,
                xp: XP_REWARDS.secondMeal
            },
            {
                id: 'third_meal',
                label: 'Log third meal',
                completed: todayMealCount >= 3,
                xp: XP_REWARDS.thirdMeal
            },
        ]

        // Calculate rank and progress
        const rankData = getRankForXP(totalXP)
        const xpIntoLevel = totalXP - rankData.minXP
        const xpForLevel = rankData.nextRankXP - rankData.minXP
        const progressPercent = rankData.isMaxRank
            ? 100
            : Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100))

        // Generate status message
        let statusMessage = 'Start logging to earn progress!'
        if (todayMealCount === 0 && streak > 0) {
            statusMessage = 'Log a meal to continue your streak'
        } else if (todayMealCount === 1) {
            statusMessage = '1 win today — nice start!'
        } else if (todayMealCount === 2) {
            statusMessage = '2 wins today — keep going!'
        } else if (todayMealCount >= 3) {
            statusMessage = 'Perfect day! All wins completed'
        }

        if (hasComeback) {
            statusMessage = 'Welcome back! +8 XP bonus'
        }

        return NextResponse.json({
            // Rank info
            rank: rankData.name,
            tier: rankData.tier,
            subLevel: rankData.level,
            icon: rankData.icon,

            // XP info
            totalXP,
            currentLevelXP: xpIntoLevel,
            nextLevelXP: xpForLevel,
            progressPercent,

            // Today
            todayWins,
            todayMealCount,
            statusMessage,

            // Streak & bonus
            streak,
            hasComeback,

            // Stats
            totalDaysLogged: dailyMeals.size,
            comebackBonuses: comebackDays,
        })

    } catch (error) {
        console.error('Progress Error:', error)
        return NextResponse.json({ error: 'Failed to calculate progress' }, { status: 500 })
    }
}
