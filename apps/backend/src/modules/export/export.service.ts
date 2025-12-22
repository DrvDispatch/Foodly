import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Export Service
 * 
 * Exports all user data as JSON:
 * - Profile
 * - Meals with items and nutrition
 * - Weight entries
 * - Goals
 */
@Injectable()
export class ExportService {
    constructor(private prisma: PrismaService) { }

    async exportUserData(userId: string) {
        // Fetch all user data in parallel
        const [profile, meals, weightEntries, goals] = await Promise.all([
            this.prisma.profile.findUnique({ where: { userId } }),

            this.prisma.meal.findMany({
                where: { userId },
                include: {
                    items: true,
                    snapshots: { where: { isActive: true }, take: 1 },
                },
                orderBy: { mealTime: 'desc' },
            }),

            this.prisma.weightEntry.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
            }),

            this.prisma.goal.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // Type aliases
        type MealType = typeof meals[number];
        type MealItemType = MealType['items'][number];
        type WeightType = typeof weightEntries[number];
        type GoalType = typeof goals[number];

        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            profile: profile
                ? {
                    goalType: profile.goalType,
                    sex: profile.sex,
                    age: profile.age,
                    heightCm: profile.heightCm,
                    currentWeight: profile.currentWeight,
                    targetWeight: profile.targetWeight,
                    activityLevel: profile.activityLevel,
                    unitSystem: profile.unitSystem,
                    targetCal: profile.targetCal,
                    proteinTarget: profile.proteinTarget,
                    carbTarget: profile.carbTarget,
                    fatTarget: profile.fatTarget,
                    dietaryPrefs: profile.dietaryPrefs,
                    allergies: profile.allergies,
                }
                : null,
            meals: meals.map((m: MealType) => ({
                type: m.type,
                description: m.description,
                mealTime: m.mealTime,
                items: m.items.map((item: MealItemType) => ({
                    name: item.name,
                    portion: item.portionDesc,
                    gramsEst: item.gramsEst,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                })),
                nutrition: m.snapshots[0]
                    ? {
                        calories: m.snapshots[0].calories,
                        protein: m.snapshots[0].protein,
                        carbs: m.snapshots[0].carbs,
                        fat: m.snapshots[0].fat,
                    }
                    : null,
            })),
            weightEntries: weightEntries.map((w: WeightType) => ({
                weight: w.weight,
                date: w.date,
                note: w.note,
            })),
            goals: goals.map((g: GoalType) => ({
                dailyCal: g.dailyCal,
                proteinG: g.proteinG,
                carbsG: g.carbsG,
                fatG: g.fatG,
                isActive: g.isActive,
                createdAt: g.createdAt,
            })),
        };

        return exportData;
    }
}
