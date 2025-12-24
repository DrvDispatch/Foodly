import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CoachService } from '../ai/coach.service';
import { SendMessageDto } from './dto';

/**
 * Coach Module Service
 * 
 * Handles coach conversation logic:
 * - Get paginated messages
 * - Send user questions and generate AI replies
 * - Manage coach state (unread)
 */
@Injectable()
export class CoachModuleService {
    constructor(
        private prisma: PrismaService,
        private coachAiService: CoachService,
    ) { }

    /**
     * Get messages (paginated, last N days)
     */
    async getMessages(userId: string, options: { cursor?: string; limit?: number; days?: number }) {
        const { cursor, limit = 50, days = 7 } = options;

        const since = new Date();
        since.setDate(since.getDate() - days);
        since.setHours(0, 0, 0, 0);

        const messages = await this.prisma.coachMessage.findMany({
            where: {
                userId,
                createdAt: cursor ? undefined : { gte: since },
                ...(cursor ? { id: { lt: cursor } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Return in chronological order for display
        const chronological = messages.reverse();

        return {
            messages: chronological,
            nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
        };
    }

    /**
     * Send user question and generate coach reply
     */
    async sendMessage(userId: string, dto: SendMessageDto) {
        const { question } = dto;
        const today = new Date().toISOString().split('T')[0];

        // Save user's question
        const userMessage = await this.prisma.coachMessage.create({
            data: {
                userId,
                role: 'user',
                type: 'question',
                content: question.trim(),
                date: today,
            },
        });

        // Get context for reply - expanded to 7 days for better history
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [profile, recentMessages, todayMeals, weekMeals] = await Promise.all([
            this.prisma.profile.findUnique({ where: { userId } }),
            this.prisma.coachMessage.findMany({
                where: { userId, date: today },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: {
                        gte: new Date(today + 'T00:00:00'),
                        lte: new Date(today + 'T23:59:59'),
                    },
                },
                include: {
                    snapshots: { where: { isActive: true } },
                    items: true,
                },
            }),
            // Last 7 days of meals for context
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: weekAgo },
                },
                include: {
                    snapshots: { where: { isActive: true } },
                    items: true,
                },
                orderBy: { mealTime: 'desc' },
                take: 30,
            }),
        ]);

        // Type alias for meal with items and snapshots
        type MealWithDetails = typeof todayMeals[number];

        // Helper to build rich meal description from items
        const buildMealDescription = (meal: MealWithDetails): string => {
            if (meal.items && meal.items.length > 0) {
                const itemDescriptions = meal.items.map((item: typeof meal.items[number]) => {
                    const portion = item.portionDesc || '';
                    return portion ? `${item.name} (${portion})` : item.name;
                });
                return itemDescriptions.join(', ');
            }
            return meal.description || meal.type;
        };

        // Calculate daily summary
        const daySummary = todayMeals.reduce(
            (acc: { calories: number; protein: number; carbs: number; fat: number }, meal: MealWithDetails) => {
                const snapshot = meal.snapshots[0];
                if (snapshot) {
                    acc.calories += snapshot.calories;
                    acc.protein += snapshot.protein;
                    acc.carbs += snapshot.carbs;
                    acc.fat += snapshot.fat;
                }
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        // Build rich meal context with detailed descriptions
        const mealContext = todayMeals.map((m: MealWithDetails) => {
            const desc = buildMealDescription(m);
            const snapshot = m.snapshots[0];
            if (snapshot) {
                return `${desc} (${snapshot.calories} cal, ${Math.round(snapshot.protein)}g protein)`;
            }
            return desc;
        });

        // Add recent days summary for context (last 7 days excluding today)
        const recentDaysSummary = weekMeals
            .filter((m: MealWithDetails) => m.mealTime.toISOString().split('T')[0] !== today)
            .slice(0, 10)
            .map((m: MealWithDetails) => `${m.mealTime.toISOString().split('T')[0]}: ${buildMealDescription(m)}`)
            .join('; ');

        // Generate coach reply with expanded context
        const reply = await this.coachAiService.generateCoachReply({
            question,
            profile: profile ? {
                goalType: profile.goalType || undefined,
                targetCal: profile.targetCal || undefined,
                proteinTarget: profile.proteinTarget || undefined,
                dietaryPrefs: profile.dietaryPrefs ? JSON.parse(profile.dietaryPrefs) : undefined,
            } : null,
            recentMessages: recentMessages.reverse().map((m: typeof recentMessages[number]) => ({
                role: m.role,
                content: m.content,
            })),
            daySummary,
            meals: [...mealContext, recentDaysSummary ? `[Recent days: ${recentDaysSummary}]` : ''].filter(Boolean),
        });

        // Save coach's reply
        const coachMessage = await this.prisma.coachMessage.create({
            data: {
                userId,
                role: 'coach',
                type: 'reply',
                content: reply,
                date: today,
            },
        });

        return { userMessage, coachMessage };
    }

    /**
     * Get coach state (unread status)
     */
    async getCoachState(userId: string) {
        const state = await this.prisma.coachState.findUnique({
            where: { userId },
        });

        return {
            hasUnread: state?.hasUnread || false,
            lastReflectionDate: state?.lastReflectionDate || null,
        };
    }

    /**
     * Mark messages as read
     */
    async markAsRead(userId: string) {
        await this.prisma.coachState.upsert({
            where: { userId },
            create: { userId, hasUnread: false },
            update: { hasUnread: false },
        });

        return { success: true };
    }

    /**
     * Generate daily reflection (if after 8pm and not already generated)
     */
    async generateReflection(userId: string) {
        const today = new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();

        // Only generate after 8pm
        if (currentHour < 20) {
            return { generated: false, reason: 'Too early' };
        }

        // Check if already generated today
        const state = await this.prisma.coachState.findUnique({
            where: { userId },
        });

        if (state?.lastReflectionDate === today) {
            return { generated: false, reason: 'Already generated' };
        }

        // Get today's meals
        const todayStart = new Date(today + 'T00:00:00');
        const todayEnd = new Date(today + 'T23:59:59');

        const [meals, profile, recentReflections] = await Promise.all([
            this.prisma.meal.findMany({
                where: {
                    userId,
                    mealTime: { gte: todayStart, lte: todayEnd },
                },
                include: {
                    snapshots: { where: { isActive: true } },
                },
            }),
            this.prisma.profile.findUnique({ where: { userId } }),
            this.prisma.coachMessage.findMany({
                where: {
                    userId,
                    type: 'reflection',
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);

        if (meals.length === 0) {
            return { generated: false, reason: 'No meals today' };
        }

        // Type alias for meal with snapshots
        type MealWithSnapshot = typeof meals[number];

        // Calculate day summary
        const daySummary = meals.reduce(
            (acc: { calories: number; protein: number; carbs: number; fat: number }, meal: MealWithSnapshot) => {
                const snapshot = meal.snapshots[0];
                if (snapshot) {
                    acc.calories += snapshot.calories;
                    acc.protein += snapshot.protein;
                    acc.carbs += snapshot.carbs;
                    acc.fat += snapshot.fat;
                }
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        // Generate reflection using AI service
        const reflection = await this.coachAiService.generateDailyReflection({
            profile: profile ? {
                goalType: profile.goalType || undefined,
                targetCal: profile.targetCal || undefined,
                proteinTarget: profile.proteinTarget || undefined,
            } : null,
            daySummary,
            meals: meals.map((m: MealWithSnapshot) => ({
                description: m.description || m.type,
                nutrition: m.snapshots[0] ? {
                    calories: m.snapshots[0].calories,
                    protein: m.snapshots[0].protein,
                    carbs: m.snapshots[0].carbs,
                    fat: m.snapshots[0].fat,
                } : null,
            })),
            recentReflections: recentReflections.map((r: typeof recentReflections[number]) => r.content),
        });

        // Save reflection
        const message = await this.prisma.coachMessage.create({
            data: {
                userId,
                role: 'coach',
                type: 'reflection',
                content: reflection,
                date: today,
                daySnapshot: JSON.stringify({
                    ...daySummary,
                    mealCount: meals.length,
                    meals: meals.map((m: MealWithSnapshot) => m.description || m.type),
                }),
            },
        });

        // Update state
        await this.prisma.coachState.upsert({
            where: { userId },
            update: { lastReflectionDate: today, hasUnread: true },
            create: { userId, lastReflectionDate: today, hasUnread: true },
        });

        return { generated: true, message };
    }
}
