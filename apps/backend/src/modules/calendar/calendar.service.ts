import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertContextDto } from './dto';
import { format } from 'date-fns';
import { getDayKey, PATTERNS, getDominantContext, PatternType } from '../ai/calendar.util';

/**
 * Calendar Service
 * 
 * Handles:
 * - Month summary with day totals, patterns, and contexts
 * - Day context management (tags: training, travel, etc.)
 * - Pattern detection and highlighting
 */
@Injectable()
export class CalendarService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get month summary with all day data
     */
    async getMonthSummary(userId: string, month: string, pattern?: PatternType) {
        // Validate month format
        if (!/^\d{4}-\d{2}$/.test(month)) {
            throw new Error('Invalid month format (YYYY-MM)');
        }

        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        // Date range for querying meals
        const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59);

        // Get user with profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const timezone = user.profile?.timezone || 'UTC';

        // Fetch meals with snapshots
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
        });

        // Fetch contexts
        const startKey = `${month}-01`;
        const endKey = `${month}-${daysInMonth}`;

        const contexts = await this.prisma.dayContext.findMany({
            where: {
                userId,
                dayKey: { gte: startKey, lte: endKey },
            },
        });

        // Type alias for meal with snapshots
        type MealWithSnapshots = typeof meals[number];
        // Type alias for context
        type DayContextType = typeof contexts[number];

        // Aggregate meals by day
        const dayTotals: Record<string, {
            mealCount: number;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
        }> = {};

        meals.forEach((meal: MealWithSnapshots) => {
            const dayKey = format(new Date(meal.mealTime), 'yyyy-MM-dd');
            const snapshot = meal.snapshots[0];

            if (!dayTotals[dayKey]) {
                dayTotals[dayKey] = { mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
            }

            dayTotals[dayKey].mealCount++;
            if (snapshot) {
                dayTotals[dayKey].calories += snapshot.calories || 0;
                dayTotals[dayKey].protein += snapshot.protein || 0;
                dayTotals[dayKey].carbs += snapshot.carbs || 0;
                dayTotals[dayKey].fat += snapshot.fat || 0;
            }
        });

        // Transform data
        const daysMap: Record<string, any> = {};
        const contextsMap: Record<string, any> = {};
        const patternHighlight: Record<string, string> = {};

        // Stats calculation
        let activeDaysCount = 0;
        const activeDaysSet = new Set<string>();
        const todayKey = getDayKey(new Date(), timezone);

        // Goals from profile
        const targetProtein = user.profile?.proteinTarget || 150;
        const targetCarbs = user.profile?.carbTarget || 200;
        const targetCalories = user.profile?.targetCal || 2000;
        const targetFat = user.profile?.fatTarget || 70;

        // Process contexts
        contexts.forEach((ctx: DayContextType) => {
            const tags = JSON.parse(ctx.tags) as string[];
            contextsMap[ctx.dayKey] = {
                tags,
                dominant: getDominantContext(tags),
                note: ctx.note,
            };
        });

        // Process each day
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `${month}-${String(d).padStart(2, '0')}`;
            const dayData = dayTotals[dayKey];

            // Calculate goal achievement score
            let goalScore = 0;

            if (dayData && dayData.mealCount > 0) {
                const calDev = Math.abs(dayData.calories - targetCalories) / targetCalories;
                const proteinDev = Math.abs(dayData.protein - targetProtein) / targetProtein;
                const carbsDev = Math.abs(dayData.carbs - targetCarbs) / targetCarbs;
                const fatDev = Math.abs(dayData.fat - targetFat) / targetFat;

                const calScore = Math.max(0, 100 - calDev * 200);
                const proteinScore = Math.max(0, 100 - proteinDev * 200);
                const carbsScore = Math.max(0, 100 - carbsDev * 200);
                const fatScore = Math.max(0, 100 - fatDev * 200);

                goalScore = Math.round(
                    calScore * 0.4 + proteinScore * 0.3 + carbsScore * 0.15 + fatScore * 0.15,
                );

                activeDaysCount++;
                activeDaysSet.add(dayKey);
            }

            // Day status
            let status: 'on_track' | 'off_target' | 'far_off' | 'no_data' = 'no_data';
            if (dayData && dayData.mealCount > 0) {
                if (goalScore >= 70) status = 'on_track';
                else if (goalScore >= 40) status = 'off_target';
                else status = 'far_off';
            }

            daysMap[dayKey] = {
                mealCount: dayData?.mealCount || 0,
                calories: Math.round(dayData?.calories || 0),
                protein: Math.round(dayData?.protein || 0),
                carbs: Math.round(dayData?.carbs || 0),
                fat: Math.round(dayData?.fat || 0),
                dayStatus: status,
                goalScore,
            };

            // Pattern computation
            if (pattern && dayData && dayData.mealCount > 0) {
                let isHighlight = false;
                switch (pattern) {
                    case PATTERNS.LOW_PROTEIN:
                        if (dayData.protein < targetProtein * 0.7) isHighlight = true;
                        break;
                    case PATTERNS.HIGH_CARB:
                        if (dayData.carbs > targetCarbs * 1.2) isHighlight = true;
                        break;
                    case PATTERNS.ON_TRACK:
                        if (Math.abs(dayData.calories - targetCalories) < targetCalories * 0.1) isHighlight = true;
                        break;
                    case PATTERNS.OVER_TARGET:
                        if (dayData.calories > targetCalories * 1.1) isHighlight = true;
                        break;
                }
                if (isHighlight) patternHighlight[dayKey] = pattern;
            }

            // Training context check
            if (pattern === PATTERNS.TRAINING) {
                const ctx = contextsMap[dayKey];
                if (ctx?.tags?.includes('training')) {
                    patternHighlight[dayKey] = 'training';
                }
            }

            // Missed logging check
            if (pattern === PATTERNS.MISSED_LOGGING) {
                if ((!dayData || dayData.mealCount === 0) && dayKey < todayKey) {
                    patternHighlight[dayKey] = 'missed_logging';
                }
            }
        }

        // Count missed days
        let missedDaysCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `${month}-${String(d).padStart(2, '0')}`;
            if (dayKey < todayKey && daysMap[dayKey].mealCount === 0) {
                missedDaysCount++;
            }
        }

        // Calculate streak
        let currentStreak = 0;
        const checkDate = new Date();
        if (!activeDaysSet.has(todayKey)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        while (currentStreak < 365) {
            const checkKey = getDayKey(checkDate, timezone);
            if (activeDaysSet.has(checkKey)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // Count consistent weeks (>= 4 active days)
        let consistentWeeks = 0;
        let currentWeekActive = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, monthNum - 1, d);
            const dayKey = `${month}-${String(d).padStart(2, '0')}`;

            if (date.getDay() === 1) {
                if (currentWeekActive >= 4) consistentWeeks++;
                currentWeekActive = 0;
            }

            if (activeDaysSet.has(dayKey)) currentWeekActive++;

            if (d === daysInMonth && currentWeekActive >= 4) consistentWeeks++;
        }

        return {
            month,
            days: daysMap,
            contexts: contextsMap,
            patternHighlight,
            stats: {
                activeDays: activeDaysCount,
                totalDays: daysInMonth,
                missedDays: missedDaysCount,
                currentStreak,
                consistentWeeks,
            },
        };
    }

    /**
     * Upsert day context
     */
    async upsertContext(userId: string, dto: UpsertContextDto) {
        const { dayKey, tags, note } = dto;

        return this.prisma.dayContext.upsert({
            where: {
                userId_dayKey: { userId, dayKey },
            },
            create: {
                userId,
                dayKey,
                tags: JSON.stringify(tags),
                note,
            },
            update: {
                tags: JSON.stringify(tags),
                note,
            },
        });
    }

    /**
     * Delete day context
     */
    async deleteContext(userId: string, dayKey: string) {
        try {
            await this.prisma.dayContext.delete({
                where: {
                    userId_dayKey: { userId, dayKey },
                },
            });
            return { success: true };
        } catch {
            throw new NotFoundException('Context not found');
        }
    }
}
