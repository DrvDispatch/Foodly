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
        targetWeight?: number;
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
            // Micronutrients
            fiber?: number;
            vitaminD?: number;
            vitaminC?: number;
            vitaminB12?: number;
            iron?: number;
            calcium?: number;
            magnesium?: number;
            zinc?: number;
            potassium?: number;
            qualityScore?: number;
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
    weightHistory: Array<{
        kg: number;
        date: string;
    }>;
    habits: {
        streak: number;
        daysWithMeals: number;
        todayMealCount: number;
    };
    coachUnread: boolean;
    date: string;
    isToday: boolean;
    cachedInsight: string | null;
    goalAdjustment?: {
        shouldAdjust: boolean;
        currentWeight: number;
        targetWeight: number;
        difference: number;
        suggestedAction: 'cut' | 'bulk' | 'maintain';
        reason: string;
    };
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
            weightHistory,
            coachState,
            recentMeals7d,
        ] = await Promise.all([
            // 1. User with profile
            this.prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true },
            }),

            // 2. Today's meals with active snapshots (including micronutrients)
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

            // 4. Weight history (last 7 days for trend chart)
            this.prisma.weightEntry.findMany({
                where: {
                    userId,
                    date: { gte: subDays(new Date(), 7) },
                },
                orderBy: { date: 'asc' },
                take: 7,
            }),

            // 5. Coach unread state
            this.prisma.coachState.findUnique({
                where: { userId },
            }),

            // 6. Recent meals for habits/streak (last 7 days)
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
                        // Micronutrients
                        fiber: snapshot.fiber ?? undefined,
                        vitaminD: snapshot.vitaminD ?? undefined,
                        vitaminC: snapshot.vitaminC ?? undefined,
                        vitaminB12: snapshot.vitaminB12 ?? undefined,
                        iron: snapshot.iron ?? undefined,
                        calcium: snapshot.calcium ?? undefined,
                        magnesium: snapshot.magnesium ?? undefined,
                        zinc: snapshot.zinc ?? undefined,
                        potassium: snapshot.potassium ?? undefined,
                        qualityScore: snapshot.qualityScore ?? undefined,
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
                targetWeight: profile?.targetWeight ?? undefined,
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

            // Weight history for trend chart
            weightHistory: weightHistory.map(w => ({
                kg: w.weight,
                date: w.date.toISOString(),
            })),

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

            // Goal adjustment recommendation (only if we have weight data)
            goalAdjustment: (() => {
                const currentWeight = weightEntry?.weight || profile?.currentWeight;
                const targetWeight = profile?.targetWeight;
                const goalType = profile?.goalType;

                if (!currentWeight || !targetWeight || !goalType) return undefined;

                const diff = currentWeight - targetWeight;
                const threshold = Math.max(0.5, Math.abs(diff) * 0.1); // Dynamic: 10%, min 0.5kg

                if (Math.abs(diff) < threshold) return undefined; // At goal

                const isOver = diff > 0;
                const shouldAdjust = (isOver && !['lose', 'fat_loss'].includes(goalType)) ||
                    (!isOver && !['gain', 'muscle_gain'].includes(goalType));

                if (!shouldAdjust) return undefined;

                return {
                    shouldAdjust: true,
                    currentWeight,
                    targetWeight,
                    difference: diff,
                    suggestedAction: isOver ? 'cut' : 'bulk' as const,
                    reason: isOver
                        ? `You're ${diff.toFixed(1)}kg over target. Consider a cutting phase.`
                        : `You're ${Math.abs(diff).toFixed(1)}kg under target. Consider a bulking phase.`,
                };
            })(),
        };
    }
}
