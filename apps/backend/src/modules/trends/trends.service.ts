import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * Trend data point for a single day
 */
export interface DailyDataPoint {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
}

/**
 * Statistics for a metric
 */
export interface MetricStats {
    mean: number;
    stdDev: number;
    consistencyScore: number;
    trend: 'up' | 'down' | 'stable';
}

/**
 * Trends Service
 * 
 * Provides trend analysis:
 * - Aggregate daily nutrition data
 * - Calculate statistics per metric
 * - Compare time periods
 */
@Injectable()
export class TrendsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get trend data for a given range
     * @param userId User ID
     * @param range Range preset: '7d' | '30d' | '90d' | '180d'
     */
    async getTrends(userId: string, range: string = '30d') {
        const rangeDays: Record<string, number> = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '180d': 180,
        };
        const days = rangeDays[range] || 30;

        // Get user with profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const timezone = user.profile?.timezone || 'UTC';

        // Calculate date range
        const now = new Date();
        const endDate = endOfDay(now);
        const startDate = startOfDay(subDays(now, days - 1));

        // Fetch meals with active snapshots
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: startDate, lte: endDate },
            },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
            orderBy: { mealTime: 'asc' },
        });

        // Type alias for meal with snapshots
        type MealWithSnapshots = typeof meals[number];

        // Initialize all days in range
        const dailyData: Record<string, DailyDataPoint> = {};
        for (let i = 0; i < days; i++) {
            const date = subDays(now, days - 1 - i);
            const dayKey = format(date, 'yyyy-MM-dd');
            dailyData[dayKey] = {
                date: dayKey,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                mealCount: 0,
            };
        }

        // Populate with actual data
        meals.forEach((meal: MealWithSnapshots) => {
            const dayKey = format(toZonedTime(meal.mealTime, timezone), 'yyyy-MM-dd');
            if (dailyData[dayKey]) {
                const snapshot = meal.snapshots[0];
                if (snapshot) {
                    dailyData[dayKey].calories += snapshot.calories || 0;
                    dailyData[dayKey].protein += snapshot.protein || 0;
                    dailyData[dayKey].carbs += snapshot.carbs || 0;
                    dailyData[dayKey].fat += snapshot.fat || 0;
                    dailyData[dayKey].mealCount++;
                }
            }
        });

        // Convert to sorted array
        const dataPoints = Object.values(dailyData).sort((a, b) =>
            a.date.localeCompare(b.date),
        );

        // Goals from profile
        const goals = {
            calories: user.profile?.targetCal || 2000,
            protein: user.profile?.proteinTarget || 150,
            carbs: user.profile?.carbTarget || 200,
            fat: user.profile?.fatTarget || 70,
        };

        // Calculate stats for each metric
        const stats = {
            calories: this.calculateStats(dataPoints.map((d) => d.calories), goals.calories),
            protein: this.calculateStats(dataPoints.map((d) => d.protein), goals.protein),
            carbs: this.calculateStats(dataPoints.map((d) => d.carbs), goals.carbs),
            fat: this.calculateStats(dataPoints.map((d) => d.fat), goals.fat),
        };

        // Confidence indicator
        const loggedDays = dataPoints.filter((d) => d.mealCount > 0).length;
        const confidencePct = Math.round((loggedDays / days) * 100);
        let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
        if (confidencePct >= 80) confidenceLevel = 'high';
        else if (confidencePct >= 50) confidenceLevel = 'medium';

        return {
            range,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            goals,
            dataPoints,
            stats,
            confidence: {
                loggedDays,
                totalDays: days,
                percentage: confidencePct,
                level: confidenceLevel,
            },
        };
    }

    /**
     * Calculate statistics for a metric's values
     */
    private calculateStats(values: number[], goal: number): MetricStats {
        const nonZeroValues = values.filter((v) => v > 0);
        if (nonZeroValues.length === 0) {
            return { mean: 0, stdDev: 0, consistencyScore: 0, trend: 'stable' };
        }

        const sum = nonZeroValues.reduce((a, b) => a + b, 0);
        const mean = sum / nonZeroValues.length;

        // Standard deviation
        const squaredDiffs = nonZeroValues.map((v) => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / nonZeroValues.length;
        const stdDev = Math.sqrt(variance);

        // Consistency score
        const normalizedVolatility = (stdDev / goal) * 100;
        const consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - normalizedVolatility)));

        // Trend direction
        const half = Math.floor(nonZeroValues.length / 2);
        if (half < 2) {
            return { mean: Math.round(mean), stdDev: Math.round(stdDev), consistencyScore, trend: 'stable' };
        }

        const firstHalf = nonZeroValues.slice(0, half);
        const secondHalf = nonZeroValues.slice(-half);
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const changePct = ((secondAvg - firstAvg) / firstAvg) * 100;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (changePct > 5) trend = 'up';
        else if (changePct < -5) trend = 'down';

        return {
            mean: Math.round(mean),
            stdDev: Math.round(stdDev),
            consistencyScore,
            trend,
        };
    }

    /**
     * Compare two time periods
     * @param preset '14d' | '30d' (compare last N days vs previous N days)
     */
    async comparePeriods(userId: string, preset: string = '14d') {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const timezone = user.profile?.timezone || 'UTC';
        const now = new Date();

        // Calculate periods
        let period1Start: Date, period1End: Date, period2Start: Date, period2End: Date;
        let presetLabel: string;

        if (preset === '30d') {
            period1End = endOfDay(now);
            period1Start = startOfDay(subDays(now, 29));
            period2End = endOfDay(subDays(now, 30));
            period2Start = startOfDay(subDays(now, 59));
            presetLabel = 'Last 30 days vs Previous 30 days';
        } else {
            // Default 14d
            period1End = endOfDay(now);
            period1Start = startOfDay(subDays(now, 13));
            period2End = endOfDay(subDays(now, 14));
            period2Start = startOfDay(subDays(now, 27));
            presetLabel = 'Last 14 days vs Previous 14 days';
        }

        // Fetch meals for both periods
        const [period1Meals, period2Meals] = await Promise.all([
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: period1Start, lte: period1End },
                },
                include: {
                    snapshots: { where: { isActive: true }, take: 1 },
                },
            }),
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: period2Start, lte: period2End },
                },
                include: {
                    snapshots: { where: { isActive: true }, take: 1 },
                },
            }),
        ]);

        // Aggregate each period
        const period1Data = this.aggregatePeriod(period1Meals, period1Start, period1End, timezone);
        const period2Data = this.aggregatePeriod(period2Meals, period2Start, period2End, timezone);

        // Calculate deltas
        const calcDelta = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            preset: presetLabel,
            period1: {
                label: 'Current Period',
                start: format(period1Start, 'MMM d'),
                end: format(period1End, 'MMM d'),
                ...period1Data,
            },
            period2: {
                label: 'Previous Period',
                start: format(period2Start, 'MMM d'),
                end: format(period2End, 'MMM d'),
                ...period2Data,
            },
            deltas: {
                calories: calcDelta(period1Data.avgCalories, period2Data.avgCalories),
                protein: calcDelta(period1Data.avgProtein, period2Data.avgProtein),
                carbs: calcDelta(period1Data.avgCarbs, period2Data.avgCarbs),
                fat: calcDelta(period1Data.avgFat, period2Data.avgFat),
                variability: calcDelta(period1Data.calorieVariability, period2Data.calorieVariability),
            },
        };
    }

    /**
     * Aggregate period data
     */
    private aggregatePeriod(
        meals: Array<{ mealTime: Date; snapshots: Array<{ calories: number; protein: number; carbs: number; fat: number }> }>,
        start: Date,
        end: Date,
        timezone: string,
    ) {
        const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};

        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        meals.forEach((meal) => {
            const dayKey = format(toZonedTime(meal.mealTime, timezone), 'yyyy-MM-dd');
            if (!dailyTotals[dayKey]) {
                dailyTotals[dayKey] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
            }
            const snapshot = meal.snapshots[0];
            if (snapshot) {
                dailyTotals[dayKey].calories += snapshot.calories || 0;
                dailyTotals[dayKey].protein += snapshot.protein || 0;
                dailyTotals[dayKey].carbs += snapshot.carbs || 0;
                dailyTotals[dayKey].fat += snapshot.fat || 0;
            }
        });

        const loggedDays = Object.keys(dailyTotals).length;
        const values = Object.values(dailyTotals);

        if (values.length === 0) {
            return {
                avgCalories: 0,
                avgProtein: 0,
                avgCarbs: 0,
                avgFat: 0,
                loggedDays: 0,
                totalDays,
                calorieVariability: 0,
            };
        }

        const avgCalories = Math.round(values.reduce((s, v) => s + v.calories, 0) / values.length);
        const avgProtein = Math.round(values.reduce((s, v) => s + v.protein, 0) / values.length);
        const avgCarbs = Math.round(values.reduce((s, v) => s + v.carbs, 0) / values.length);
        const avgFat = Math.round(values.reduce((s, v) => s + v.fat, 0) / values.length);

        // Calorie variability (std dev)
        const calValues = values.map((v) => v.calories);
        const calMean = calValues.reduce((a, b) => a + b, 0) / calValues.length;
        const calVariance = calValues.reduce((sum, v) => sum + Math.pow(v - calMean, 2), 0) / calValues.length;
        const calorieVariability = Math.round(Math.sqrt(calVariance));

        return {
            avgCalories,
            avgProtein,
            avgCarbs,
            avgFat,
            loggedDays,
            totalDays,
            calorieVariability,
        };
    }
}
