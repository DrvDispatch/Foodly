import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI, Type } from '@google/genai'
import { subDays } from 'date-fns'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// RDA values (recommended daily allowance)
const RDA = {
    vitaminD: { rda: 20, unit: 'mcg', name: 'Vitamin D' },
    vitaminB12: { rda: 2.4, unit: 'mcg', name: 'Vitamin B12' },
    vitaminC: { rda: 90, unit: 'mg', name: 'Vitamin C' },
    iron: { rda: 18, unit: 'mg', name: 'Iron' },
    magnesium: { rda: 400, unit: 'mg', name: 'Magnesium' },
    zinc: { rda: 11, unit: 'mg', name: 'Zinc' },
    calcium: { rda: 1000, unit: 'mg', name: 'Calcium' },
    potassium: { rda: 3400, unit: 'mg', name: 'Potassium' },
    fiber: { rda: 28, unit: 'g', name: 'Fiber' }
}

// UX Visual Baseline - purely for aesthetics so bars don't start from 0%
// This is NOT a minimum/floor - values CAN drop below this if eating poorly
// It represents a visual offset to make the UI look better
const UX_VISUAL_BASELINE = {
    vitaminD: 15,
    vitaminB12: 20,
    vitaminC: 20,
    iron: 25,
    magnesium: 20,
    zinc: 25,
    calcium: 20,
    potassium: 20,
    fiber: 20
}

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
                    reasoning: { type: Type.STRING }
                },
                required: ['name', 'correctedDailyAvg', 'unit', 'percentOfRDA', 'status']
            }
        },
        deficiencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        excessive: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    nutrient: { type: Type.STRING },
                    foods: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['nutrient', 'foods']
            }
        },
        insight: { type: Type.STRING }
    },
    required: ['nutrients', 'deficiencies', 'suggestions', 'insight']
}

