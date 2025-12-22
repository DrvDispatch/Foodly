import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subDays } from 'date-fns';

export interface BootstrapData {
    authenticated: boolean;
    ready: boolean;
    profile?: {
        id: string | undefined;
        name: string | null;
        email: string;
        onboarded: boolean;
        goalType: string;
        unitSystem: string;
    };
    goals?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    today?: {
        date: string;
        mealCount: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        hasAnalyzing: boolean;
    };
    weight?: {
        value: number;
        date: string;
    } | null;
    coach?: {
        unread: boolean;
    };
    calendar?: {
        month: string;
        days: {
            date: string;
            calories: number;
            mealCount: number;
        }[];
    };
    habits?: {
        streak: number;
        daysWithMeals: number;
    };
}

@Injectable()
export class BootstrapService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get bootstrap data for unauthenticated users
     */
    getPublicBootstrap(): BootstrapData {
        return {
            authenticated: false,
            ready: true,
        };
    }

    /**
     * Get ALL core app data in ONE request
     * This is called once at app launch to hydrate the global store.
     * MUST be fast (<150ms target) - NO AI calls, NO heavy computation.
     */
    async getBootstrapData(userId: string): Promise<BootstrapData> {
        const now = new Date();
        const today = startOfDay(now);
        const todayEnd = endOfDay(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // Fetch ALL core data in PARALLEL - this is the key to speed
        const [
            user,
            todayMeals,
            latestWeight,
            coachState,
            calendarSummaries,
            recentMealsCount,
        ] = await Promise.all([
            // 1. User with profile
            this.prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true },
            }),

            // 2. Today's meals with snapshots (for summary)
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: today, lte: todayEnd },
                },
                include: {
                    snapshots: {
                        where: { isActive: true },
                        take: 1,
                    },
                },
                orderBy: { mealTime: 'asc' },
            }),

            // 3. Latest weight entry
            this.prisma.weightEntry.findFirst({
                where: { userId },
                orderBy: { date: 'desc' },
            }),

            // 4. Coach unread state
            this.prisma.coachState.findUnique({
                where: { userId },
            }),

            // 5. Calendar summaries for current month (light)
            this.prisma.calendarDaySummary.findMany({
                where: {
                    userId,
                    dayKey: {
                        gte: format(monthStart, 'yyyy-MM-dd'),
                        lte: format(monthEnd, 'yyyy-MM-dd'),
                    },
                },
            }),

            // 6. Streak calculation (days with meals in last 7 days)
            this.prisma.meal.groupBy({
                by: ['mealTime'],
                where: {
                    userId,
                    mealTime: { gte: subDays(now, 7) },
                },
                _count: true,
            }),
        ]);

        if (!user) {
            return {
                authenticated: false,
                ready: true,
            };
        }

        const profile = user.profile;

        // Type alias for meals with snapshots
        type MealWithSnapshots = typeof todayMeals[number];

        // Calculate today's totals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        todayMeals.forEach((meal: MealWithSnapshots) => {
            const snapshot = meal.snapshots[0];
            if (snapshot) {
                totalCalories += snapshot.calories;
                totalProtein += snapshot.protein;
                totalCarbs += snapshot.carbs;
                totalFat += snapshot.fat;
            }
        });

        // Goals from profile
        const goals = {
            calories: profile?.targetCal || 2000,
            protein: profile?.proteinTarget || 150,
            carbs: profile?.carbTarget || 200,
            fat: profile?.fatTarget || 65,
        };

        // Type alias for grouped meals
        type GroupedMeal = typeof recentMealsCount[number];
        // Type alias for calendar summaries
        type CalendarSummary = typeof calendarSummaries[number];

        // Calculate streak
        const daysWithMeals = new Set(
            recentMealsCount.map((m: GroupedMeal) => format(m.mealTime, 'yyyy-MM-dd'))
        );
        let streak = 0;
        for (let i = 0; i < 7; i++) {
            const checkDay = format(subDays(now, i), 'yyyy-MM-dd');
            if (daysWithMeals.has(checkDay)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        return {
            authenticated: true,
            ready: true,

            // Profile
            profile: {
                id: profile?.id,
                name: user.name,
                email: user.email,
                onboarded: profile?.onboarded || false,
                goalType: profile?.goalType || 'maintenance',
                unitSystem: profile?.unitSystem || 'metric',
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
                hasAnalyzing: todayMeals.some((m: MealWithSnapshots) => m.isAnalyzing),
            },

            // Weight
            weight: latestWeight
                ? {
                    value: latestWeight.weight,
                    date: latestWeight.date.toISOString(),
                }
                : null,

            // Coach
            coach: {
                unread: coachState?.hasUnread || false,
            },

            // Calendar (light summary for month view)
            calendar: {
                month: format(now, 'yyyy-MM'),
                days: calendarSummaries.map((day: CalendarSummary) => ({
                    date: day.dayKey,
                    calories: day.calories,
                    mealCount: day.mealCount,
                })),
            },

            // Habits
            habits: {
                streak,
                daysWithMeals: daysWithMeals.size,
            },
        };
    }
}
