import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * PUT /api/weight/[id]
 * Update a weight entry
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    try {
        const body = await req.json()
        const { weight, date, note } = body

        // Verify ownership
        const existing = await prisma.weightEntry.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const updated = await prisma.weightEntry.update({
            where: { id },
            data: {
                weight: parseFloat(weight),
                date: new Date(date),
                note: note || null
            }
        })

        return NextResponse.json({ entry: updated })
    } catch (error) {
        console.error('Weight Update Error:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

/**
 * DELETE /api/weight/[id]
 * Delete a weight entry
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    try {
        // Verify ownership
        const existing = await prisma.weightEntry.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        await prisma.weightEntry.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Weight Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}
