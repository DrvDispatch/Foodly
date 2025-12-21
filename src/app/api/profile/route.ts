import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
        })

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Get profile error:', error)
        return NextResponse.json(
            { error: 'Failed to get profile' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            sex,
            age,
            heightCm,
            currentWeight,
            targetWeight,
            weeklyPace,
            activityLevel,
            goalType,
            unitSystem,
            maintenanceCal,
            targetCal,
            proteinTarget,
            carbTarget,
            fatTarget,
            onboarded,
            dietaryPrefs,
            allergies,
        } = body

        // Upsert profile
        const profile = await prisma.profile.upsert({
            where: { userId: session.user.id },
            update: {
                sex,
                age,
                heightCm,
                currentWeight,
                targetWeight,
                weeklyPace,
                activityLevel,
                goalType,
                unitSystem,
                maintenanceCal,
                targetCal,
                proteinTarget,
                carbTarget,
                fatTarget,
                onboarded,
                dietaryPrefs: dietaryPrefs ? JSON.stringify(dietaryPrefs) : undefined,
                allergies: allergies ? JSON.stringify(allergies) : undefined,
            },
            create: {
                userId: session.user.id,
                sex,
                age,
                heightCm,
                currentWeight,
                targetWeight,
                weeklyPace,
                activityLevel,
                goalType,
                unitSystem,
                maintenanceCal,
                targetCal,
                proteinTarget,
                carbTarget,
                fatTarget,
                onboarded,
                dietaryPrefs: dietaryPrefs ? JSON.stringify(dietaryPrefs) : undefined,
                allergies: allergies ? JSON.stringify(allergies) : undefined,
            },
        })

        // Create or update active goal
        if (targetCal) {
            await prisma.goal.updateMany({
                where: { userId: session.user.id, isActive: true },
                data: { isActive: false },
            })

            await prisma.goal.create({
                data: {
                    userId: session.user.id,
                    dailyCal: targetCal,
                    proteinG: proteinTarget,
                    carbsG: carbTarget,
                    fatG: fatTarget,
                    isActive: true,
                },
            })
        }

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Update profile error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request) {
    return POST(request) // Same logic for partial updates
}
