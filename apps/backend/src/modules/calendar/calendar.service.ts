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

    /**
     * Get detailed day data (meals, summary, context)
     * Full implementation matching legacy /api/calendar/day
     */
    async getDayDetail(userId: string, dayKey: string) {
        // Validate dayKey format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
            throw new Error('Invalid dayKey format (YYYY-MM-DD)');
        }

        // Get user profile for timezone
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        const timeZone = profile?.timezone || 'UTC';

        // Calculate day range in UTC based on user's timezone
        const { fromZonedTime } = await import('date-fns-tz');
        const startOfDayUser = fromZonedTime(`${dayKey} 00:00:00`, timeZone);
        const endOfDayUser = fromZonedTime(`${dayKey} 23:59:59.999`, timeZone);

        // Fetch data
        const [summary, context, meals] = await Promise.all([
            this.prisma.calendarDaySummary.findUnique({
                where: { userId_dayKey: { userId, dayKey } },
            }),
            this.prisma.dayContext.findUnique({
                where: { userId_dayKey: { userId, dayKey } },
            }),
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: {
                        gte: startOfDayUser,
                        lte: endOfDayUser,
                    },
                },
                include: { snapshots: true },
                orderBy: { mealTime: 'desc' },
            }),
        ]);

        // Type alias for meal with snapshots
        type MealWithSnapshots = typeof meals[number];

        // Transform meals to include activeSnapshot property
        const processedMeals = meals.map((meal: MealWithSnapshots) => {
            const active = meal.snapshots.find((s: typeof meal.snapshots[number]) => s.id === meal.activeSnapshotId) || meal.snapshots[0];
            return {
                ...meal,
                activeSnapshot: active,
            };
        });

        return {
            dayKey,
            summary: summary || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                mealCount: 0,
            },
            context: context ? {
                tags: this.safeJsonParse(context.tags, []),
                note: context.note,
            } : null,
            meals: processedMeals,
        };
    }

    /**
     * AI-powered filter for calendar days
     * Full implementation matching legacy /api/calendar/ai-filter
     */
    async aiFilter(userId: string, query: string, month: string) {
        // Validate inputs
        if (!query || typeof query !== 'string') {
            throw new Error('Query is required');
        }

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            throw new Error('Valid month (YYYY-MM) is required');
        }

        const { GoogleGenAI, Type } = await import('@google/genai');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('AI service not configured');
        }

        const genAI = new GoogleGenAI({ apiKey });

        // Get user with profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Get user's goals
        const targetCalories = user.profile?.targetCal || 2000;
        const targetProtein = user.profile?.proteinTarget || 150;
        const targetCarbs = user.profile?.carbTarget || 200;
        const targetFat = user.profile?.fatTarget || 70;
        const userTz = user.profile?.timezone || 'UTC';

        // Schema for Gemini's structured response
        const filterResponseSchema = {
            type: Type.OBJECT,
            properties: {
                filterType: {
                    type: Type.STRING,
                    enum: ['missed_logging', 'on_track', 'over_target', 'under_target', 'low_protein', 'high_protein', 'high_carb', 'high_fat', 'low_fat', 'hit_fat_goal', 'low_calorie', 'weekend', 'weekday', 'custom'],
                    description: 'The type of filter derived from the query',
                },
                conditions: {
                    type: Type.OBJECT,
                    properties: {
                        caloriesMin: { type: Type.NUMBER, description: 'Minimum calories threshold' },
                        caloriesMax: { type: Type.NUMBER, description: 'Maximum calories threshold' },
                        proteinMin: { type: Type.NUMBER, description: 'Minimum protein threshold' },
                        proteinMax: { type: Type.NUMBER, description: 'Maximum protein threshold' },
                        carbsMin: { type: Type.NUMBER, description: 'Minimum carbs threshold' },
                        carbsMax: { type: Type.NUMBER, description: 'Maximum carbs threshold' },
                        fatMin: { type: Type.NUMBER, description: 'Minimum fat threshold' },
                        fatMax: { type: Type.NUMBER, description: 'Maximum fat threshold' },
                        mealCountMin: { type: Type.NUMBER, description: 'Minimum meals logged' },
                        mealCountMax: { type: Type.NUMBER, description: 'Maximum meals logged' },
                        weekendOnly: { type: Type.BOOLEAN, description: 'Only include weekends' },
                        weekdayOnly: { type: Type.BOOLEAN, description: 'Only include weekdays' },
                        contextTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Required context tags' },
                    },
                },
                explanation: { type: Type.STRING, description: 'Brief explanation of the interpreted filter' },
            },
            required: ['filterType', 'conditions', 'explanation'],
        };

        // Build prompt for AI
        const prompt = `You are a nutrition calendar filter interpreter. Parse the user's natural language query into structured filter conditions.

USER'S DAILY GOALS (IMPORTANT - use these for goal-related queries):
- Daily calories target: ${targetCalories} kcal
- Daily protein target: ${targetProtein}g
- Daily carbs target: ${targetCarbs}g
- Daily fat target: ${targetFat}g

USER QUERY: "${query}"

CRITICAL INTERPRETATION RULES:
1. If user mentions a SPECIFIC calorie number (e.g., "2k calories", "2000 calories", "around 2000"):
   - Set caloriesMin to (mentioned value - 10%) and caloriesMax to (mentioned value + 10%)
   - Example: "2k calories" or "2000 or more" → caloriesMin: 2000 (no max needed if "or more")

2. If user says "hit my goal" / "reached goal" for a specific macro:
   - For calories: caloriesMin = target * 0.9, caloriesMax = target * 1.1
   - For protein: proteinMin = target * 0.9
   - For fat: fatMin = target * 0.9
   - For carbs: carbsMin = target * 0.9

3. If user says "skipped logging" / "missed" / "didn't log":
   - Set mealCountMax: 0

4. If user says "on track":
   - Set caloriesMin: ${Math.round(targetCalories * 0.9)}, caloriesMax: ${Math.round(targetCalories * 1.1)}

5. If user says "over target" / "went over" / "exceeded":
   - Set caloriesMin: ${Math.round(targetCalories * 1.1)}

6. If user says "under target" / "underate":
   - Set caloriesMax: ${Math.round(targetCalories * 0.9)}

7. If user says "low protein":
   - Set proteinMax: ${Math.round(targetProtein * 0.7)}

8. If user says "high protein" / "hit protein goal":
   - Set proteinMin: ${Math.round(targetProtein * 0.9)}

9. If user says "high fat" / "hit fat goal":
   - Set fatMin: ${Math.round(targetFat * 0.9)}

10. If user says "low fat":
    - Set fatMax: ${Math.round(targetFat * 0.7)}

11. If user says "high carb":
    - Set carbsMin: ${Math.round(targetCarbs * 1.2)}

12. If user says "weekend" / "weekends":
    - Set weekendOnly: true

13. If user says "weekday" / "weekdays":
    - Set weekdayOnly: true

IMPORTANT: You MUST set at least one numerical condition. Think carefully about what the user is asking for.

Return a JSON object with the filter conditions.`;

        try {
            console.log('[AI Filter] Query:', query);

            const response = await genAI.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: 'application/json',
                    responseJsonSchema: filterResponseSchema,
                    temperature: 0.1,
                },
            });

            let text = response.text;
            if (!text) {
                throw new Error('AI returned empty response');
            }

            // Clean potential markdown fences
            text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
            const filterResult = JSON.parse(text);

            console.log('[AI Filter] Interpreted:', filterResult.explanation);
            console.log('[AI Filter] Conditions:', JSON.stringify(filterResult.conditions));

            // Fetch REAL meal data for the month
            const [year, monthNum] = month.split('-').map(Number);
            const daysInMonth = new Date(year, monthNum, 0).getDate();

            // Calculate UTC time bounds for the month in user's timezone
            const { fromZonedTime } = await import('date-fns-tz');
            const monthStartLocal = new Date(year, monthNum - 1, 1, 0, 0, 0);
            const monthEndLocal = new Date(year, monthNum, 0, 23, 59, 59);
            const monthStartUTC = fromZonedTime(monthStartLocal, userTz);
            const monthEndUTC = fromZonedTime(monthEndLocal, userTz);

            // Query actual meals with their active snapshots
            const meals = await this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: {
                        gte: monthStartUTC,
                        lte: monthEndUTC,
                    },
                },
                include: {
                    snapshots: {
                        where: { isActive: true },
                        take: 1,
                    },
                },
            });

            console.log('[AI Filter] Found', meals.length, 'meals in', month);

            // Type alias for meal with snapshots
            type MealWithSnapshots = typeof meals[number];

            // Aggregate meals by day
            const dayData = new Map<string, { mealCount: number; calories: number; protein: number; carbs: number; fat: number }>();

            for (const meal of meals as MealWithSnapshots[]) {
                const dayKey = getDayKey(meal.mealTime, userTz);
                const snapshot = meal.snapshots[0];

                if (!dayData.has(dayKey)) {
                    dayData.set(dayKey, { mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
                }

                const day = dayData.get(dayKey)!;
                day.mealCount++;

                if (snapshot) {
                    day.calories += snapshot.calories || 0;
                    day.protein += snapshot.protein || 0;
                    day.carbs += snapshot.carbs || 0;
                    day.fat += snapshot.fat || 0;
                }
            }

            console.log('[AI Filter] Aggregated data for', dayData.size, 'days');

            // Fetch context tags
            const contexts = await this.prisma.dayContext.findMany({
                where: {
                    userId,
                    dayKey: { gte: `${month}-01`, lte: `${month}-${daysInMonth}` },
                },
            });
            const contextMap = new Map<string, string[]>(
                contexts.map((c: typeof contexts[number]) => [c.dayKey, JSON.parse(c.tags) as string[]]),
            );

            // Apply filter conditions to find matching days
            const matchingDays: string[] = [];
            const todayKey = getDayKey(new Date(), userTz);
            const conds = filterResult.conditions || {};

            for (let d = 1; d <= daysInMonth; d++) {
                const dayKey = `${month}-${String(d).padStart(2, '0')}`;

                // Skip future days
                if (dayKey > todayKey) continue;

                const summary = dayData.get(dayKey) || { mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
                const tags = contextMap.get(dayKey) || [];
                const date = new Date(year, monthNum - 1, d);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Apply conditions
                let matches = true;

                // Meal count conditions
                if (conds.mealCountMin !== undefined && summary.mealCount < conds.mealCountMin) matches = false;
                if (conds.mealCountMax !== undefined && summary.mealCount > conds.mealCountMax) matches = false;

                // Calories conditions
                if (conds.caloriesMin !== undefined && summary.calories < conds.caloriesMin) matches = false;
                if (conds.caloriesMax !== undefined && summary.calories > conds.caloriesMax) matches = false;

                // Protein conditions
                if (conds.proteinMin !== undefined && summary.protein < conds.proteinMin) matches = false;
                if (conds.proteinMax !== undefined && summary.protein > conds.proteinMax) matches = false;

                // Carbs conditions
                if (conds.carbsMin !== undefined && summary.carbs < conds.carbsMin) matches = false;
                if (conds.carbsMax !== undefined && summary.carbs > conds.carbsMax) matches = false;

                // Fat conditions
                if (conds.fatMin !== undefined && summary.fat < conds.fatMin) matches = false;
                if (conds.fatMax !== undefined && summary.fat > conds.fatMax) matches = false;

                // Weekend/weekday conditions
                if (conds.weekendOnly && !isWeekend) matches = false;
                if (conds.weekdayOnly && isWeekend) matches = false;

                // Context tag conditions
                if (conds.contextTags && conds.contextTags.length > 0) {
                    const hasAllTags = conds.contextTags.every((tag: string) => tags.includes(tag));
                    if (!hasAllTags) matches = false;
                }

                if (matches) {
                    matchingDays.push(dayKey);
                    console.log(`[AI Filter] Day ${dayKey} matches:`, summary);
                }
            }

            console.log('[AI Filter] Matching days:', matchingDays.length);

            return {
                query,
                interpretation: filterResult.explanation,
                filterType: filterResult.filterType,
                conditions: filterResult.conditions,
                matchingDays,
                count: matchingDays.length,
            };

        } catch (error) {
            console.error('[AI Filter] Error:', error);
            throw new Error('Failed to process query');
        }
    }

    /**
     * Safely parse JSON with fallback
     */
    private safeJsonParse(str: string, fallback: any): any {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.warn('Failed to parse tags JSON:', str);
            return fallback;
        }
    }
}

