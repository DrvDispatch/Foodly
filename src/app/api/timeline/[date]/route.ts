import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI, Type } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// Schema for AI reflection
const reflectionSchema = {
    type: Type.OBJECT,
    properties: {
        reflection: {
            type: Type.STRING,
            description: 'A single sentence describing how the day unfolded nutritionally. Max 80 characters. No advice, just observation.'
        }
    },
    required: ['reflection']
}

/**
 * GET /api/timeline/[date]
 * 
 * Returns meals for a specific date with running totals and AI reflection.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { date } = await params

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Parse date
        const targetDate = new Date(date)
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)

        // Fetch meals for this date with active snapshot
        const meals = await prisma.meal.findMany({
            where: {
                userId: user.id,
                mealTime: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1
                }
            },
            orderBy: { mealTime: 'asc' }
        })

        // Calculate running totals
        let runningCalories = 0
        let runningProtein = 0
        let runningCarbs = 0
        let runningFat = 0

        const timelineMeals = meals.map((meal: any, index: number) => {
            const snapshot = meal.snapshots[0]
            const calories = snapshot?.calories || 0
            const protein = snapshot?.protein || 0
            const carbs = snapshot?.carbs || 0
            const fat = snapshot?.fat || 0

            runningCalories += calories
            runningProtein += protein
            runningCarbs += carbs
            runningFat += fat

            // Determine macro bias
            const total = protein + carbs + fat
            const proteinPct = total > 0 ? (protein / total) * 100 : 0
            const carbsPct = total > 0 ? (carbs / total) * 100 : 0
            const fatPct = total > 0 ? (fat / total) * 100 : 0

            let macroBias = 'balanced'
            if (carbsPct > 50) macroBias = 'carb-heavy'
            else if (proteinPct > 40) macroBias = 'protein-rich'
            else if (fatPct > 40) macroBias = 'fat-forward'

            return {
                id: meal.id,
                time: meal.mealTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
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
                    fat: runningFat
                },
                isFirst: index === 0,
                isLast: index === meals.length - 1
            }
        })

        // Get user's goals
        const profile = user.profile as any
        const calorieTarget = profile?.targetCal || 2000
        const proteinTarget = profile?.proteinTarget || 150

        // Generate AI reflection for the day (only if there are meals)
        let aiReflection = ''
        if (timelineMeals.length > 0) {
            try {
                // Calculate meal timing patterns
                const mealTimes = timelineMeals.map((m: any) => {
                    const time = new Date(`2000-01-01 ${m.time}`)
                    return time.getHours()
                })
                const avgMealHour = mealTimes.reduce((a: any, b: any) => a + b, 0) / mealTimes.length
                const morningCals = timelineMeals
                    .filter((m: any) => new Date(`2000-01-01 ${m.time}`).getHours() < 12)
                    .reduce((sum: any, m: any) => sum + m.calories, 0)
                const afternoonCals = timelineMeals
                    .filter((m: any) => {
                        const h = new Date(`2000-01-01 ${m.time}`).getHours()
                        return h >= 12 && h < 17
                    })
                    .reduce((sum: any, m: any) => sum + m.calories, 0)
                const eveningCals = timelineMeals
                    .filter((m: any) => new Date(`2000-01-01 ${m.time}`).getHours() >= 17)
                    .reduce((sum: any, m: any) => sum + m.calories, 0)

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
- "A lighter day overall with ${runningCalories} calories logged."

Return JSON with "reflection" field.`

                const result = await genAI.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: reflectionSchema,
                        temperature: 0.3
                    }
                })

                const parsed = JSON.parse(result.text || '{}')
                aiReflection = parsed.reflection || ''
            } catch (err) {
                console.error('Timeline AI reflection error:', err)
            }
        }

        return NextResponse.json({
            date,
            meals: timelineMeals,
            totals: {
                calories: runningCalories,
                protein: runningProtein,
                carbs: runningCarbs,
                fat: runningFat
            },
            targets: {
                calories: calorieTarget,
                protein: proteinTarget
            },
            aiReflection,
            mealCount: timelineMeals.length
        })

    } catch (error) {
        console.error('Timeline API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
    }
}
