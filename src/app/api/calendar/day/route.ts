import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { fromZonedTime } from 'date-fns-tz'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dayKey = searchParams.get('dayKey') // YYYY-MM-DD

    if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
        return NextResponse.json({ error: 'Invalid dayKey' }, { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // For fetching meals, we need the exact datetime range in UTC
        // We assume the dayKey "YYYY-MM-DD" effectively represents the user's local day
        // But our meals are stored with UTC `mealTime`.
        // We can't rely just on dayKey string matching if we don't know the user's offset here.
        // However, the `useDailyMeals` hook queries by generic ISO range.
        // For this API, let's look up the CalendarDaySummary and DayContext directly by key.
        // AND fetch meals by looking for a time range. We should strictly use the Profile timezone.

        // NOTE: In Phase 2 we are building the UI. The UI might reuse useDailyMeals for the list, 
        // OR we can return meals here. 
        // The spec says: "Returns: Meals list (already existing), summary, context".
        // So let's fetch meals too.

        // We need to construct the range based on the user's timezone if possible?
        // If not, we rely on the client passing explicit ranges, OR we guess UTC boundaries of that day string.
        // Wait, `DayKey` is derived from user TZ. 
        // So "2025-12-20" means 2025-12-20 00:00:00 in UserTZ.
        // We assume backend doesn't know UserTZ easily without querying profile?
        // We can query profile.

        // 1. Get Timezone (default to UTC if missing)
        const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
        const timeZone = profile?.timezone || 'UTC'

        // 2. Calculate Day Range in UTC
        // dayKey is "YYYY-MM-DD" in user's wall time. 
        // We need to find the UTC time that corresponds to 00:00 and 23:59:59.999 in that timezone.
        const startOfDayUser = fromZonedTime(`${dayKey} 00:00:00`, timeZone)
        const endOfDayUser = fromZonedTime(`${dayKey} 23:59:59.999`, timeZone)

        // 3. Fetch Data
        const [summary, context, meals] = await Promise.all([
            prisma.calendarDaySummary.findUnique({
                where: { userId_dayKey: { userId: user.id, dayKey } }
            }),
            prisma.dayContext.findUnique({
                where: { userId_dayKey: { userId: user.id, dayKey } }
            }),
            prisma.meal.findMany({
                where: {
                    userId: user.id,
                    mealTime: {
                        gte: startOfDayUser,
                        lte: endOfDayUser
                    }
                },
                include: { snapshots: true },
                orderBy: { mealTime: 'desc' }
            })
        ])

        // 4. Transform Meals to include "activeSnapshot" property
        const processedMeals = meals.map((meal: any) => {
            const active = meal.snapshots.find((s: any) => s.id === meal.activeSnapshotId) || meal.snapshots[0]
            return {
                ...meal,
                activeSnapshot: active
            }
        })

        const response = {
            dayKey,
            summary: summary || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                mealCount: 0
            },
            context: context ? {
                tags: safeJsonParse(context.tags, []),
                note: context.note
            } : null,
            meals: processedMeals
        }

        return NextResponse.json(response)

    } catch (error) {
        console.error('Day Detail API Error:', error)
        // @ts-ignore
        const msg = error?.message || 'Unknown error'
        return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 })
    }
}

function safeJsonParse(str: string, fallback: any) {
    try {
        return JSON.parse(str)
    } catch (e) {
        console.warn('Failed to parse tags JSON:', str)
        return fallback
    }
}
