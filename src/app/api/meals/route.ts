import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { analyzeMeal, MealAnalysisResult } from '@/lib/gemini'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET /api/meals - List meals
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        const meals = await prisma.meal.findMany({
            where: {
                userId: session.user.id,
                ...(from && to
                    ? {
                        mealTime: {
                            gte: new Date(from),
                            lt: new Date(to),
                        },
                    }
                    : {}),
            },
            include: {
                items: true,
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
            orderBy: { mealTime: 'desc' },
        })

        // Transform to include active snapshot at top level
        const transformed = meals.map((meal: any) => ({
            ...meal,
            activeSnapshot: meal.snapshots[0] || null,
            snapshots: undefined,
        }))

        return NextResponse.json(transformed)
    } catch (error) {
        console.error('List meals error:', error)
        return NextResponse.json(
            { error: 'Failed to list meals' },
            { status: 500 }
        )
    }
}

// POST /api/meals - Create meal and analyze
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { description, photoBase64, additionalPhotos, mealTime } = body

        console.log('[API /meals POST] Received request:', {
            hasDescription: !!description,
            hasPhoto: !!photoBase64,
            additionalPhotosCount: additionalPhotos?.length || 0,
            mealTime,
        })

        if (!description && !photoBase64) {
            return NextResponse.json(
                { error: 'Please provide a description or photo' },
                { status: 400 }
            )
        }

        // Save photo if provided
        let photoUrl: string | null = null
        if (photoBase64) {
            try {
                const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
                const buffer = Buffer.from(base64Data, 'base64')

                const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
                await mkdir(uploadsDir, { recursive: true })

                const filename = `meal-${Date.now()}.jpg`
                const filepath = path.join(uploadsDir, filename)
                await writeFile(filepath, buffer)

                photoUrl = `/uploads/${filename}`
                console.log('[API /meals POST] Saved photo:', photoUrl)
            } catch (err) {
                console.error('[API /meals POST] Failed to save photo:', err)
            }
        }

        // Create meal immediately with isAnalyzing = true (non-blocking)
        const meal = await prisma.meal.create({
            data: {
                userId: session.user.id,
                type: 'analyzing', // Will be updated by AI
                description,
                photoUrl,
                mealTime: mealTime ? new Date(mealTime) : new Date(),
                isAnalyzing: true,
            },
        })
        console.log('[API /meals POST] Created meal:', meal.id)

        // Return meal immediately so UI can show skeleton
        const immediateResponse = NextResponse.json({
            ...meal,
            activeSnapshot: null,
            items: [],
        })

        // Analyze in background (fire and forget for immediate response)
        // Use setImmediate/setTimeout to ensure it runs after response is sent
        console.log('[API /meals POST] Starting background analysis...')
        setImmediate(() => {
            analyzeInBackground(meal.id, description, photoBase64, additionalPhotos, mealTime)
                .catch(err => console.error('[API /meals POST] Background analysis failed:', err))
        })

        return immediateResponse
    } catch (error) {
        console.error('[API /meals POST] Create meal error:', error)
        return NextResponse.json(
            { error: 'Failed to create meal' },
            { status: 500 }
        )
    }
}

// Background analysis function
async function analyzeInBackground(
    mealId: string,
    description?: string,
    photoBase64?: string,
    additionalPhotos?: string[],
    mealTime?: string
) {
    console.log('[Background] Starting analysis for meal:', mealId)
    console.log('[Background] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY)

    try {
        // Call Gemini for analysis
        console.log('[Background] Calling analyzeMeal...')
        const analysis = await analyzeMeal(
            description,
            photoBase64,
            mealTime || new Date().toISOString(),
            additionalPhotos
        )
        console.log('[Background] Analysis result:', {
            mealType: analysis.mealType,
            calories: analysis.totalNutrition.calories,
            itemCount: analysis.items.length,
        })

        // Update meal with detected type and AI-generated description
        await prisma.meal.update({
            where: { id: mealId },
            data: {
                type: analysis.mealType,
                title: analysis.title,
                description: analysis.description || description, // Use AI description if available
                isAnalyzing: false,
            },
        })
        console.log('[Background] Updated meal type to:', analysis.mealType, 'description:', analysis.description?.substring(0, 50))

        // Create nutrition snapshot with macros AND micronutrients
        const snapshot = await prisma.nutritionSnapshot.create({
            data: {
                mealId,
                version: 'ai_v1',
                calories: Math.round(analysis.totalNutrition.calories),
                protein: Math.round(analysis.totalNutrition.protein * 10) / 10,
                carbs: Math.round(analysis.totalNutrition.carbs * 10) / 10,
                fat: Math.round(analysis.totalNutrition.fat * 10) / 10,
                fiber: analysis.totalNutrition.fiber ? Math.round(analysis.totalNutrition.fiber * 10) / 10 : null,
                // Micronutrients
                vitaminD: analysis.totalNutrition.vitaminD || null,
                vitaminC: analysis.totalNutrition.vitaminC || null,
                vitaminB12: analysis.totalNutrition.vitaminB12 || null,
                iron: analysis.totalNutrition.iron || null,
                calcium: analysis.totalNutrition.calcium || null,
                magnesium: analysis.totalNutrition.magnesium || null,
                zinc: analysis.totalNutrition.zinc || null,
                potassium: analysis.totalNutrition.potassium || null,
                // Metadata
                confidence: analysis.overallConfidence,
                qualityScore: analysis.qualityScore,
                notes: analysis.notes ? JSON.stringify(analysis.notes) : null,
                isActive: true,
            },
        })
        console.log('[Background] Created snapshot with micronutrients:', snapshot.id)

        // Update meal to point to active snapshot
        await prisma.meal.update({
            where: { id: mealId },
            data: {
                activeSnapshotId: snapshot.id,
            },
        })

        // Create meal items
        for (const item of analysis.items) {
            await prisma.mealItem.create({
                data: {
                    mealId,
                    name: item.name,
                    portionDesc: item.portionDescription,
                    gramsEst: item.estimatedGrams,
                    calories: Math.round(item.calories),
                    protein: Math.round(item.protein * 10) / 10,
                    carbs: Math.round(item.carbs * 10) / 10,
                    fat: Math.round(item.fat * 10) / 10,
                    confidence: item.confidence,
                },
            })
        }
        console.log('[Background] Created', analysis.items.length, 'meal items')

        console.log(`[Background] ✓ Completed analysis for meal ${mealId}: ${analysis.mealType} - ${analysis.totalNutrition.calories} kcal`)
    } catch (error) {
        console.error(`[Background] ✗ Failed to analyze meal ${mealId}:`, error)

        // Mark as no longer analyzing even on failure
        await prisma.meal.update({
            where: { id: mealId },
            data: {
                type: 'unknown',
                isAnalyzing: false,
            },
        })
    }
}
