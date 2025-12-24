import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWeightDto } from './dto';

/**
 * Weight Service
 * 
 * Handles weight tracking operations:
 * - List entries with profile context
 * - Add new entry (updates profile.currentWeight)
 * - Delete entry
 * - Get full history
 */
@Injectable()
export class WeightService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get weight entries with profile context
     */
    async getWeightEntries(userId: string, limit: number = 30) {
        const [entries, profile] = await Promise.all([
            this.prisma.weightEntry.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: limit,
            }),
            this.prisma.profile.findUnique({
                where: { userId },
                select: {
                    targetWeight: true,
                    currentWeight: true,
                    startingWeight: true,
                    unitSystem: true,
                    goalType: true,
                    weeklyPace: true,
                },
            }),
        ]);

        return {
            entries,
            targetWeight: profile?.targetWeight,
            currentWeight: profile?.currentWeight,
            startingWeight: profile?.startingWeight,
            unitSystem: profile?.unitSystem || 'metric',
            goalType: profile?.goalType,
            weeklyPace: profile?.weeklyPace,
        };
    }

    /**
     * Add a new weight entry
     * Also updates currentWeight in profile
     */
    async addWeightEntry(userId: string, dto: CreateWeightDto) {
        const { weight, date, note } = dto;

        // Create weight entry
        const entry = await this.prisma.weightEntry.create({
            data: {
                userId,
                weight,
                date: date ? new Date(date) : new Date(),
                note: note || null,
            },
        });

        // Update current weight in profile
        await this.prisma.profile.update({
            where: { userId },
            data: { currentWeight: weight },
        });

        return { success: true, entry };
    }

    /**
     * Delete a weight entry
     */
    async deleteWeightEntry(userId: string, entryId: string) {
        // Verify ownership and delete
        const result = await this.prisma.weightEntry.deleteMany({
            where: { id: entryId, userId },
        });

        if (result.count === 0) {
            throw new NotFoundException('Weight entry not found');
        }

        return { success: true };
    }

    /**
     * Update a weight entry
     */
    async updateWeightEntry(userId: string, entryId: string, dto: { weight?: number; date?: string; note?: string | null }) {
        // Verify ownership
        const existing = await this.prisma.weightEntry.findFirst({
            where: { id: entryId, userId },
        });

        if (!existing) {
            throw new NotFoundException('Weight entry not found');
        }

        // Update the entry
        const entry = await this.prisma.weightEntry.update({
            where: { id: entryId },
            data: {
                ...(dto.weight !== undefined && { weight: dto.weight }),
                ...(dto.date !== undefined && { date: new Date(dto.date) }),
                ...(dto.note !== undefined && { note: dto.note }),
            },
        });

        // Update current weight in profile if this is the most recent entry
        if (dto.weight !== undefined) {
            const latestEntry = await this.prisma.weightEntry.findFirst({
                where: { userId },
                orderBy: { date: 'desc' },
            });
            if (latestEntry?.id === entryId) {
                await this.prisma.profile.update({
                    where: { userId },
                    data: { currentWeight: dto.weight },
                });
            }
        }

        return { success: true, entry };
    }

    /**
     * Get weight history (more entries)
     */
    async getWeightHistory(userId: string) {
        const entries = await this.prisma.weightEntry.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 100, // Limit for performance
        });

        return { entries };
    }

    /**
     * Get latest weight entry
     */
    async getLatestWeight(userId: string) {
        return this.prisma.weightEntry.findFirst({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    }
}
