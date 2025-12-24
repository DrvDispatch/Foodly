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

        // Check if this is initial profile creation (for startingWeight)
        const existingProfile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { startingWeight: true },
        });

        // Set startingWeight only if not already set and currentWeight is provided
        const createData = {
            userId,
            ...cleanData,
            // Set startingWeight on initial creation if currentWeight is provided
            ...(dto.currentWeight && { startingWeight: dto.currentWeight }),
        };

        const updateData = {
            ...cleanData,
            // Only set startingWeight if it's not already set
            ...(dto.currentWeight && !existingProfile?.startingWeight && { startingWeight: dto.currentWeight }),
        };

        // Upsert profile
        const profile = await this.prisma.profile.upsert({
            where: { userId },
            update: updateData,
            create: createData,
        });

        // Auto-create initial weight entry from onboarding if:
        // 1. currentWeight is provided
        // 2. This is the first time (startingWeight was not set before)
        // 3. User has no weight entries yet
        if (dto.currentWeight && !existingProfile?.startingWeight) {
            const existingWeightEntries = await this.prisma.weightEntry.count({
                where: { userId },
            });

            if (existingWeightEntries === 0) {
                await this.prisma.weightEntry.create({
                    data: {
                        userId,
                        weight: dto.currentWeight,
                        date: new Date(),
                        note: 'Starting weight from onboarding',
                    },
                });
                console.log('[ProfileService] Created initial weight entry from onboarding:', dto.currentWeight);
            }
        }

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

    /**
     * AI explanation of why targets are set as they are
     * Full implementation matching legacy /api/profile/explain
     */
    async explainTargets(userId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                explanation: 'Your targets are calculated based on your body stats, activity level, and goal.',
            };
        }

        const genAI = new GoogleGenAI({ apiKey });

        // Build context
        const goalLabels: Record<string, string> = {
            fat_loss: 'fat loss',
            maintenance: 'maintenance',
            muscle_gain: 'muscle gain',
            strength: 'strength training',
            recomp: 'body recomposition',
            health: 'general health',
        };

        const activityLabels: Record<string, string> = {
            sedentary: 'sedentary (little exercise)',
            light: 'lightly active (1-3 days/week)',
            moderate: 'moderately active (3-5 days/week)',
            active: 'active (6-7 days/week)',
            athlete: 'very active (athlete or physical job)',
        };

        const prompt = `You are explaining nutrition targets to a user. Be factual and educational. DO NOT give advice, suggestions, or use "should".

Context:
- Goal: ${goalLabels[profile.goalType || 'maintenance'] || 'maintenance'}
- Sex: ${profile.sex || 'not specified'}
- Age: ${profile.age || 'not specified'}
- Height: ${profile.heightCm || 'not specified'} cm
- Current weight: ${profile.currentWeight || 'not specified'} kg
- Target weight: ${profile.targetWeight || 'not specified'} kg
- Activity level: ${activityLabels[profile.activityLevel || 'moderate'] || 'moderate'}
- Weekly pace: ${profile.weeklyPace || 'not specified'} kg/week

Calculated targets:
- Maintenance calories: ${profile.maintenanceCal || 'not calculated'}
- Target calories: ${profile.targetCal || 'not calculated'}
- Protein: ${profile.proteinTarget || 'not calculated'}g
- Carbs: ${profile.carbTarget || 'not calculated'}g
- Fat: ${profile.fatTarget || 'not calculated'}g

Write 2-3 sentences explaining how these targets were calculated based on the user's stats and goal. Be educational, not prescriptive.

Example format:
"Your calorie target of X is based on your estimated maintenance of Y, adjusted for your [goal] goal. Your protein target of Zg supports [goal explanation]. These calculations use standard formulas like Mifflin-St Jeor for BMR."

DO NOT say "you should eat" or give any advice.`;

        try {
            const result = await genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            const explanation = result.text?.trim() || 'Unable to generate explanation.';

            return { explanation };
        } catch (error) {
            console.error('Profile Explain Error:', error);
            return {
                explanation: 'Your targets are calculated based on your body stats, activity level, and goal.',
            };
        }
    }
}

