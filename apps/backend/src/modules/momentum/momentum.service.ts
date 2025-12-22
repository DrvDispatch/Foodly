import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDay, subDays, format } from 'date-fns';

/**
 * Momentum Service
 * 
 * Calculates behavioral momentum score:
 * - NOT about hitting numbers
 * - About direction, consistency, and showing up
 */
@Injectable()
export class MomentumService {
    constructor(private prisma: PrismaService) { }

    async getMomentum(userId: string) {
        const now = new Date();
        const today = startOfDay(now);

        // Get user profile for goals
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user?.profile) {
            return {
                level: 'starting',
                trend: 'stable',
                streak: 0,
                weeklyChange: 0,
                building: null,
                win: null,
            };
        }

        const targetCalories = user.profile.targetCal || 2000;
        const targetProtein = user.profile.proteinTarget || 150;

        // Get meals for last 14 days
        const twoWeeksAgo = subDays(today, 14);
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: twoWeeksAgo },
                isAnalyzing: false,
            },
            include: { items: true },
            orderBy: { mealTime: 'desc' },
        });

        // Type alias for meal with items
        type MealWithItems = typeof meals[number];
        type MealItem = MealWithItems['items'][number];

        // Group meals by day
        const dailyData: Map<string, { calories: number; protein: number; mealCount: number }> = new Map();

        meals.forEach((meal: MealWithItems) => {
            const dayKey = format(meal.mealTime, 'yyyy-MM-dd');
            const existing = dailyData.get(dayKey) || { calories: 0, protein: 0, mealCount: 0 };

            const mealCalories = meal.items.reduce((sum: number, item: MealItem) => sum + (item.calories || 0), 0);
            const mealProtein = meal.items.reduce((sum: number, item: MealItem) => sum + (item.protein || 0), 0);

            dailyData.set(dayKey, {
                calories: existing.calories + mealCalories,
                protein: existing.protein + mealProtein,
                mealCount: existing.mealCount + 1,
            });
        });

        // Calculate momentum factors
        const factors = {
            loggingConsistency: 0,
            proteinAdherence: 0,
            calorieStability: 0,
            recentActivity: 0,
            improvement: 0,
        };

        // 1. Logging Consistency (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'));
        const daysLogged7 = last7Days.filter((d) => dailyData.has(d)).length;
        factors.loggingConsistency = daysLogged7 / 7;

        // 2. Protein Adherence
        const proteinRatios = Array.from(dailyData.values()).map((d) =>
            Math.min(1, d.protein / targetProtein),
        );
        factors.proteinAdherence = proteinRatios.length > 0
            ? proteinRatios.reduce((a, b) => a + b, 0) / proteinRatios.length
            : 0;

        // 3. Calorie Stability
        const calorieValues = Array.from(dailyData.values()).map((d) => d.calories);
        if (calorieValues.length >= 3) {
            const mean = calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length;
            const variance = calorieValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / calorieValues.length;
            const cv = Math.sqrt(variance) / mean;
            factors.calorieStability = Math.max(0, 1 - cv);
        }

        // 4. Recent Activity (last 3 days)
        const last3Days = Array.from({ length: 3 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'));
        const recentDaysLogged = last3Days.filter((d) => dailyData.has(d)).length;
        factors.recentActivity = recentDaysLogged / 3;

        // 5. Improvement
        const prev7Days = Array.from({ length: 7 }, (_, i) => format(subDays(today, 7 + i), 'yyyy-MM-dd'));
        const daysLoggedPrev7 = prev7Days.filter((d) => dailyData.has(d)).length;
        factors.improvement = (daysLogged7 - daysLoggedPrev7) / 7;

        // Calculate score (0-100)
        const momentumScore = Math.round(
            (factors.loggingConsistency * 35) +
            (factors.proteinAdherence * 25) +
            (factors.calorieStability * 15) +
            (factors.recentActivity * 15) +
            ((factors.improvement + 1) / 2 * 10),
        );

        // Determine level
        let level: 'strong' | 'building' | 'steady' | 'starting';
        if (momentumScore >= 70) level = 'strong';
        else if (momentumScore >= 50) level = 'building';
        else if (momentumScore >= 25) level = 'steady';
        else level = 'starting';

        // Determine trend
        let trend: 'up' | 'stable' | 'down';
        if (factors.improvement > 0.1) trend = 'up';
        else if (factors.improvement < -0.1) trend = 'down';
        else trend = 'stable';

        // Calculate streak
        let streak = 0;
        for (let i = 0; i < 30; i++) {
            const dayKey = format(subDays(today, i), 'yyyy-MM-dd');
            if (dailyData.has(dayKey)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        // Determine building trait
        const todayData = dailyData.get(format(today, 'yyyy-MM-dd'));
        let building: string | null = null;

        if (todayData) {
            if (todayData.protein >= targetProtein * 0.8) {
                building = 'Protein Consistency';
            } else if (todayData.mealCount >= 3) {
                building = 'Structured Eating';
            } else if (Math.abs(todayData.calories - targetCalories) <= targetCalories * 0.1) {
                building = 'Caloric Awareness';
            } else {
                building = 'Logging Habit';
            }
        } else if (factors.loggingConsistency >= 0.7) {
            building = 'Consistent Tracking';
        } else {
            building = 'Foundation';
        }

        // Determine win
        let win: string | null = null;
        if (todayData) {
            if (todayData.protein >= targetProtein * 0.9) {
                win = 'Protein target within reach';
            } else if (todayData.mealCount >= 2) {
                win = 'Multiple meals logged';
            } else {
                win = 'Started logging today';
            }
        } else if (streak >= 3) {
            win = `${streak}-day logging streak active`;
        } else if (factors.loggingConsistency >= 0.5) {
            win = 'Good week so far';
        }

        return {
            level,
            trend,
            score: momentumScore,
            streak,
            weeklyChange: Math.round(factors.improvement * 100),
            building,
            win,
            factors: {
                loggingConsistency: Math.round(factors.loggingConsistency * 100),
                proteinAdherence: Math.round(factors.proteinAdherence * 100),
                calorieStability: Math.round(factors.calorieStability * 100),
                recentActivity: Math.round(factors.recentActivity * 100),
            },
        };
    }
}
