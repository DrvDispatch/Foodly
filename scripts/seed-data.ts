
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding calendar data...')

    // 1. Find a user (Demo user or first user)
    const user = await prisma.user.findFirst({
        where: {
            // Try to find a user that looks like a demo user, or just take the first one
            // You can adjust this if you know the specific email
        }
    })

    if (!user) {
        console.error('❌ No user found. Please sign up first.')
        process.exit(1)
    }

    console.log(`👤 Seeding data for user: ${user.email} (${user.id})`)

    // 2. Generate 7 days of data (ending today)
    const today = new Date()

    for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dayKey = date.toISOString().split('T')[0] // Simple YYYY-MM-DD for this script

        console.log(`   Processing ${dayKey}...`)

        // Randomize stats
        const calories = Math.floor(Math.random() * (2500 - 1500) + 1500)
        const protein = Math.floor(Math.random() * (180 - 80) + 80)
        const carbs = Math.floor(Math.random() * (300 - 150) + 150)
        const fat = Math.floor(Math.random() * (80 - 40) + 40)
        const mealCount = Math.floor(Math.random() * 3) + 1

        // Determine status (mock logic)
        // Random patterns
        const isTraining = Math.random() > 0.5
        const isTravel = Math.random() > 0.8
        const isLowProtein = protein < 100

        // 3. Upsert Summary
        await prisma.calendarDaySummary.upsert({
            where: { userId_dayKey: { userId: user.id, dayKey } },
            create: {
                userId: user.id,
                dayKey,
                calories,
                protein,
                carbs,
                fat,
                mealCount
            },
            update: {
                calories,
                protein,
                carbs,
                fat,
                mealCount
            }
        })

        // 4. Upsert Context
        const tags = []
        if (isTraining) tags.push('training')
        if (isTravel) tags.push('travel')

        // Only add context sometimes
        if (tags.length > 0) {
            await prisma.dayContext.upsert({
                where: { userId_dayKey: { userId: user.id, dayKey } },
                create: {
                    userId: user.id,
                    dayKey,
                    tags: JSON.stringify(tags),
                    note: `Mock data for ${dayKey}`
                },
                update: {
                    tags: JSON.stringify(tags)
                }
            })
        }
    }

    console.log('✅ Seeding complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
