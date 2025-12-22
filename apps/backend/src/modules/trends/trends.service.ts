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

    /**
     * Query trends with AI (convert natural language to structured filter)
     * Full implementation matching legacy /api/trends/query
     */
    async queryTrends(userId: string, query: string, goals?: { calories?: number; protein?: number; carbs?: number; fat?: number }) {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                filterType: 'none',
                interpretation: 'AI service not configured'
            };
        }

        const genAI = new GoogleGenAI({ apiKey });

        // Response schema for structured output
        const queryResponseSchema = {
            type: Type.OBJECT,
            properties: {
                filterType: {
                    type: Type.STRING,
                    enum: ['day_of_week', 'threshold', 'range', 'none'],
                    description: 'Type of filter to apply'
                },
                daysOfWeek: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: 'Days of week to filter (0=Sunday, 6=Saturday)'
                },
                thresholdMetric: {
                    type: Type.STRING,
                    enum: ['calories', 'protein', 'carbs', 'fat'],
                    description: 'Metric for threshold filter'
                },
                thresholdOperator: {
                    type: Type.STRING,
                    enum: ['above', 'below', 'equals'],
                    description: 'Threshold comparison operator'
                },
                thresholdValue: {
                    type: Type.NUMBER,
                    description: 'Threshold value'
                },
                interpretation: {
                    type: Type.STRING,
                    description: 'Brief description of what the filter does'
                }
            },
            required: ['filterType', 'interpretation']
        };

        try {
            const prompt = `You are a trend data filter assistant. Convert the user's natural language query into a structured filter.

CRITICAL RULES:
- You can ONLY filter, group, or highlight existing data
- You CANNOT infer causes, give advice, or compute new insights
- Just understand what data the user wants to see

User's goals:
- Calories: ${goals?.calories || 2000} kcal
- Protein: ${goals?.protein || 150}g
- Carbs: ${goals?.carbs || 200}g
- Fat: ${goals?.fat || 70}g

Available filter types:
1. day_of_week: Filter to specific days (weekends = [0,6], weekdays = [1,2,3,4,5])
2. threshold: Filter values above/below a number (e.g., "under 1500 calories")
3. range: Filter to a date range (not implemented yet, use 'none')
4. none: Cannot be converted to a filter

User query: "${query}"

Return a structured filter.`;

            const result = await genAI.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: queryResponseSchema
                }
            });

            const filterData = JSON.parse(result.text || '{}');
            return filterData;

        } catch (error) {
            console.error('Trends Query Error:', error);
            return {
                filterType: 'none',
                interpretation: 'Could not understand the query'
            };
        }
    }

    /**
     * Explain trend data with AI
     * Full implementation matching legacy /api/trends/explain
     */
    async explainTrend(userId: string, dto: { metric: string; range: string; stats: any; goal: number; dataPoints: any[] }) {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                headline: 'AI service not configured',
                guidance: '',
                technical: '',
                error: 'GEMINI_API_KEY not set'
            };
        }

        const genAI = new GoogleGenAI({ apiKey });
        const { metric, range, stats, goal, dataPoints } = dto;

        // Get user's profile for goal type
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        // Structured output schema for human-first AI
        const explainResponseSchema = {
            type: Type.OBJECT,
            properties: {
                headline: {
                    type: Type.STRING,
                    description: 'One sentence, goal-aware, non-judgmental. No numbers unless necessary.'
                },
                guidance: {
                    type: Type.STRING,
                    description: 'One to two sentences of forward-looking, actionable guidance. Use conditional language like "over the next few days" or "if this pattern continues".'
                },
                technical: {
                    type: Type.STRING,
                    description: 'Technical explanation with averages, variance, percentages. For users who want details.'
                }
            },
            required: ['headline', 'guidance', 'technical']
        };

        try {
            // Get user's goal type
            const goalType = user?.profile?.goalType || 'maintenance';
            const goalContext = goalType === 'fat_loss' ? 'fat loss' :
                goalType === 'muscle_gain' ? 'muscle gain' : 'maintenance';

            // Build context
            const trendDirection = stats.trend === 'up' ? 'increasing' : stats.trend === 'down' ? 'decreasing' : 'stable';
            const avgVsGoal = stats.mean > goal ? 'above' : stats.mean < goal ? 'below' : 'at';
            const diffPercent = Math.abs(Math.round(((stats.mean - goal) / goal) * 100));
            const loggedDays = dataPoints?.filter((d: any) => d.mealCount > 0).length || 0;
            const totalDays = dataPoints?.length || 0;

            const rangeLabel = range === '7d' ? 'this week' : range === '30d' ? 'this month' : 'recently';

            const prompt = `You are a nutrition trend analyst helping someone with a ${goalContext} goal. Generate structured output with:

1. HEADLINE: One sentence describing what's happening with their ${metric} ${rangeLabel}. Goal-aware, non-judgmental. Avoid numbers.
   - Good: "Your intake has been higher than your ${goalContext} target on logged days."
   - Bad: "You consumed 3784 calories averaging 26% above target."

2. GUIDANCE: One to two sentences of forward-looking, directional advice. Use conditional language.
   ✅ Allowed: "Over the next few days...", "If this pattern continues...", "Aiming for X may help..."
   ❌ Not allowed: "You should eat...", "Do this tomorrow...", "This is bad/good"
   - Good: "If this pattern continues, prioritizing lighter dinners or higher-protein meals could help rebalance intake."
   - Bad: "You should eat less. This is too high."

3. TECHNICAL: Stats for power users. Include averages, variance, percentages, logged days.

Context:
- Metric: ${metric}
- User's goal: ${goalContext}
- Time range: ${rangeLabel} (${totalDays} days)
- Average: ${stats.mean} (target: ${goal}, ${diffPercent}% ${avgVsGoal})
- Trend: ${trendDirection}
- Variance: ±${stats.stdDev}
- Data coverage: ${loggedDays}/${totalDays} days logged

Return JSON with headline, guidance, and technical fields.`;

            const result = await genAI.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: explainResponseSchema
                }
            });

            const parsed = JSON.parse(result.text || '{}');

            return {
                headline: parsed.headline || 'Unable to analyze this trend.',
                guidance: parsed.guidance || '',
                technical: parsed.technical || '',
                confidence: {
                    loggedDays,
                    totalDays
                }
            };

        } catch (error) {
            console.error('Trends Explain Error:', error);
            return {
                headline: 'Unable to analyze this trend.',
                guidance: '',
                technical: '',
                error: 'Failed to generate explanation'
            };
        }
    }

    /**
     * Get AI-generated weight normalcy message
     * Full implementation matching legacy /api/trends/weight-normalcy
     */
    async getWeightNormalcyMessage(dto: { entries: any[]; direction: string; goalType?: string; targetWeight?: number; currentWeight?: number; weeklyPace?: number }) {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const apiKey = process.env.GEMINI_API_KEY;

        const { entries, goalType, targetWeight, currentWeight, weeklyPace } = dto;

        if (!entries || entries.length === 0) {
            return {
                message: 'Add weight entries to see insights',
                type: 'info'
            };
        }

        if (!apiKey) {
            return {
                message: 'Weight fluctuations are completely normal',
                type: 'info'
            };
        }

        const genAI = new GoogleGenAI({ apiKey });

        // Structured output schema for normalcy indicator
        const normalcyResponseSchema = {
            type: Type.OBJECT,
            properties: {
                message: {
                    type: Type.STRING,
                    description: 'A single reassuring sentence about the weight trend. Max 55 characters. No advice.'
                },
                type: {
                    type: Type.STRING,
                    enum: ['success', 'info', 'warning'],
                    description: 'success = on track (green), info = neutral (blue), warning = needs attention (amber)'
                }
            },
            required: ['message', 'type']
        };

        try {
            // --- CLEAR CONTEXT CALCULATION ---
            const entryCount = entries.length;
            const sortedEntries = [...entries].sort((a: any, b: any) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const firstWeight = sortedEntries[0]?.weight;
            const lastWeight = sortedEntries[sortedEntries.length - 1]?.weight;

            const daySpan = entryCount > 1
                ? Math.round((new Date(sortedEntries[entryCount - 1].date).getTime() - new Date(sortedEntries[0].date).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            // Actual numeric change
            const totalChange = lastWeight - firstWeight;
            const changeSign = totalChange > 0 ? '+' : '';

            // Explicit direction description
            const actualDirection = totalChange > 0.2 ? 'GAINING weight (upward trend)' :
                totalChange < -0.2 ? 'LOSING weight (downward trend)' :
                    'maintaining (stable, minimal change)';

            // Goal in plain English
            const goalInPlainEnglish =
                goalType === 'muscle_gain' ? 'GAIN weight/muscle' :
                    goalType === 'strength' ? 'GAIN strength (which often means gaining weight)' :
                        goalType === 'fat_loss' ? 'LOSE weight/fat' :
                            goalType === 'recomp' ? 'LOSE fat while maintaining/gaining muscle' :
                                'MAINTAIN current weight';

            // Is this aligned?
            const isOnTrack = (
                (goalType === 'muscle_gain' && totalChange > 0.1) ||
                (goalType === 'strength' && totalChange > 0.1) ||
                (goalType === 'fat_loss' && totalChange < -0.1) ||
                (goalType === 'recomp' && totalChange < 0) ||
                (goalType === 'maintenance' && Math.abs(totalChange) < 0.5)
            );

            const distanceToTarget = targetWeight ? Math.abs(targetWeight - lastWeight) : null;

            // VERY EXPLICIT PROMPT
            const prompt = `You are a supportive fitness analyst. Generate ONE short reassuring sentence (max 55 chars) about this weight trend.

=== CRITICAL DATA (read carefully) ===
• User's GOAL: ${goalInPlainEnglish}
• User is currently: ${actualDirection}
• Net weight change: ${changeSign}${totalChange.toFixed(1)} kg over ${daySpan} days
• First weight: ${firstWeight?.toFixed(1)} kg → Current: ${lastWeight?.toFixed(1)} kg
• Is this aligned with their goal? ${isOnTrack ? 'YES ✓' : 'NO ✗'}
• Target weight: ${targetWeight ? targetWeight + ' kg' : 'not set'}
• Distance to target: ${distanceToTarget ? distanceToTarget.toFixed(1) + ' kg' : 'N/A'}
• Entries: ${entryCount} weigh-ins

=== YOUR TASK ===
${isOnTrack ?
                    `The user IS on track. Celebrate progress! Examples:
    - "+1.2 kg gained — solid progress for muscle gain"
    - "This upward trend matches your bulking goal"
    - "Gaining at a healthy pace for muscle building"` :
                    `The user is NOT on track. Be reassuring but honest. Examples:
    - "Fluctuations are normal, stay consistent"
    - "Progress takes time, you're building habits"`
                }

=== RULES ===
- Max 55 characters
- No advice ("try...", "consider...")
- Be specific about what's happening
- If gaining weight for muscle gain goal → type: "success"
- If maintaining but goal is muscle gain → type: "info" (not bad, but not progress)

Return JSON: { "message": "...", "type": "success|info|warning" }`;

            const result = await genAI.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: normalcyResponseSchema,
                    temperature: 0.2
                }
            });

            const parsed = JSON.parse(result.text || '{}');

            return {
                message: parsed.message || 'Weight trend looks normal',
                type: parsed.type || 'info'
            };

        } catch (error) {
            console.error('Weight Normalcy Error:', error);
            return {
                message: 'Weight fluctuations are completely normal',
                type: 'info'
            };
        }
    }
}
