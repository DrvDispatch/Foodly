import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateDemoUserId } from '@/lib/utils'

export async function POST() {
    try {
        // Check if demo mode is enabled
        if (process.env.DEMO_MODE_ENABLED !== 'true') {
            return NextResponse.json(
                { error: 'Demo mode is not enabled' },
                { status: 403 }
            )
        }

        // Create a demo user
        const demoId = generateDemoUserId()
        const demoEmail = `${demoId}@demo.nutri.app`

        const user = await prisma.user.create({
            data: {
                id: demoId,
                email: demoEmail,
                name: 'Demo User',
                isDemo: true,
                profile: {
                    create: {
                        sex: 'male',
                        age: 30,
                        heightCm: 175,
                        currentWeight: 75,
                        targetWeight: 70,
                        activityLevel: 'moderate',
                        goalType: 'lose',
                        weeklyPace: 0.5,
                        maintenanceCal: 2400,
                        targetCal: 1900,
                        proteinTarget: 150,
                        carbTarget: 190,
                        fatTarget: 60,
                        onboarded: true,
                        unitSystem: 'metric',
                    },
                },
                goals: {
                    create: {
                        dailyCal: 1900,
                        proteinG: 150,
                        carbsG: 190,
                        fatG: 60,
                        isActive: true,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        })

        // Create some sample meals for demo
        const today = new Date()
        const meals = [
            {
                userId: user.id,
                type: 'breakfast',
                description: 'Oatmeal with berries and almond butter',
                mealTime: new Date(today.setHours(8, 30, 0, 0)),
            },
            {
                userId: user.id,
                type: 'lunch',
                description: 'Grilled chicken salad with avocado',
                mealTime: new Date(today.setHours(12, 30, 0, 0)),
            },
        ]

        for (const mealData of meals) {
            const meal = await prisma.meal.create({
                data: mealData,
            })

            // Create sample nutrition snapshot
            await prisma.nutritionSnapshot.create({
                data: {
                    mealId: meal.id,
                    version: 'ai_v1',
                    calories: mealData.type === 'breakfast' ? 420 : 550,
                    protein: mealData.type === 'breakfast' ? 15 : 45,
                    carbs: mealData.type === 'breakfast' ? 55 : 25,
                    fat: mealData.type === 'breakfast' ? 18 : 32,
                    fiber: mealData.type === 'breakfast' ? 8 : 12,
                    confidence: 0.85,
                    isActive: true,
                },
            })

            // Update meal with active snapshot
            await prisma.meal.update({
                where: { id: meal.id },
                data: { activeSnapshotId: meal.id },
            })
        }

        return NextResponse.json({
            message: 'Demo session created',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Demo creation error:', error)
        return NextResponse.json(
            { error: 'Failed to create demo session' },
            { status: 500 }
        )
    }
}
