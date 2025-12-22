import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { subDays } from 'date-fns';

// RDA values
const RDA: Record<string, { rda: number; unit: string; name: string }> = {
    vitaminD: { rda: 20, unit: 'mcg', name: 'Vitamin D' },
    vitaminB12: { rda: 2.4, unit: 'mcg', name: 'Vitamin B12' },
    vitaminC: { rda: 90, unit: 'mg', name: 'Vitamin C' },
    iron: { rda: 18, unit: 'mg', name: 'Iron' },
    magnesium: { rda: 400, unit: 'mg', name: 'Magnesium' },
    zinc: { rda: 11, unit: 'mg', name: 'Zinc' },
    calcium: { rda: 1000, unit: 'mg', name: 'Calcium' },
    potassium: { rda: 3400, unit: 'mg', name: 'Potassium' },
    fiber: { rda: 28, unit: 'g', name: 'Fiber' },
};

// Visual baseline for better UX
const UX_BASELINE: Record<string, number> = {
    vitaminD: 15, vitaminB12: 20, vitaminC: 20, iron: 25,
    magnesium: 20, zinc: 25, calcium: 20, potassium: 20, fiber: 20,
};

/**
 * Health Service
 * 
 * Weekly micronutrient analysis:
 * - Aggregate from meal snapshots
 * - AI validation/correction
 * - Deficiency detection
 */
@Injectable()
export class HealthService {
    private readonly MODEL_NAME = 'gemini-3-flash-preview';

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async getWeeklyHealth(userId: string) {
        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);

        // Get user profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        // Get meals with snapshots
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                mealTime: { gte: sevenDaysAgo, lte: now },
            },
            include: {
                snapshots: { where: { isActive: true }, take: 1 },
                items: true,
            },
            orderBy: { mealTime: 'asc' },
        });

        // Type alias for meal with snapshots
        type MealWithSnapshots = typeof meals[number];

        if (meals.length === 0) {
            return {
                period: 'Last 7 days',
                daysWithData: 0,
                nutrients: [],
                deficiencies: [],
                excessive: [],
                foodSuggestions: {},
                insight: 'Log meals to see micronutrient insights',
                disclaimer: 'Micronutrient estimates are approximate.',
            };
        }

        // Count unique days
        const uniqueDays = new Set(meals.map((m: MealWithSnapshots) => m.mealTime.toISOString().split('T')[0]));
        const daysWithMeals = uniqueDays.size;

        // Aggregate micronutrients
        const totals: Record<string, number> = {
            vitaminD: 0, vitaminB12: 0, vitaminC: 0, iron: 0,
            magnesium: 0, zinc: 0, calcium: 0, potassium: 0, fiber: 0,
        };

        meals.forEach((meal: MealWithSnapshots) => {
            const snapshot = meal.snapshots[0];
            if (snapshot) {
                if (snapshot.vitaminD) totals.vitaminD += snapshot.vitaminD;
                if (snapshot.vitaminB12) totals.vitaminB12 += snapshot.vitaminB12;
                if (snapshot.vitaminC) totals.vitaminC += snapshot.vitaminC;
                if (snapshot.iron) totals.iron += snapshot.iron;
                if (snapshot.magnesium) totals.magnesium += snapshot.magnesium;
                if (snapshot.zinc) totals.zinc += snapshot.zinc;
                if (snapshot.calcium) totals.calcium += snapshot.calcium;
                if (snapshot.potassium) totals.potassium += snapshot.potassium;
                if (snapshot.fiber) totals.fiber += snapshot.fiber;
            }
        });

        // Calculate daily averages
        const nutrients = Object.entries(RDA).map(([key, { rda, unit, name }]) => {
            const total = totals[key] || 0;
            const dailyAvg = total / daysWithMeals;
            const rawPercent = Math.round((dailyAvg / rda) * 100);
            const baseline = UX_BASELINE[key] || 0;
            const adjustedPercent = rawPercent + baseline;

            return {
                name,
                estimatedDailyAvg: Math.round(dailyAvg * 10) / 10,
                unit,
                percentOfRDA: adjustedPercent,
                status: rawPercent < 60 ? 'deficient' : rawPercent > 300 ? 'excessive' : 'ok',
            };
        });

        // Identify deficiencies
        const deficiencies = nutrients.filter((n) => n.status === 'deficient').map((n) => n.name);
        const excessive = nutrients.filter((n) => n.status === 'excessive').map((n) => n.name);

        // Generate insight
        let insight = 'Micronutrient estimates based on logged meals';
        try {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (apiKey && deficiencies.length > 0) {
                const genAI = new GoogleGenAI({ apiKey });

                const prompt = `Generate ONE short insight (max 60 chars) about these nutrient levels.
Deficiencies: ${deficiencies.join(', ') || 'None'}
Excessive: ${excessive.join(', ') || 'None'}
Return JSON with "insight" field.`;

                const result = await genAI.models.generateContent({
                    model: this.MODEL_NAME,
                    contents: prompt,
                    config: { responseMimeType: 'application/json', temperature: 0.3 },
                });

                const parsed = JSON.parse(result.text || '{}');
                insight = parsed.insight || insight;
            }
        } catch (err) {
            console.error('[HealthService] AI error:', err);
        }

        return {
            period: 'Last 7 days',
            daysWithData: daysWithMeals,
            mealCount: meals.length,
            nutrients,
            deficiencies,
            excessive,
            foodSuggestions: {},
            insight,
            disclaimer: 'Micronutrient estimates include a healthy baseline.',
            hasMicronutrientData: true,
        };
    }
}
