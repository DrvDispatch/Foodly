import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * Timeline meal with running totals
 */
interface TimelineMeal {
    id: string;
    time: string;
    type: string;
    photoUrl: string | null;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    macroBias: 'balanced' | 'carb-heavy' | 'protein-rich' | 'fat-forward';
    runningTotal: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    isFirst: boolean;
    isLast: boolean;
}

/**
 * Timeline Service
 * 
 * Returns meals for a specific date with:
 * - Running totals (cumulative nutrition)
 * - Macro bias classification per meal
 * - AI-generated daily reflection
 */
@Injectable()
export class TimelineService {
    private readonly MODEL_NAME = 'gemini-3-flash-preview';

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async getTimeline(userId: string, date: string) {
        // Get user with profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Parse date
        const targetDate = new Date(date);
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        // Fetch meals for this date
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: dayStart, lte: dayEnd },
            },
            include: {
                snapshots: { where: { isActive: true }, take: 1 },
            },
            orderBy: { mealTime: 'asc' },
        });

        // Calculate running totals
        let runningCalories = 0;
        let runningProtein = 0;
        let runningCarbs = 0;
        let runningFat = 0;

        const timelineMeals: TimelineMeal[] = meals.map((meal, index) => {
            const snapshot = meal.snapshots[0];
            const calories = snapshot?.calories || 0;
            const protein = snapshot?.protein || 0;
            const carbs = snapshot?.carbs || 0;
            const fat = snapshot?.fat || 0;

            runningCalories += calories;
            runningProtein += protein;
            runningCarbs += carbs;
            runningFat += fat;

            // Determine macro bias
            const total = protein + carbs + fat;
            const proteinPct = total > 0 ? (protein / total) * 100 : 0;
            const carbsPct = total > 0 ? (carbs / total) * 100 : 0;
            const fatPct = total > 0 ? (fat / total) * 100 : 0;

            let macroBias: TimelineMeal['macroBias'] = 'balanced';
            if (carbsPct > 50) macroBias = 'carb-heavy';
            else if (proteinPct > 40) macroBias = 'protein-rich';
            else if (fatPct > 40) macroBias = 'fat-forward';

            return {
                id: meal.id,
                time: format(meal.mealTime, 'hh:mm a'),
                type: meal.type,
                photoUrl: meal.photoUrl,
                description: meal.description || '',
                calories,
                protein,
                carbs,
                fat,
                macroBias,
                runningTotal: {
                    calories: runningCalories,
                    protein: runningProtein,
                    carbs: runningCarbs,
                    fat: runningFat,
                },
                isFirst: index === 0,
                isLast: index === meals.length - 1,
            };
        });

        // Goals
        const calorieTarget = user.profile?.targetCal || 2000;
        const proteinTarget = user.profile?.proteinTarget || 150;

        // Generate AI reflection
        let aiReflection = '';
        if (timelineMeals.length > 0) {
            try {
                const apiKey = this.configService.get<string>('GEMINI_API_KEY');
                if (apiKey) {
                    // Calculate meal timing patterns
                    const morningCals = timelineMeals
                        .filter((m) => {
                            const hour = parseInt(m.time.split(':')[0], 10);
                            const isPM = m.time.includes('PM');
                            const actualHour = isPM && hour !== 12 ? hour + 12 : hour;
                            return actualHour < 12;
                        })
                        .reduce((sum, m) => sum + m.calories, 0);

                    const afternoonCals = timelineMeals
                        .filter((m) => {
                            const hour = parseInt(m.time.split(':')[0], 10);
                            const isPM = m.time.includes('PM');
                            const actualHour = isPM && hour !== 12 ? hour + 12 : hour;
                            return actualHour >= 12 && actualHour < 17;
                        })
                        .reduce((sum, m) => sum + m.calories, 0);

                    const eveningCals = timelineMeals
                        .filter((m) => {
                            const hour = parseInt(m.time.split(':')[0], 10);
                            const isPM = m.time.includes('PM');
                            const actualHour = isPM && hour !== 12 ? hour + 12 : hour;
                            return actualHour >= 17;
                        })
                        .reduce((sum, m) => sum + m.calories, 0);

                    const genAI = new GoogleGenAI({ apiKey });

                    const prompt = `Generate ONE short observation (max 80 chars) about this day's eating pattern. No advice.

DATA:
- Total meals: ${timelineMeals.length}
- Total calories: ${runningCalories} (target: ${calorieTarget})
- Morning calories (before noon): ${morningCals}
- Afternoon calories (12-5pm): ${afternoonCals}
- Evening calories (after 5pm): ${eveningCals}
- Protein total: ${runningProtein}g (target: ${proteinTarget}g)

EXAMPLES:
- "Calories were front-loaded, leaving flexibility for dinner."
- "Most intake came in the evening hours."
- "Protein was spread evenly across meals."

Return JSON with "reflection" field.`;

                    const result = await genAI.models.generateContent({
                        model: this.MODEL_NAME,
                        contents: prompt,
                        config: {
                            responseMimeType: 'application/json',
                            temperature: 0.3,
                        },
                    });

                    const parsed = JSON.parse(result.text || '{}');
                    aiReflection = parsed.reflection || '';
                }
            } catch (err) {
                console.error('[TimelineService] AI reflection error:', err);
            }
        }

        return {
            date,
            meals: timelineMeals,
            totals: {
                calories: runningCalories,
                protein: runningProtein,
                carbs: runningCarbs,
                fat: runningFat,
            },
            targets: {
                calories: calorieTarget,
                protein: proteinTarget,
            },
            aiReflection,
            mealCount: timelineMeals.length,
        };
    }
}
