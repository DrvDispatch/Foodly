import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto';

/**
 * Profile Service
 * 
 * Handles profile CRUD operations:
 * - Get profile by user ID
 * - Create/update profile (upsert)
 * - Auto-creates Goal record when nutrition targets are set
 */
@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get user's profile
     */
    async getProfile(userId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        return profile;
    }

    /**
     * Get profile or null if not exists (for bootstrap)
     */
    async getProfileOrNull(userId: string) {
        return this.prisma.profile.findUnique({
            where: { userId },
        });
    }

    /**
     * Create or update user's profile (upsert)
     * 
     * This migrates the logic from the Next.js POST /api/profile route:
     * - Upserts the profile record
     * - Creates a new Goal record if nutrition targets are provided
     * - Deactivates old goals when new ones are set
     */
    async upsertProfile(userId: string, dto: UpdateProfileDto) {
        // Prepare data for database
        const data = {
            sex: dto.sex,
            age: dto.age,
            heightCm: dto.heightCm,
            currentWeight: dto.currentWeight,
            targetWeight: dto.targetWeight,
            weeklyPace: dto.weeklyPace,
            activityLevel: dto.activityLevel,
            goalType: dto.goalType,
            secondaryFocus: dto.secondaryFocuses ? JSON.stringify(dto.secondaryFocuses) : undefined,
            unitSystem: dto.unitSystem,
            maintenanceCal: dto.maintenanceCal,
            targetCal: dto.targetCal,
            proteinTarget: dto.proteinTarget,
            carbTarget: dto.carbTarget,
            fatTarget: dto.fatTarget,
            onboarded: dto.onboarded,
            dietaryPrefs: dto.dietaryPrefs ? JSON.stringify(dto.dietaryPrefs) : undefined,
            allergies: dto.allergies ? JSON.stringify(dto.allergies) : undefined,
            timezone: dto.timezone,
        };

        // Remove undefined values (Prisma doesn't like them in updates)
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
        );

        // Upsert profile
        const profile = await this.prisma.profile.upsert({
            where: { userId },
            update: cleanData,
            create: {
                userId,
                ...cleanData,
            },
        });

        // If nutrition targets are provided, create/update Goal
        if (dto.targetCal) {
            // Deactivate all existing goals
            await this.prisma.goal.updateMany({
                where: { userId, isActive: true },
                data: { isActive: false },
            });

            // Create new active goal
            await this.prisma.goal.create({
                data: {
                    userId,
                    dailyCal: dto.targetCal,
                    proteinG: dto.proteinTarget || null,
                    carbsG: dto.carbTarget || null,
                    fatG: dto.fatTarget || null,
                    isActive: true,
                },
            });
        }

        return profile;
    }

    /**
     * Mark profile as onboarded
     */
    async markOnboarded(userId: string) {
        return this.prisma.profile.update({
            where: { userId },
            data: { onboarded: true },
        });
    }

    /**
     * Get user's active goal
     */
    async getActiveGoal(userId: string) {
        return this.prisma.goal.findFirst({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get user's macro targets (from profile)
     */
    async getMacroTargets(userId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: {
                targetCal: true,
                proteinTarget: true,
                carbTarget: true,
                fatTarget: true,
            },
        });

        if (!profile) {
            // Return default targets
            return {
                calories: 2000,
                protein: 150,
                carbs: 200,
                fat: 65,
            };
        }

        return {
            calories: profile.targetCal || 2000,
            protein: profile.proteinTarget || 150,
            carbs: profile.carbTarget || 200,
            fat: profile.fatTarget || 65,
        };
    }
}
