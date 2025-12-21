import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const contextSchema = z.object({
    dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tags: z.array(z.string()),
    note: z.string().optional()
})

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { dayKey, tags, note } = contextSchema.parse(body)

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const context = await prisma.dayContext.upsert({
            where: {
                userId_dayKey: {
                    userId: user.id,
                    dayKey
                }
            },
            create: {
                userId: user.id,
                dayKey,
                tags: JSON.stringify(tags),
                note
            },
            update: {
                tags: JSON.stringify(tags),
                note
            }
        })

        return NextResponse.json(context)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
        }
        console.error('Context API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dayKey = searchParams.get('dayKey')

    if (!dayKey) {
        return NextResponse.json({ error: 'Missing dayKey params' }, { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        await prisma.dayContext.delete({
            where: {
                userId_dayKey: {
                    userId: user.id,
                    dayKey
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // Record might not exist, strictly speaking dependent on requirements, 
        // but idempotency is nice. Prisma throws if not found though.
        return NextResponse.json({ error: 'Failed to delete or not found' }, { status: 500 })
    }
}
