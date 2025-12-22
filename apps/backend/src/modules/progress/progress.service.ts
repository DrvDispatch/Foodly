import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDay, subDays, format } from 'date-fns';

// Rank definitions
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
];

const XP_REWARDS = {
    firstMeal: 10,
    secondMeal: 5,
    thirdMeal: 3,
    comeback: 8,
    perfectDay: 5,
};

/**
 * Progress Service
 * 
 * XP-based gamification system:
 * - Rewards showing up, not perfection
 * - Daily wins
 * - Streak bonuses
 */
@Injectable()
export class ProgressService {
    constructor(private prisma: PrismaService) { }

    private getRankForXP(totalXP: number) {
        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (totalXP >= RANKS[i].minXP) {
                const currentRank = RANKS[i];
                const nextRank = RANKS[i + 1];
                return {
                    ...currentRank,
                    nextRankXP: nextRank?.minXP || currentRank.minXP + 500,
                    isMaxRank: !nextRank,
                };
            }
        }
        return { ...RANKS[0], nextRankXP: RANKS[1].minXP, isMaxRank: false };
    }

    async getProgress(userId: string) {
        const now = new Date();
        const today = startOfDay(now);
        const todayKey = format(today, 'yyyy-MM-dd');

        // Get meals (last 90 days)
        const ninetyDaysAgo = subDays(today, 90);
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: ninetyDaysAgo },
                isAnalyzing: false,
            },
            orderBy: { mealTime: 'desc' },
        });

        // Group by day
        const dailyMeals: Map<string, number> = new Map();
        meals.forEach((meal) => {
            const dayKey = format(meal.mealTime, 'yyyy-MM-dd');
            dailyMeals.set(dayKey, (dailyMeals.get(dayKey) || 0) + 1);
        });

        // Calculate streak
        let streak = 0;
        for (let i = 0; i < 90; i++) {
            const dayKey = format(subDays(today, i), 'yyyy-MM-dd');
            if (dailyMeals.has(dayKey)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        // Check comeback bonus
        const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
        const twoDaysAgoKey = format(subDays(today, 2), 'yyyy-MM-dd');
        const hasComeback = dailyMeals.has(todayKey) &&
            !dailyMeals.has(yesterdayKey) &&
            !dailyMeals.has(twoDaysAgoKey);

        // Calculate total XP
        let totalXP = 0;
        let comebackDays = 0;

        const sortedDays = Array.from(dailyMeals.keys()).sort();

        sortedDays.forEach((dayKey, idx) => {
            const mealCount = dailyMeals.get(dayKey) || 0;

            // Comeback bonus
            if (idx > 0) {
                const prevDayKey = sortedDays[idx - 1];
                const daysBetween = Math.floor(
                    (new Date(dayKey).getTime() - new Date(prevDayKey).getTime()) / (1000 * 60 * 60 * 24),
                );
                if (daysBetween >= 2) {
                    totalXP += XP_REWARDS.comeback;
                    comebackDays++;
                }
            }

            // Meal XP (diminishing returns)
            if (mealCount >= 1) totalXP += XP_REWARDS.firstMeal;
            if (mealCount >= 2) totalXP += XP_REWARDS.secondMeal;
            if (mealCount >= 3) {
                totalXP += XP_REWARDS.thirdMeal;
                totalXP += XP_REWARDS.perfectDay;
            }
        });

        // Today's wins
        const todayMealCount = dailyMeals.get(todayKey) || 0;
        const todayWins = [
            { id: 'first_meal', label: 'Log first meal', completed: todayMealCount >= 1, xp: XP_REWARDS.firstMeal },
            { id: 'second_meal', label: 'Log second meal', completed: todayMealCount >= 2, xp: XP_REWARDS.secondMeal },
            { id: 'third_meal', label: 'Log third meal', completed: todayMealCount >= 3, xp: XP_REWARDS.thirdMeal },
        ];

        // Calculate rank
        const rankData = this.getRankForXP(totalXP);
        const xpIntoLevel = totalXP - rankData.minXP;
        const xpForLevel = rankData.nextRankXP - rankData.minXP;
        const progressPercent = rankData.isMaxRank
            ? 100
            : Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100));

        // Status message
        let statusMessage = 'Start logging to earn progress!';
        if (todayMealCount === 0 && streak > 0) {
            statusMessage = 'Log a meal to continue your streak';
        } else if (todayMealCount === 1) {
            statusMessage = '1 win today — nice start!';
        } else if (todayMealCount === 2) {
            statusMessage = '2 wins today — keep going!';
        } else if (todayMealCount >= 3) {
            statusMessage = 'Perfect day! All wins completed';
        }
        if (hasComeback) {
            statusMessage = 'Welcome back! +8 XP bonus';
        }

        return {
            rank: rankData.name,
            tier: rankData.tier,
            subLevel: rankData.level,
            icon: rankData.icon,
            totalXP,
            currentLevelXP: xpIntoLevel,
            nextLevelXP: xpForLevel,
            progressPercent,
            todayWins,
            todayMealCount,
            statusMessage,
            streak,
            hasComeback,
            totalDaysLogged: dailyMeals.size,
            comebackBonuses: comebackDays,
        };
    }
}
