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

        // Get context for reply
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [profile, recentMessages, todayMeals] = await Promise.all([
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
        ]);

        // Build meal descriptions
        const buildMealDescription = (meal: typeof todayMeals[0]) => {
            if (meal.items && meal.items.length > 0) {
                return meal.items.map((item) => {
                    const portion = item.portionDesc || '';
                    return portion ? `${item.name} (${portion})` : item.name;
                }).join(', ');
            }
            return meal.description || meal.type;
        };

        // Calculate daily summary
        const daySummary = todayMeals.reduce(
            (acc, meal) => {
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

        // Build meal context
        const mealContext = todayMeals.map((m) => {
            const desc = buildMealDescription(m);
            const snapshot = m.snapshots[0];
            if (snapshot) {
                return `${desc} (${snapshot.calories} cal, ${Math.round(snapshot.protein)}g protein)`;
            }
            return desc;
        });

        // Generate coach reply
        const reply = await this.coachAiService.generateCoachReply({
            question,
            profile: profile ? {
                goalType: profile.goalType || undefined,
                targetCal: profile.targetCal || undefined,
                proteinTarget: profile.proteinTarget || undefined,
            } : null,
            recentMessages: recentMessages.reverse().map((m) => ({
                role: m.role,
                content: m.content,
            })),
            daySummary,
            meals: mealContext,
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
}
