import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedBots() {
    console.log('Seeding bot users...');
    const passwordHash = await bcrypt.hash('test123', 10);

    for (let i = 1; i <= 10; i++) {
        const email = `bot${i}@test.com`;
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: passwordHash,
                name: `Bot ${i}`,
            },
        });
    }
}

seedBots()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
