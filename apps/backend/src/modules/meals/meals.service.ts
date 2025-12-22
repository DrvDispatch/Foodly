import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService, MealAnalysisResult } from '../ai/gemini.service';
import { StorageService } from '../storage/storage.service';
import { CreateMealDto, UpdateMealDto } from './dto';

/**
 * Meals Service
 * 
 * Handles meal CRUD with AI analysis:
 * - Create meal with immediate response + background analysis
 * - Upload photos to MinIO
 * - Update and delete meals
 * - Reanalyze meals
 */
@Injectable()
export class MealsService {
    constructor(
        private prisma: PrismaService,
        private geminiService: GeminiService,
        private storageService: StorageService,
    ) { }

    /**
     * List meals for a user (optionally within date range)
     */
    async listMeals(userId: string, from?: string, to?: string) {
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                ...(from && to
                    ? {
                        mealTime: {
                            gte: new Date(from),
                            lt: new Date(to),
                        },
                    }
                    : {}),
            },
            include: {
                items: true,
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
            orderBy: { mealTime: 'desc' },
        });

        // Transform to include active snapshot at top level
        return meals.map((meal: typeof meals[number]) => ({
            ...meal,
            activeSnapshot: meal.snapshots[0] || null,
            snapshots: undefined,
        }));
    }

    /**
     * Get single meal by ID
     */
    async getMeal(userId: string, mealId: string) {
        const meal = await this.prisma.meal.findUnique({
            where: { id: mealId },
            include: {
                items: true,
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
        });

        if (!meal) {
            throw new NotFoundException('Meal not found');
        }

        if (meal.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return {
            ...meal,
            activeSnapshot: meal.snapshots[0] || null,
            snapshots: undefined,
        };
    }

    /**
     * Create a new meal and start background analysis
     * Returns immediately with isAnalyzing=true
     */
    async createMeal(userId: string, dto: CreateMealDto) {
        const { description, photoBase64, additionalPhotos, mealTime } = dto;

        console.log('[MealsService] Creating meal:', {
            hasDescription: !!description,
            hasPhoto: !!photoBase64,
            additionalPhotosCount: additionalPhotos?.length || 0,
            mealTime,
        });

        // Upload photo to MinIO if provided
        let photoUrl: string | null = null;
        let photoKey: string | null = null;

        if (photoBase64) {
            try {
                const filename = this.storageService.generateMealPhotoFilename(userId);
                photoKey = await this.storageService.uploadBase64(photoBase64, filename, 'meals');
                photoUrl = this.storageService.getPublicUrl(photoKey);
                console.log('[MealsService] Uploaded photo:', photoUrl);
            } catch (err) {
                console.error('[MealsService] Failed to upload photo:', err);
            }
        }

        // Create meal immediately with isAnalyzing = true
        const meal = await this.prisma.meal.create({
            data: {
                userId,
                type: 'analyzing', // Will be updated by AI
                description,
                photoUrl,
                photoKey,
                mealTime: mealTime ? new Date(mealTime) : new Date(),
                isAnalyzing: true,
            },
        });
        console.log('[MealsService] Created meal:', meal.id);

        // Start background analysis (fire and forget)
        this.analyzeInBackground(meal.id, description, photoBase64, additionalPhotos, mealTime)
            .catch((err) => console.error('[MealsService] Background analysis failed:', err));

        // Return immediately so UI can show skeleton
        return {
            ...meal,
            activeSnapshot: null,
            items: [],
        };
    }

    /**
     * Background analysis function
     */
    private async analyzeInBackground(
        mealId: string,
        description?: string,
        photoBase64?: string,
        additionalPhotos?: string[],
        mealTime?: string,
    ) {
        console.log('[MealsService] Starting background analysis for meal:', mealId);

        try {
            // Call Gemini for analysis
            const analysis = await this.geminiService.analyzeMeal(
                description,
                photoBase64,
                mealTime || new Date().toISOString(),
                additionalPhotos,
            );
            console.log('[MealsService] Analysis result:', {
                mealType: analysis.mealType,
                calories: analysis.totalNutrition.calories,
                itemCount: analysis.items.length,
            });

            // Update meal with detected type and AI-generated description
            await this.prisma.meal.update({
                where: { id: mealId },
                data: {
                    type: analysis.mealType,
                    title: analysis.title,
                    description: analysis.description || description,
                    isAnalyzing: false,
                },
            });

            // Create nutrition snapshot with macros AND micronutrients
            const snapshot = await this.prisma.nutritionSnapshot.create({
                data: {
                    mealId,
                    version: 'ai_v1',
                    calories: Math.round(analysis.totalNutrition.calories),
                    protein: Math.round(analysis.totalNutrition.protein * 10) / 10,
                    carbs: Math.round(analysis.totalNutrition.carbs * 10) / 10,
                    fat: Math.round(analysis.totalNutrition.fat * 10) / 10,
                    fiber: analysis.totalNutrition.fiber
                        ? Math.round(analysis.totalNutrition.fiber * 10) / 10
                        : null,
                    vitaminD: analysis.totalNutrition.vitaminD || null,
                    vitaminC: analysis.totalNutrition.vitaminC || null,
                    vitaminB12: analysis.totalNutrition.vitaminB12 || null,
                    iron: analysis.totalNutrition.iron || null,
                    calcium: analysis.totalNutrition.calcium || null,
                    magnesium: analysis.totalNutrition.magnesium || null,
                    zinc: analysis.totalNutrition.zinc || null,
                    potassium: analysis.totalNutrition.potassium || null,
                    confidence: analysis.overallConfidence,
                    qualityScore: analysis.qualityScore,
                    notes: analysis.notes ? JSON.stringify(analysis.notes) : null,
                    isActive: true,
                },
            });

            // Update meal to point to active snapshot
            await this.prisma.meal.update({
                where: { id: mealId },
                data: { activeSnapshotId: snapshot.id },
            });

            // Create meal items
            for (const item of analysis.items) {
                await this.prisma.mealItem.create({
                    data: {
                        mealId,
                        name: item.name,
                        portionDesc: item.portionDescription,
                        gramsEst: item.estimatedGrams,
                        calories: Math.round(item.calories),
                        protein: Math.round(item.protein * 10) / 10,
                        carbs: Math.round(item.carbs * 10) / 10,
                        fat: Math.round(item.fat * 10) / 10,
                        confidence: item.confidence,
                    },
                });
            }

            console.log(`[MealsService] ✓ Completed analysis for meal ${mealId}`);
        } catch (error) {
            console.error(`[MealsService] ✗ Failed to analyze meal ${mealId}:`, error);

            // Mark as no longer analyzing even on failure
            await this.prisma.meal.update({
                where: { id: mealId },
                data: {
                    type: 'unknown',
                    isAnalyzing: false,
                },
            });
        }
    }

    /**
     * Update meal description and/or nutrition
     */
    async updateMeal(userId: string, mealId: string, dto: UpdateMealDto) {
        const meal = await this.prisma.meal.findUnique({
            where: { id: mealId },
            include: {
                snapshots: {
                    where: { isActive: true },
                    take: 1,
                },
            },
        });

        if (!meal) {
            throw new NotFoundException('Meal not found');
        }

        if (meal.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        // Update meal description if provided
        if (dto.description !== undefined) {
            await this.prisma.meal.update({
                where: { id: mealId },
                data: { description: dto.description },
            });
        }

        // Update nutrition snapshot if values provided
        if (dto.calories !== undefined || dto.protein !== undefined || dto.carbs !== undefined || dto.fat !== undefined) {
            const activeSnapshot = meal.snapshots[0];

            if (activeSnapshot) {
                // Update existing snapshot
                await this.prisma.nutritionSnapshot.update({
                    where: { id: activeSnapshot.id },
                    data: {
                        ...(dto.calories !== undefined && { calories: dto.calories }),
                        ...(dto.protein !== undefined && { protein: dto.protein }),
                        ...(dto.carbs !== undefined && { carbs: dto.carbs }),
                        ...(dto.fat !== undefined && { fat: dto.fat }),
                        version: 'user_edit',
                    },
                });
            } else {
                // Create new snapshot with user values
                const snapshot = await this.prisma.nutritionSnapshot.create({
                    data: {
                        mealId,
                        version: 'user_edit',
                        calories: dto.calories || 0,
                        protein: dto.protein || 0,
                        carbs: dto.carbs || 0,
                        fat: dto.fat || 0,
                        confidence: 1.0, // User-entered = 100% confidence
                        isActive: true,
                    },
                });

                await this.prisma.meal.update({
                    where: { id: mealId },
                    data: { activeSnapshotId: snapshot.id },
                });
            }
        }

        // Return updated meal
        return this.getMeal(userId, mealId);
    }

    /**
     * Delete a meal and its associated photo
     */
    async deleteMeal(userId: string, mealId: string) {
        const meal = await this.prisma.meal.findUnique({
            where: { id: mealId },
        });

        if (!meal) {
            throw new NotFoundException('Meal not found');
        }

        if (meal.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        // Delete photo from MinIO if exists
        if (meal.photoKey) {
            try {
                await this.storageService.deleteFile(meal.photoKey);
            } catch (err) {
                console.error('[MealsService] Failed to delete photo:', err);
            }
        }

        // Delete meal (cascades to items and snapshots)
        await this.prisma.meal.delete({
            where: { id: mealId },
        });

        return { success: true };
    }

    /**
     * Reanalyze a meal with Gemini
     */
    async reanalyzeMeal(userId: string, mealId: string) {
        const meal = await this.prisma.meal.findUnique({
            where: { id: mealId },
        });

        if (!meal) {
            throw new NotFoundException('Meal not found');
        }

        if (meal.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        // Mark as analyzing
        await this.prisma.meal.update({
            where: { id: mealId },
            data: { isAnalyzing: true },
        });

        // Deactivate old snapshots
        await this.prisma.nutritionSnapshot.updateMany({
            where: { mealId, isActive: true },
            data: { isActive: false },
        });

        // Delete old meal items
        await this.prisma.mealItem.deleteMany({
            where: { mealId },
        });

        // Note: We don't have the original photo base64 anymore
        // We would need to download from MinIO and convert to base64
        // For now, just use the description
        this.analyzeInBackground(mealId, meal.description || undefined, undefined, undefined, meal.mealTime.toISOString())
            .catch((err) => console.error('[MealsService] Reanalysis failed:', err));

        return { success: true, message: 'Reanalysis started' };
    }
}
