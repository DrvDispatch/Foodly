import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/export
 * Exports all user data as JSON
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Fetch all user data
        const [profile, meals, weightEntries, goals] = await Promise.all([
            prisma.profile.findUnique({ where: { userId: session.user.id } }),
            prisma.meal.findMany({
                where: { userId: session.user.id },
                include: {
                    items: true,
                    snapshots: { where: { isActive: true }, take: 1 }
                },
                orderBy: { mealTime: 'desc' }
            }),
            prisma.weightEntry.findMany({
                where: { userId: session.user.id },
                orderBy: { date: 'desc' }
            }),
            prisma.goal.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' }
            })
        ])

        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            profile: profile ? {
                goalType: profile.goalType,
                sex: profile.sex,
                age: profile.age,
                heightCm: profile.heightCm,
                currentWeight: profile.currentWeight,
                targetWeight: profile.targetWeight,
                activityLevel: profile.activityLevel,
                unitSystem: profile.unitSystem,
                targetCal: profile.targetCal,
                proteinTarget: profile.proteinTarget,
                carbTarget: profile.carbTarget,
                fatTarget: profile.fatTarget,
                dietaryPrefs: profile.dietaryPrefs,
                allergies: profile.allergies
            } : null,
            meals: meals.map(m => ({
                type: m.type,
                description: m.description,
                mealTime: m.mealTime,
                items: m.items.map(item => ({
                    name: item.name,
                    portion: item.portionDesc,
                    gramsEst: item.gramsEst,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat
                })),
                nutrition: m.snapshots[0] ? {
                    calories: m.snapshots[0].calories,
                    protein: m.snapshots[0].protein,
                    carbs: m.snapshots[0].carbs,
                    fat: m.snapshots[0].fat
                } : null
            })),
            weightEntries: weightEntries.map(w => ({
                weight: w.weight,
                date: w.date,
                note: w.note
            })),
            goals: goals.map(g => ({
                dailyCal: g.dailyCal,
                proteinG: g.proteinG,
                carbsG: g.carbsG,
                fatG: g.fatG,
                isActive: g.isActive,
                createdAt: g.createdAt
            }))
        }

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="foodly-export-${new Date().toISOString().split('T')[0]}.json"`
            }
        })

    } catch (error) {
        console.error('Export Error:', error)
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }
}
