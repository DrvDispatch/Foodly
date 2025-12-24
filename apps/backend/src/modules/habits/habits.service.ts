import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import { subDays, format, startOfDay } from 'date-fns';

/**
 * Habits Service
 * 
 * Calculates habit metrics:
 * - Active days, meal consistency
 * - Heatmap data for visualization
 * - AI-generated habit insights
 */
@Injectable()
export class HabitsService {

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    /**
     * Get habits summary for user
     */
    async getHabitsSummary(userId: string) {
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);

        // Get all meals in last 30 days
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: thirtyDaysAgo, lte: now },
            },
            orderBy: { mealTime: 'asc' },
        });

        // Type alias for meal
        type MealType = typeof meals[number];

        // Calculate active days
        const daysWithMeals = new Set<string>();
        const mealsByType: Record<string, number> = {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            snack: 0,
        };

        meals.forEach((meal: MealType) => {
            const dayKey = format(meal.mealTime, 'yyyy-MM-dd');
            daysWithMeals.add(dayKey);
            if (meal.type in mealsByType) {
                mealsByType[meal.type]++;
            }
        });

        const activeDays = daysWithMeals.size;
        const totalDays = 30;

        // Calculate meal consistency
        const mealConsistency = {
            breakfast: activeDays > 0 ? Math.round((mealsByType.breakfast / activeDays) * 100) / 100 : 0,
            lunch: activeDays > 0 ? Math.round((mealsByType.lunch / activeDays) * 100) / 100 : 0,
            dinner: activeDays > 0 ? Math.round((mealsByType.dinner / activeDays) * 100) / 100 : 0,
            snack: activeDays > 0 ? Math.round((mealsByType.snack / activeDays) * 100) / 100 : 0,
        };

        // Find most consistent meal
        const entries = Object.entries(mealConsistency).filter(([key]) => key !== 'snack');
        const mostConsistent = entries.length > 0
            ? entries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : null;

        // Generate heatmap data (last 30 days)
        const heatmap: { date: string; logged: boolean }[] = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(now, i);
            const dayKey = format(date, 'yyyy-MM-dd');
            heatmap.push({
                date: dayKey,
                logged: daysWithMeals.has(dayKey),
            });
        }

        // Calculate average days per week
        const avgDaysPerWeek = Math.round((activeDays / 30) * 7 * 10) / 10;

        // Calculate best week
        const weeklyLogging: Record<string, number> = {};
        heatmap.forEach((day) => {
            const weekNum = Math.floor((now.getTime() - new Date(day.date).getTime()) / (7 * 24 * 60 * 60 * 1000));
            const weekKey = `week-${weekNum}`;
            if (!weeklyLogging[weekKey]) weeklyLogging[weekKey] = 0;
            if (day.logged) weeklyLogging[weekKey]++;
        });

        const bestWeekEntry = Object.entries(weeklyLogging).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
        const bestWeekDays = bestWeekEntry[1];

        // Generate AI insight
        let aiInsight = '';
        try {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (apiKey) {
                const genAI = new GoogleGenAI({ apiKey });

                // Schema for AI habit insight
                const habitInsightSchema = {
                    type: Type.OBJECT,
                    properties: {
                        insight: {
                            type: Type.STRING,
                            description: 'One sentence about the user\'s logging habits. Identity-focused, not performance-focused. Max 60 chars.',
                        },
                    },
                    required: ['insight'],
                };

                const prompt = `Generate ONE short identity-focused observation (max 60 chars) about this user's logging habits. No advice.

DATA:
- Logged meals on ${activeDays} of ${totalDays} days
- Average ${avgDaysPerWeek} days per week
- Most consistent meal: ${mostConsistent || 'none'}
- Breakfast consistency: ${Math.round(mealConsistency.breakfast * 100)}%
- Lunch consistency: ${Math.round(mealConsistency.lunch * 100)}%
- Dinner consistency: ${Math.round(mealConsistency.dinner * 100)}%

EXAMPLES:
- "You log meals about ${avgDaysPerWeek} days per week"
- "Dinner is your anchor meal"
- "Weekday logging is stronger than weekends"
- "Consistency has been improving recently"

Return JSON with "insight" field.`;

                const result = await genAI.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: habitInsightSchema,
                        temperature: 0.3,
                    },
                });

                const parsed = JSON.parse(result.text || '{}');
                aiInsight = parsed.insight || '';
            }
        } catch (err) {
            console.error('[HabitsService] AI insight error:', err);
        }

        return {
            activeDays,
            totalDays,
            avgDaysPerWeek,
            mealConsistency,
            mostConsistentMeal: mostConsistent,
            bestWeekDays,
            heatmap,
            aiInsight,
            totalMeals: meals.length,
        };
    }
}
