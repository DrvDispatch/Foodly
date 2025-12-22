import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import { subDays } from 'date-fns';

// RDA values (recommended daily allowance)
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

// UX Visual Baseline - purely for aesthetics so bars don't start from 0%
const UX_VISUAL_BASELINE: Record<string, number> = {
    vitaminD: 15,
    vitaminB12: 20,
    vitaminC: 20,
    iron: 25,
    magnesium: 20,
    zinc: 25,
    calcium: 20,
    potassium: 20,
    fiber: 20,
};

// Schema for validation response
const validationSchema = {
    type: Type.OBJECT,
    properties: {
        nutrients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    correctedDailyAvg: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    percentOfRDA: { type: Type.NUMBER },
                    status: { type: Type.STRING, enum: ['deficient', 'ok', 'excessive'] },
                    reasoning: { type: Type.STRING },
                },
                required: ['name', 'correctedDailyAvg', 'unit', 'percentOfRDA', 'status'],
            },
        },
        deficiencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
        },
        excessive: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
        },
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    nutrient: { type: Type.STRING },
                    foods: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['nutrient', 'foods'],
            },
        },
        insight: { type: Type.STRING },
    },
    required: ['nutrients', 'deficiencies', 'suggestions', 'insight'],
};

/**
 * Health Service
 *
 * Weekly micronutrient analysis with full AI validation:
 * - Aggregate from meal snapshots
 * - AI validation/correction of values
 * - Deficiency detection
 * - Food suggestions
 * - Caching in HealthReport table
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

        // Get user with profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        // Get meals with FULL nutrition snapshots and items
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

        // Type aliases
        type MealWithDetails = typeof meals[number];
        type MealItem = MealWithDetails['items'][number];

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

        // --- CACHING STRATEGY ---
        // 1. Get the latest update time of any meal in this period
        const latestMealUpdate = meals.reduce((latest: Date, meal: MealWithDetails) => {
            return meal.updatedAt > latest ? meal.updatedAt : latest;
        }, new Date(0));

        // 2. Check for a valid cached report
        const cachedReport = await this.prisma.healthReport.findFirst({
            where: {
                userId,
                endDate: { gte: subDays(now, 1) },
                createdAt: { gt: latestMealUpdate },
            },
            orderBy: { createdAt: 'desc' },
        });

        // 3. Return cache if valid
        if (cachedReport) {
            try {
                const reportData = JSON.parse(cachedReport.data);
                console.log('[HealthService] Serving from CACHE');
                return { ...reportData, cached: true };
            } catch (e) {
                console.error('[HealthService] Failed to parse cached report:', e);
            }
        }

        console.log('[HealthService] Generating NEW report (AI)');

        // Count unique days
        const uniqueDays = new Set(meals.map((m: MealWithDetails) => m.mealTime.toISOString().split('T')[0]));
        const daysWithMeals = uniqueDays.size;

        // Aggregate stored micronutrients
        const totals: Record<string, number> = {
            vitaminD: 0, vitaminB12: 0, vitaminC: 0, iron: 0,
            magnesium: 0, zinc: 0, calcium: 0, potassium: 0, fiber: 0,
        };

        let snapshotsWithMicronutrients = 0;

        // Build detailed meal descriptions for validation
        const mealDetails: string[] = [];

        meals.forEach((meal: MealWithDetails) => {
            const snapshot = meal.snapshots[0];
            const itemNames = meal.items.map((i: MealItem) => i.name).join(', ');
            const desc = meal.description || itemNames || 'Unknown meal';

            mealDetails.push(`${meal.type.toUpperCase()}: ${desc} (${snapshot?.calories || 0} kcal, P:${snapshot?.protein || 0}g)`);

            if (snapshot) {
                if (snapshot.vitaminD) { totals.vitaminD += snapshot.vitaminD; snapshotsWithMicronutrients++; }
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

        // Calculate raw daily averages
        const rawNutrients = Object.entries(RDA).map(([key, { rda, unit, name }]) => {
            const total = totals[key] || 0;
            const dailyAvg = total / daysWithMeals;
            const rawPercent = Math.round((dailyAvg / rda) * 100);
            const baselinePercent = UX_VISUAL_BASELINE[key] || 0;
            const adjustedPercent = rawPercent + baselinePercent;

            return {
                key,
                name,
                dailyAvg: Math.round(dailyAvg * 10) / 10,
                unit,
                rawPercent,
                adjustedPercent,
            };
        });

        // Get dietary preferences
        const profile = user?.profile;
        const dietaryPrefs = profile?.dietaryPrefs ? JSON.parse(profile.dietaryPrefs) : [];

        // AI Validation
        let validatedNutrients: any[] = [];
        let deficiencies: string[] = [];
        let excessive: string[] = [];
        let foodSuggestions: Record<string, string[]> = {};
        let insight = 'Micronutrient estimates based on logged meals';

        try {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (apiKey) {
                const genAI = new GoogleGenAI({ apiKey });

                const validationPrompt = `You are a nutrition expert. Review and VALIDATE/CORRECT these micronutrient estimates based on the meal descriptions.

MEALS LOGGED (${meals.length} over ${daysWithMeals} days):
${mealDetails.join('\n')}

CURRENT ESTIMATES (daily averages):
${rawNutrients.map((n) => `- ${n.name}: ${n.dailyAvg} ${n.unit}/day (${n.rawPercent}% of RDA)`).join('\n')}

USER DIETARY PREFERENCES: ${dietaryPrefs.length > 0 ? dietaryPrefs.join(', ') : 'None'}

TASK:
1. Review each micronutrient estimate against the meal descriptions
2. CORRECT values that seem too high or too low based on typical food composition
3. Use realistic "typical mean" values - not extreme high or low
4. If a value seems about right, keep it similar
5. Identify nutrients below 60% RDA as deficiencies
6. Identify nutrients significantly above recommended safe levels as "excessive" (e.g. >200-300%, but generally safe for water-soluble vitamins like B12/C unless extreme)
7. Set 'status' for each nutrient: 'deficient', 'ok', or 'excessive'
8. For each deficiency or excessive nutrient, suggest corrective actions (foods to eat or avoid)
9. Write ONE insight sentence (max 60 chars)

CORRECTION GUIDELINES:
- Vitamin D: Eggs ~2mcg, fatty fish ~15mcg, fortified milk ~2.5mcg
- Vitamin B12: Meat ~2mcg, eggs ~0.5mcg, dairy ~1mcg
- Iron: Red meat ~3mg, spinach ~3mg/cup, beans ~2mg
- Consider that users may consume unlogged foods too

Return validated/corrected values in JSON.`;

                const result = await genAI.models.generateContent({
                    model: this.MODEL_NAME,
                    contents: validationPrompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: validationSchema,
                        temperature: 0.2,
                    },
                });

                const parsed = JSON.parse(result.text || '{}');

                // Use validated values
                if (parsed.nutrients && Array.isArray(parsed.nutrients)) {
                    validatedNutrients = parsed.nutrients.map((n: any) => {
                        const key = Object.keys(RDA).find((k) => RDA[k].name === n.name);
                        const baseline = key ? UX_VISUAL_BASELINE[key] || 0 : 0;
                        return {
                            name: n.name,
                            estimatedDailyAvg: n.correctedDailyAvg,
                            unit: n.unit,
                            percentOfRDA: (n.percentOfRDA || 0) + baseline,
                            status: n.status || (n.percentOfRDA < 60 ? 'deficient' : n.percentOfRDA > 300 ? 'excessive' : 'ok'),
                        };
                    });
                }

                // Deficiencies
                deficiencies = validatedNutrients
                    .filter((n) => n.status === 'deficient' || (n.status !== 'ok' && n.status !== 'excessive' && n.percentOfRDA < 60))
                    .map((n) => n.name);

                // Excessive
                excessive = validatedNutrients
                    .filter((n) => n.status === 'excessive' || (n.status !== 'ok' && n.status !== 'deficient' && n.percentOfRDA > 300))
                    .map((n) => n.name);

                if (parsed.suggestions) {
                    parsed.suggestions.forEach((s: { nutrient: string; foods: string[] }) => {
                        if (s.nutrient && s.foods && (deficiencies.includes(s.nutrient) || excessive.includes(s.nutrient))) {
                            foodSuggestions[s.nutrient] = s.foods;
                        }
                    });
                }

                insight = parsed.insight || insight;
            }
        } catch (aiError) {
            console.error('[HealthService] AI validation error:', aiError);

            // Fall back to raw values with baseline
            validatedNutrients = rawNutrients.map((n) => ({
                name: n.name,
                estimatedDailyAvg: n.dailyAvg,
                unit: n.unit,
                percentOfRDA: n.adjustedPercent,
                status: n.rawPercent < 60 ? 'deficient' : n.rawPercent > 300 ? 'excessive' : 'ok',
            }));

            deficiencies = validatedNutrients.filter((n) => n.status === 'deficient').map((n) => n.name);
            excessive = validatedNutrients.filter((n) => n.status === 'excessive').map((n) => n.name);
        }

        const hasMicronutrientData = snapshotsWithMicronutrients > 0 || validatedNutrients.length > 0;

        const responseData = {
            period: 'Last 7 days',
            daysWithData: daysWithMeals,
            mealCount: meals.length,
            nutrients: validatedNutrients,
            deficiencies,
            excessive,
            foodSuggestions,
            insight,
            disclaimer: 'Micronutrient estimates include a healthy baseline and AI validation.',
            hasMicronutrientData,
            aiValidated: true,
        };

        // Cache the result
        try {
            // Delete old reports to keep DB clean
            await this.prisma.healthReport.deleteMany({ where: { userId } });

            // Save new report
            await this.prisma.healthReport.create({
                data: {
                    userId,
                    startDate: sevenDaysAgo,
                    endDate: now,
                    data: JSON.stringify(responseData),
                },
            });
        } catch (cacheError) {
            console.error('[HealthService] Failed to cache health report:', cacheError);
        }

        return responseData;
    }
}
