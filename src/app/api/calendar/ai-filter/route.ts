import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI } from '@google/genai'
import { getDayKey } from '@/lib/calendar'
import { format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

/**
 * AI-powered calendar filter using Gemini
 * 
 * Takes a natural language query and returns matching day keys.
 * Queries REAL meal data, not cached CalendarDaySummary.
 */

// Schema for Gemini's structured response
const filterResponseSchema = {
    type: 'object',
    properties: {
        filterType: {
            type: 'string',
            enum: ['missed_logging', 'on_track', 'over_target', 'under_target', 'low_protein', 'high_protein', 'high_carb', 'high_fat', 'low_fat', 'hit_fat_goal', 'low_calorie', 'weekend', 'weekday', 'custom'],
            description: 'The type of filter derived from the query'
        },
        conditions: {
            type: 'object',
            properties: {
                caloriesMin: { type: 'number', description: 'Minimum calories threshold' },
                caloriesMax: { type: 'number', description: 'Maximum calories threshold' },
                proteinMin: { type: 'number', description: 'Minimum protein threshold' },
                proteinMax: { type: 'number', description: 'Maximum protein threshold' },
                carbsMin: { type: 'number', description: 'Minimum carbs threshold' },
                carbsMax: { type: 'number', description: 'Maximum carbs threshold' },
                fatMin: { type: 'number', description: 'Minimum fat threshold' },
                fatMax: { type: 'number', description: 'Maximum fat threshold' },
                mealCountMin: { type: 'number', description: 'Minimum meals logged' },
                mealCountMax: { type: 'number', description: 'Maximum meals logged' },
                weekendOnly: { type: 'boolean', description: 'Only include weekends' },
                weekdayOnly: { type: 'boolean', description: 'Only include weekdays' },
                contextTags: { type: 'array', items: { type: 'string' }, description: 'Required context tags' }
            }
        },
        explanation: { type: 'string', description: 'Brief explanation of the interpreted filter' }
    },
    required: ['filterType', 'conditions', 'explanation']
}

interface FilterConditions {
    caloriesMin?: number
    caloriesMax?: number
    proteinMin?: number
    proteinMax?: number
    carbsMin?: number
    carbsMax?: number
    fatMin?: number
    fatMax?: number
    mealCountMin?: number
    mealCountMax?: number
    weekendOnly?: boolean
    weekdayOnly?: boolean
    contextTags?: string[]
}

interface FilterResponse {
    filterType: string
    conditions: FilterConditions
    explanation: string
}

interface DaySummary {
    mealCount: number
    calories: number
    protein: number
    carbs: number
    fat: number
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { query, month } = await req.json()

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 })
        }

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json({ error: 'Valid month (YYYY-MM) is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get user's FULL goals for context
        const targetCalories = user.profile?.targetCal || 2000
        const targetProtein = user.profile?.proteinTarget || 150
        const targetCarbs = user.profile?.carbTarget || 200
        const targetFat = user.profile?.fatTarget || 70

        // Step 1: Use Gemini to interpret the query
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
        }

        const ai = new GoogleGenAI({ apiKey })

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

Return a JSON object with the filter conditions.`

        console.log('[AI Filter] Query:', query)

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseJsonSchema: filterResponseSchema,
                temperature: 0.1
            }
        })

        let text = response.text
        if (!text) {
            return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 })
        }

        // Clean potential markdown fences
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
        const filterResult: FilterResponse = JSON.parse(text)

        console.log('[AI Filter] Interpreted:', filterResult.explanation)
        console.log('[AI Filter] Conditions:', JSON.stringify(filterResult.conditions))

        // Step 2: Fetch REAL meal data for the month (not cached summary)
        const [year, monthNum] = month.split('-').map(Number)
        const daysInMonth = new Date(year, monthNum, 0).getDate()
        const userTz = user.profile?.timezone || 'UTC'

        // Calculate UTC time bounds for the month in user's timezone
        const monthStartLocal = new Date(year, monthNum - 1, 1, 0, 0, 0)
        const monthEndLocal = new Date(year, monthNum, 0, 23, 59, 59)
        const monthStartUTC = fromZonedTime(monthStartLocal, userTz)
        const monthEndUTC = fromZonedTime(monthEndLocal, userTz)

        // Query actual meals with their active snapshots
        const meals = await prisma.meal.findMany({
            where: {
                userId: user.id,
                mealTime: {
                    gte: monthStartUTC,
                    lte: monthEndUTC
                }
            },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1
                }
            }
        })

        console.log('[AI Filter] Found', meals.length, 'meals in', month)

        // Aggregate meals by day
        const dayData = new Map<string, DaySummary>()

        for (const meal of meals) {
            const dayKey = getDayKey(meal.mealTime, userTz)
            const snapshot = meal.snapshots[0]

            if (!dayData.has(dayKey)) {
                dayData.set(dayKey, { mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 })
            }

            const day = dayData.get(dayKey)!
            day.mealCount++

            if (snapshot) {
                day.calories += snapshot.calories || 0
                day.protein += snapshot.protein || 0
                day.carbs += snapshot.carbs || 0
                day.fat += snapshot.fat || 0
            }
        }

        console.log('[AI Filter] Aggregated data for', dayData.size, 'days')

        // Fetch context tags
        const contexts = await prisma.dayContext.findMany({
            where: {
                userId: user.id,
                dayKey: { gte: `${month}-01`, lte: `${month}-${daysInMonth}` }
            }
        })
        const contextMap = new Map(contexts.map(c => [c.dayKey, JSON.parse(c.tags) as string[]]))

        // Step 3: Apply filter conditions to find matching days
        const matchingDays: string[] = []
        const todayKey = getDayKey(new Date(), userTz)
        const conds = filterResult.conditions

        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `${month}-${String(d).padStart(2, '0')}`

            // Skip future days
            if (dayKey > todayKey) continue

            const summary = dayData.get(dayKey) || { mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
            const tags = contextMap.get(dayKey) || []
            const date = new Date(year, monthNum - 1, d)
            const dayOfWeek = date.getDay()
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            // Apply conditions
            let matches = true

            // Meal count conditions
            if (conds.mealCountMin !== undefined && summary.mealCount < conds.mealCountMin) matches = false
            if (conds.mealCountMax !== undefined && summary.mealCount > conds.mealCountMax) matches = false

            // Calories conditions
            if (conds.caloriesMin !== undefined && summary.calories < conds.caloriesMin) matches = false
            if (conds.caloriesMax !== undefined && summary.calories > conds.caloriesMax) matches = false

            // Protein conditions
            if (conds.proteinMin !== undefined && summary.protein < conds.proteinMin) matches = false
            if (conds.proteinMax !== undefined && summary.protein > conds.proteinMax) matches = false

            // Carbs conditions
            if (conds.carbsMin !== undefined && summary.carbs < conds.carbsMin) matches = false
            if (conds.carbsMax !== undefined && summary.carbs > conds.carbsMax) matches = false

            // Fat conditions
            if (conds.fatMin !== undefined && summary.fat < conds.fatMin) matches = false
            if (conds.fatMax !== undefined && summary.fat > conds.fatMax) matches = false

            // Weekend/weekday conditions
            if (conds.weekendOnly && !isWeekend) matches = false
            if (conds.weekdayOnly && isWeekend) matches = false

            // Context tag conditions
            if (conds.contextTags && conds.contextTags.length > 0) {
                const hasAllTags = conds.contextTags.every(tag => tags.includes(tag))
                if (!hasAllTags) matches = false
            }

            if (matches) {
                matchingDays.push(dayKey)
                console.log(`[AI Filter] Day ${dayKey} matches:`, summary)
            }
        }

        console.log('[AI Filter] Matching days:', matchingDays.length)

        return NextResponse.json({
            query,
            interpretation: filterResult.explanation,
            filterType: filterResult.filterType,
            conditions: filterResult.conditions,
            matchingDays,
            count: matchingDays.length
        })

    } catch (error) {
        console.error('[AI Filter] Error:', error)
        return NextResponse.json({ error: 'Failed to process query' }, { status: 500 })
    }
}

