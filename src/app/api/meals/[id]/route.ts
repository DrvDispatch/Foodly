import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/meals/[id] - Get single meal
export async function GET(
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
            include: {
                items: true,
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
        })

        if (!meal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
        }

        // Check ownership
        if (meal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        return NextResponse.json({
            ...meal,
            activeSnapshot: meal.snapshots[0] || null,
            snapshots: undefined,
        })
    } catch (error) {
        console.error('Get meal error:', error)
        return NextResponse.json(
            { error: 'Failed to get meal' },
            { status: 500 }
        )
    }
}

// PATCH /api/meals/[id] - Update meal description and/or nutrition
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { description, calories, protein, carbs, fat } = body

        const meal = await prisma.meal.findUnique({
            where: { id },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
        })

        if (!meal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
        }

        if (meal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Update meal description if provided
        if (description !== undefined) {
            await prisma.meal.update({
                where: { id },
                data: { description },
            })
        }

        // Update nutrition snapshot if values provided
        if (calories !== undefined || protein !== undefined || carbs !== undefined || fat !== undefined) {
            const activeSnapshot = meal.snapshots[0]

            if (activeSnapshot) {
                // Update existing snapshot
                await prisma.nutritionSnapshot.update({
                    where: { id: activeSnapshot.id },
                    data: {
                        ...(calories !== undefined && { calories }),
                        ...(protein !== undefined && { protein }),
                        ...(carbs !== undefined && { carbs }),
                        ...(fat !== undefined && { fat }),
                        version: 'user_edit',
                    },
                })
            } else {
                // Create new snapshot with user values
                const snapshot = await prisma.nutritionSnapshot.create({
                    data: {
                        mealId: id,
                        version: 'user_edit',
                        calories: calories || 0,
                        protein: protein || 0,
                        carbs: carbs || 0,
                        fat: fat || 0,
                        confidence: 1.0, // User-entered = 100% confidence
                        isActive: true,
                    },
                })

                await prisma.meal.update({
                    where: { id },
                    data: { activeSnapshotId: snapshot.id },
                })
            }
        }

        // Fetch and return updated meal
        const updatedMeal = await prisma.meal.findUnique({
            where: { id },
            include: {
                items: true,
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
        })

        return NextResponse.json({
            ...updatedMeal,
            activeSnapshot: updatedMeal?.snapshots[0] || null,
            snapshots: undefined,
        })
    } catch (error) {
        console.error('Update meal error:', error)
        return NextResponse.json(
            { error: 'Failed to update meal' },
            { status: 500 }
        )
    }
}

// DELETE /api/meals/[id] - Delete meal
export async function DELETE(
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

        await prisma.meal.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete meal error:', error)
        return NextResponse.json(
            { error: 'Failed to delete meal' },
            { status: 500 }
        )
    }
}
