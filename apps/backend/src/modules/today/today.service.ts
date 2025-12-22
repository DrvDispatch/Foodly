import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

/**
 * Today Summary Response
 */
export interface TodaySummaryResponse {
    profile: {
        onboarded: boolean;
        goalType: string;
        secondaryFocus: string;
        unitSystem: string;
    };
    goals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    meals: Array<{
        id: string;
        type: string;
        title: string | null;
        description: string | null;
        photoUrl: string | null;
        mealTime: string;
        isAnalyzing: boolean;
        activeSnapshot: {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
            confidence: number;
        } | null;
        items: Array<{
            id: string;
            name: string;
            portion: string | null;
            calories: number | null;
            protein: number | null;
            carbs: number | null;
            fat: number | null;
        }>;
    }>;
    summary: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        mealCount: number;
    };
    weight: {
        kg: number;
        date: string;
    } | null;
    habits: {
        streak: number;
        daysWithMeals: number;
        todayMealCount: number;
    };
    coachUnread: boolean;
    date: string;
    isToday: boolean;
    cachedInsight: string | null;
}

/**
 * Today Service
 * 
 * Provides unified "Today Summary" data:
 * - Profile & goals
 * - Meals with snapshots
 * - Daily nutrition summary
 * - Weight data
 * - Habits/streak info
 * - Coach unread state
 * 
 * All data fetched in parallel for maximum speed.
 */
@Injectable()
export class TodayService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get unified today summary for a specific date
     */
    async getTodaySummary(userId: string, dateParam?: string): Promise<TodaySummaryResponse> {
        // Parse date or default to today
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);
        const dayKey = format(targetDate, 'yyyy-MM-dd');

        // Fetch everything in parallel for speed
        const [
            user,
            meals,
            weightEntry,
            coachState,
            recentMeals7d,
        ] = await Promise.all([
            // 1. User with profile
            this.prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true },
            }),

            // 2. Today's meals with active snapshots
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: dayStart, lte: dayEnd },
                },
                include: {
                    snapshots: {
                        where: { isActive: true },
                        take: 1,
                    },
                    items: true,
                },
                orderBy: { mealTime: 'asc' },
            }),

            // 3. Today's weight (if any)
            this.prisma.weightEntry.findFirst({
                where: {
                    userId,
                    date: { gte: dayStart, lte: dayEnd },
                },
                orderBy: { date: 'desc' },
            }),

            // 4. Coach unread state
            this.prisma.coachState.findUnique({
                where: { userId },
            }),

            // 5. Recent meals for habits/streak (last 7 days)
            this.prisma.meal.groupBy({
                by: ['mealTime'],
                where: {
                    userId,
                    mealTime: { gte: subDays(new Date(), 7) },
                },
                _count: true,
            }),
        ]);

        const profile = user?.profile;

        // Type aliases for meals
        type MealWithDetails = typeof meals[number];
        type MealItem = MealWithDetails['items'][number];
        type GroupedMeal = typeof recentMeals7d[number];

        // Calculate daily summary (server-side aggregation)
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        const formattedMeals = meals.map((meal: MealWithDetails) => {
            const snapshot = meal.snapshots[0] || null;
            if (snapshot) {
                totalCalories += snapshot.calories;
                totalProtein += snapshot.protein;
                totalCarbs += snapshot.carbs;
                totalFat += snapshot.fat;
            }

            return {
                id: meal.id,
                type: meal.type,
                title: meal.title || null,
                description: meal.description,
                photoUrl: meal.photoUrl,
                mealTime: meal.mealTime.toISOString(),
                isAnalyzing: meal.isAnalyzing,
                activeSnapshot: snapshot
                    ? {
                        calories: snapshot.calories,
                        protein: snapshot.protein,
                        carbs: snapshot.carbs,
                        fat: snapshot.fat,
                        confidence: snapshot.confidence,
                    }
                    : null,
                items: meal.items.map((item: MealItem) => ({
                    id: item.id,
                    name: item.name,
                    portion: item.portionDesc,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                })),
            };
        });

        // Goals from profile
        const goals = {
            calories: profile?.targetCal || 2000,
            protein: profile?.proteinTarget || 150,
            carbs: profile?.carbTarget || 200,
            fat: profile?.fatTarget || 65,
        };

        // Calculate streak (consecutive days with meals)
        const daysWithMeals = new Set(
            recentMeals7d.map((m: GroupedMeal) => format(m.mealTime, 'yyyy-MM-dd')),
        );
        let streak = 0;
        for (let i = 0; i < 7; i++) {
            const checkDay = format(subDays(new Date(), i), 'yyyy-MM-dd');
            if (daysWithMeals.has(checkDay)) {
                streak++;
            } else if (i > 0) {
                break; // Streak broken
            }
        }

        // Check if today is current day
        const today = new Date();
        const isToday = dayKey === format(today, 'yyyy-MM-dd');

        return {
            // Profile
            profile: {
                onboarded: profile?.onboarded || false,
                goalType: profile?.goalType || 'maintenance',
                secondaryFocus: profile?.secondaryFocus || '[]',
                unitSystem: profile?.unitSystem || 'metric',
            },

            // Goals
            goals,

            // Meals
            meals: formattedMeals,

            // Pre-calculated summary
            summary: {
                calories: Math.round(totalCalories),
                protein: Math.round(totalProtein * 10) / 10,
                carbs: Math.round(totalCarbs * 10) / 10,
                fat: Math.round(totalFat * 10) / 10,
                mealCount: meals.length,
            },

            // Weight
            weight: weightEntry
                ? {
                    kg: weightEntry.weight,
                    date: weightEntry.date.toISOString(),
                }
                : null,

            // Habits
            habits: {
                streak,
                daysWithMeals: daysWithMeals.size,
                todayMealCount: meals.length,
            },

            // Coach
            coachUnread: coachState?.hasUnread || false,

            // Metadata
            date: dayKey,
            isToday,

            // AI insight placeholder - client fetches separately if needed
            cachedInsight: null,
        };
    }
}
