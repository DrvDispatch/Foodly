import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { analyzeMeal, MealAnalysisResult } from '@/lib/gemini'

// POST /api/meals/[id]/reanalyze - Re-run AI analysis on existing meal
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const meal = await prisma.meal.findUnique({
            where: { id },
        })

        if (!meal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
        }

        if (meal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Mark as analyzing
        await prisma.meal.update({
            where: { id },
            data: { isAnalyzing: true },
        })

        // Start background analysis
        reanalyzeInBackground(id, meal.description || undefined, meal.photoUrl || undefined, meal.mealTime.toISOString())
            .catch(err => console.error('[Reanalyze] Background error:', err))

        return NextResponse.json({ success: true, message: 'Reanalysis started' })
    } catch (error) {
        console.error('Reanalyze meal error:', error)
        return NextResponse.json(
            { error: 'Failed to start reanalysis' },
            { status: 500 }
        )
    }
}

async function reanalyzeInBackground(
    mealId: string,
    description?: string,
    photoUrl?: string,
    mealTime?: string
) {
    console.log('[Reanalyze] Starting for meal:', mealId)

    try {
        // If we have a photo URL, we need to fetch it and convert to base64
        let photoBase64: string | undefined

        if (photoUrl) {
            try {
                // Read the file from public directory
                const fs = await import('fs/promises')
                const path = await import('path')
                const filePath = path.join(process.cwd(), 'public', photoUrl)
                const buffer = await fs.readFile(filePath)
                photoBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`
                console.log('[Reanalyze] Loaded photo from:', filePath)
            } catch (err) {
                console.error('[Reanalyze] Failed to load photo:', err)
            }
        }

        // Call Gemini for analysis
        const analysis = await analyzeMeal(
            description,
            photoBase64,
            mealTime,
            undefined
        )

        console.log('[Reanalyze] Analysis result:', {
            mealType: analysis.mealType,
            calories: analysis.totalNutrition.calories,
        })

        // Deactivate old snapshots
        await prisma.nutritionSnapshot.updateMany({
            where: { mealId, isActive: true },
            data: { isActive: false },
        })

        // Update meal with detected type
        await prisma.meal.update({
            where: { id: mealId },
            data: {
                type: analysis.mealType,
                title: analysis.title,
                isAnalyzing: false,
            },
        })

        // Create new nutrition snapshot with micronutrients
        const snapshot = await prisma.nutritionSnapshot.create({
            data: {
                mealId,
                version: 'ai_reanalysis',
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

        // Update meal to point to new snapshot
        await prisma.meal.update({
            where: { id: mealId },
            data: { activeSnapshotId: snapshot.id },
        })

        // Delete old meal items and create new ones
        await prisma.mealItem.deleteMany({
            where: { mealId },
        })

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

        console.log(`[Reanalyze] ✓ Completed for meal ${mealId}`)
    } catch (error) {
        console.error(`[Reanalyze] ✗ Failed for meal ${mealId}:`, error)

        // Mark as no longer analyzing
        await prisma.meal.update({
            where: { id: mealId },
            data: { isAnalyzing: false },
        })
    }
}