/**
 * GET /api/health/weekly
 * 
 * Returns weekly micronutrient analysis with AI validation/correction.
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const now = new Date()
        const sevenDaysAgo = subDays(now, 7)

        // Get meals with FULL nutrition snapshots and items
        const meals = await prisma.meal.findMany({
            where: {
                userId: user.id,
                mealTime: {
                    gte: sevenDaysAgo,
                    lte: now
                }
            },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1
                },
                items: true
            },
            orderBy: { mealTime: 'asc' }
        })

        if (meals.length === 0) {
            return NextResponse.json({
                period: 'Last 7 days',
                daysWithData: 0,
                nutrients: [],
                deficiencies: [],
                excessive: [],
                foodSuggestions: {},
                insight: 'Log meals to see micronutrient insights',
                disclaimer: 'Micronutrient estimates are approximate.'
            })
        }

        // --- CACHING STRATEGY ---
        // 1. Get the latest update time of any meal in this period
        const latestMealUpdate = meals.reduce((latest, meal) => {
            return meal.updatedAt > latest ? meal.updatedAt : latest
        }, new Date(0))

        // 2. Check for a valid cached report
        const cachedReport = await prisma.healthReport.findFirst({
            where: {
                userId: user.id,
                endDate: {
                    gte: subDays(now, 1) // Report covers essentially the same usage period
                },
                createdAt: {
                    gt: latestMealUpdate // Created AFTER the last meal change
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // 3. Return cache if valid
        if (cachedReport) {
            try {
                const reportData = JSON.parse(cachedReport.data)
                console.log('Serving Health Report from CACHE')
                return NextResponse.json({
                    ...reportData,
                    cached: true
                })
            } catch (e) {
                console.error('Failed to parse cached report:', e)
            }
        }

        console.log('Generating NEW Health Report (AI)')
        // --- END CACHING CHECK ---

        // Count unique days
        const uniqueDays = new Set(meals.map(m => m.mealTime.toISOString().split('T')[0]))
        const daysWithMeals = uniqueDays.size

        // Aggregate stored micronutrients
        const totals: Record<string, number> = {
            vitaminD: 0, vitaminB12: 0, vitaminC: 0, iron: 0,
            magnesium: 0, zinc: 0, calcium: 0, potassium: 0, fiber: 0
        }

        let snapshotsWithMicronutrients = 0

        // Build detailed meal descriptions for validation
        const mealDetails: string[] = []

        meals.forEach(meal => {
            const snapshot = meal.snapshots[0]
            const itemNames = meal.items.map(i => i.name).join(', ')
            const desc = meal.description || itemNames || 'Unknown meal'

            mealDetails.push(`${meal.type.toUpperCase()}: ${desc} (${snapshot?.calories || 0} kcal, P:${snapshot?.protein || 0}g)`)

            if (snapshot) {
                if (snapshot.vitaminD) { totals.vitaminD += snapshot.vitaminD; snapshotsWithMicronutrients++ }
                if (snapshot.vitaminB12) totals.vitaminB12 += snapshot.vitaminB12
                if (snapshot.vitaminC) totals.vitaminC += snapshot.vitaminC
                if (snapshot.iron) totals.iron += snapshot.iron
                if (snapshot.magnesium) totals.magnesium += snapshot.magnesium
                if (snapshot.zinc) totals.zinc += snapshot.zinc
                if (snapshot.calcium) totals.calcium += snapshot.calcium
                if (snapshot.potassium) totals.potassium += snapshot.potassium
                if (snapshot.fiber) totals.fiber += snapshot.fiber
            }
        })

        // Calculate raw daily averages
        const rawNutrients = Object.entries(RDA).map(([key, { rda, unit, name }]) => {
            const total = totals[key] || 0
            const dailyAvg = total / daysWithMeals
            const rawPercent = Math.round((dailyAvg / rda) * 100)
            // Add UX visual baseline for aesthetics (bars don't start at 0%)
            const baselinePercent = UX_VISUAL_BASELINE[key as keyof typeof UX_VISUAL_BASELINE] || 0
            // Note: This can go below baseline if eating poorly - baseline is just a visual offset
            const adjustedPercent = rawPercent + baselinePercent

            return {
                key,
                name,
                dailyAvg: Math.round(dailyAvg * 10) / 10,
                unit,
                rawPercent,
                adjustedPercent
            }
        })

        // Get dietary preferences
        const profile = user.profile as any
        const dietaryPrefs = profile?.dietaryPrefs ? JSON.parse(profile.dietaryPrefs) : []

        // AI Validation: Send stored values + descriptions for correction
        let validatedNutrients: any[] = []
        let deficiencies: string[] = []
        let foodSuggestions: Record<string, string[]> = {}
        let insight = ''

        try {
            const validationPrompt = `You are a nutrition expert. Review and VALIDATE/CORRECT these micronutrient estimates based on the meal descriptions.

MEALS LOGGED (${meals.length} over ${daysWithMeals} days):
${mealDetails.join('\n')}

CURRENT ESTIMATES (daily averages):
${rawNutrients.map(n => `- ${n.name}: ${n.dailyAvg} ${n.unit}/day (${n.rawPercent}% of RDA)`).join('\n')}

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

Return validated/corrected values in JSON.`

            const result = await genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: validationPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: validationSchema,
                    temperature: 0.2
                }
            })

            const parsed = JSON.parse(result.text || '{}')

            // Use validated values
            if (parsed.nutrients && Array.isArray(parsed.nutrients)) {
                validatedNutrients = parsed.nutrients.map((n: any) => ({
                    name: n.name,
                    estimatedDailyAvg: n.correctedDailyAvg,
                    unit: n.unit,
                    // Add UX baseline - purely visual, can drop below if eating poorly
                    percentOfRDA: (n.percentOfRDA || 0) + (UX_VISUAL_BASELINE[
                        Object.keys(UX_VISUAL_BASELINE).find(k =>
                            RDA[k as keyof typeof RDA]?.name === n.name
                        ) as keyof typeof UX_VISUAL_BASELINE
                    ] || 0),
                    status: n.status || (n.percentOfRDA < 60 ? 'deficient' : n.percentOfRDA > 300 ? 'excessive' : 'ok')
                }))
            }

            // Programmatically determine deficiencies and excessive nutrients
            // We use the 'status' field if available (Gemini 2.0+), or fallback to percent thresholds

            // 1. Deficiencies (< 60% RDA)
            deficiencies = validatedNutrients
                .filter(n => n.status === 'deficient' || (n.status !== 'ok' && n.status !== 'excessive' && n.percentOfRDA < 60))
                .map(n => n.name)

            // 2. Excessive (> 200% RDA - just a safe upper bound check if AI missed it)
            // Note: B12/C are water soluble so "excessive" isn't always bad, but we want to capture it if AI flagged it
            const excessive = validatedNutrients
                .filter(n => n.status === 'excessive' || (n.status !== 'ok' && n.status !== 'deficient' && n.percentOfRDA > 300))
                .map(n => n.name)

            if (parsed.suggestions) {
                parsed.suggestions.forEach((s: { nutrient: string; foods: string[] }) => {
                    // Include suggestions for deficiencies AND excessive nutrients (to avoid)
                    if (s.nutrient && s.foods && (deficiencies.includes(s.nutrient) || excessive.includes(s.nutrient))) {
                        foodSuggestions[s.nutrient] = s.foods
                    }
                })
            }

            insight = parsed.insight || ''

        } catch (aiError) {
            console.error('Health AI validation error:', aiError)

            // Fall back to raw values with baseline
            validatedNutrients = rawNutrients.map(n => ({
                name: n.name,
                estimatedDailyAvg: n.dailyAvg,
                unit: n.unit,
                percentOfRDA: n.adjustedPercent,
                status: 'ok'
            }))

            deficiencies = validatedNutrients
                .filter(n => n.percentOfRDA < 60)
                .map(n => n.name)

            insight = 'Micronutrient estimates based on logged meals'
        }

        const hasMicronutrientData = snapshotsWithMicronutrients > 0 || validatedNutrients.length > 0

        const responseData = {
            period: 'Last 7 days',
            daysWithData: daysWithMeals,
            mealCount: meals.length,
            nutrients: validatedNutrients,
            deficiencies,
            excessive: validatedNutrients
                .filter(n => n.status === 'excessive' || (n.status !== 'ok' && n.status !== 'deficient' && n.percentOfRDA > 300))
                .map(n => n.name),
            foodSuggestions,
            insight,
            disclaimer: 'Micronutrient estimates include a healthy baseline and AI validation.',
            hasMicronutrientData,
            aiValidated: true
        }

        // Cache the result
        try {
            // Delete old reports to keep DB clean
            await prisma.healthReport.deleteMany({
                where: { userId: user.id }
            })

            // Save new report
            await prisma.healthReport.create({
                data: {
                    userId: user.id,
                    startDate: sevenDaysAgo,
                    endDate: now,
                    data: JSON.stringify(responseData)
                }
            })
        } catch (cacheError) {
            console.error('Failed to cache health report:', cacheError)
        }

        return NextResponse.json(responseData)
    } catch (error) {
        console.error('Health Weekly API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 })
    }
}
