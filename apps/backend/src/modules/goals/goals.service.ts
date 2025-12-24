import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { calculateBMR, calculateTDEE, calculateMacroTargets } from '../../lib/nutrition-utils';

export interface GoalRecommendation {
    journey: {
        startingWeight: number;
        currentWeight: number;
        targetWeight: number;
        weightChange: number;
        daysOnPlan: number;
        originalGoal: string;
    };
    recommendation: {
        shouldAdjust: boolean;
        suggestedGoal: string;
        reason: string;
        newCalories: number;
        newProtein: number;
        newCarbs: number;
        newFat: number;
        estimatedWeeksToGoal: number;
    };
    aiExplanation: string;
}

@Injectable()
export class GoalsService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    private getAI(): GoogleGenAI {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
        return new GoogleGenAI({ apiKey });
    }

    /**
     * Get goal adjustment recommendation based on current vs target weight
     */
    async getRecommendation(userId: string): Promise<GoalRecommendation> {
        // Fetch user profile and weight history
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        const profile = user?.profile;
        if (!profile) {
            throw new Error('Profile not found');
        }

        // Get weight history
        const weights = await this.prisma.weightEntry.findMany({
            where: { userId },
            orderBy: { date: 'asc' },
        });

        const startingWeight = profile.startingWeight || weights[0]?.weight || profile.currentWeight || 70;
        const currentWeight = weights.length > 0
            ? weights[weights.length - 1].weight
            : profile.currentWeight || startingWeight;
        const targetWeight = profile.targetWeight || currentWeight;
        const originalGoal = profile.goalType || 'maintenance';

        // Calculate days on plan
        const profileCreated = profile.createdAt;
        const daysOnPlan = Math.floor((Date.now() - profileCreated.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate difference from target
        const diff = currentWeight - targetWeight;
        const diffPercent = Math.abs(diff / targetWeight) * 100;

        // Dynamic threshold: 10% of distance, min 0.5kg
        const threshold = Math.max(0.5, Math.abs(diff) * 0.1);

        // Determine if adjustment needed
        const isOverTarget = diff > threshold;
        const isUnderTarget = diff < -threshold;
        let shouldAdjust = false;
        let suggestedGoal = originalGoal;
        let reason = '';

        if (isOverTarget && !['lose', 'fat_loss'].includes(originalGoal)) {
            shouldAdjust = true;
            suggestedGoal = 'fat_loss';
            reason = `You're ${diff.toFixed(1)}kg above your target. A cutting phase will help you reach ${targetWeight}kg.`;
        } else if (isUnderTarget && !['gain', 'muscle_gain'].includes(originalGoal)) {
            shouldAdjust = true;
            suggestedGoal = 'muscle_gain';
            reason = `You're ${Math.abs(diff).toFixed(1)}kg below your target. A lean bulk will help you reach ${targetWeight}kg.`;
        } else if (Math.abs(diff) <= 0.5) {
            reason = `You're at your target weight! Consider switching to maintenance.`;
            if (originalGoal !== 'maintenance' && originalGoal !== 'maintain') {
                shouldAdjust = true;
                suggestedGoal = 'maintenance';
            }
        }

        // Calculate new macros if adjustment recommended
        const sex = profile.sex || 'male';
        const age = profile.age || 30;
        const heightCm = profile.heightCm || 170;
        const activityLevel = profile.activityLevel || 'moderate';

        const bmr = calculateBMR(currentWeight, heightCm, age, sex);
        const tdee = calculateTDEE(bmr, activityLevel);

        // Calculate target calories based on suggested goal
        let calorieAdjustment = 0;
        if (suggestedGoal === 'fat_loss' || suggestedGoal === 'lose') {
            calorieAdjustment = -500; // 0.5kg/week deficit
        } else if (suggestedGoal === 'muscle_gain' || suggestedGoal === 'gain') {
            calorieAdjustment = 300; // Lean bulk surplus
        }

        const newCalories = Math.round(tdee + calorieAdjustment);
        const macros = calculateMacroTargets(newCalories, suggestedGoal, currentWeight);

        // Estimate weeks to goal
        const weeklyChange = suggestedGoal.includes('loss') || suggestedGoal === 'lose' ? 0.5 : 0.25;
        const estimatedWeeks = Math.abs(diff) > 0.5 ? Math.ceil(Math.abs(diff) / weeklyChange) : 0;

        // Generate AI explanation
        const aiExplanation = await this.generateExplanation({
            startingWeight,
            currentWeight,
            targetWeight,
            originalGoal,
            daysOnPlan,
            suggestedGoal,
            shouldAdjust,
            estimatedWeeks,
            newCalories,
        });

        return {
            journey: {
                startingWeight,
                currentWeight,
                targetWeight,
                weightChange: currentWeight - startingWeight,
                daysOnPlan,
                originalGoal,
            },
            recommendation: {
                shouldAdjust,
                suggestedGoal,
                reason,
                newCalories,
                newProtein: macros.protein,
                newCarbs: macros.carbs,
                newFat: macros.fat,
                estimatedWeeksToGoal: estimatedWeeks,
            },
            aiExplanation,
        };
    }

    /**
     * Apply the recommended goal adjustment
     */
    async applyRecommendation(userId: string, newGoal: string, newCalories: number, newProtein: number, newCarbs: number, newFat: number) {
        await this.prisma.profile.update({
            where: { userId },
            data: {
                goalType: newGoal,
                targetCal: newCalories,
                proteinTarget: newProtein,
                carbTarget: newCarbs,
                fatTarget: newFat,
            },
        });

        return { success: true };
    }

    /**
     * Generate AI explanation of the journey and recommendation
     */
    private async generateExplanation(context: {
        startingWeight: number;
        currentWeight: number;
        targetWeight: number;
        originalGoal: string;
        daysOnPlan: number;
        suggestedGoal: string;
        shouldAdjust: boolean;
        estimatedWeeks: number;
        newCalories: number;
    }): Promise<string> {
        try {
            const ai = this.getAI();
            const goalLabels: Record<string, string> = {
                lose: 'fat loss',
                fat_loss: 'fat loss',
                gain: 'muscle gain',
                muscle_gain: 'muscle gain',
                recomp: 'body recomposition',
                maintain: 'maintenance',
                maintenance: 'maintenance',
                health: 'general health',
            };

            const prompt = `You are a supportive nutrition coach. Generate a personalized, encouraging 2-3 sentence explanation.

Context:
- Started at ${context.startingWeight}kg with a ${goalLabels[context.originalGoal] || context.originalGoal} goal
- Now at ${context.currentWeight}kg after ${context.daysOnPlan} days
- Target: ${context.targetWeight}kg
- ${context.shouldAdjust ? `Recommend switching to ${goalLabels[context.suggestedGoal] || context.suggestedGoal}` : 'On track with current goal'}
- Estimated ${context.estimatedWeeks} weeks to reach target at ${context.newCalories} kcal/day

Rules:
- Be warm and motivating, not clinical
- Acknowledge their progress positively
- If recommending change, explain WHY clearly
- Use simple language, no jargon
- Max 3 sentences

Respond with just the explanation text, no JSON.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            return response.text?.trim() || this.getFallbackExplanation(context);
        } catch (error) {
            console.error('[GoalsService] AI explanation failed:', error);
            return this.getFallbackExplanation(context);
        }
    }

    private getFallbackExplanation(context: { startingWeight: number; currentWeight: number; targetWeight: number; shouldAdjust: boolean; suggestedGoal: string; estimatedWeeks: number }): string {
        const change = context.currentWeight - context.startingWeight;
        const direction = change > 0 ? 'gained' : 'lost';

        if (context.shouldAdjust) {
            return `You've ${direction} ${Math.abs(change).toFixed(1)}kg since starting. To reach your ${context.targetWeight}kg goal, I recommend adjusting to a ${context.suggestedGoal.replace('_', ' ')} approach for about ${context.estimatedWeeks} weeks.`;
        }
        return `Great progress! You've ${direction} ${Math.abs(change).toFixed(1)}kg and are on track to reach ${context.targetWeight}kg. Keep up the good work!`;
    }
}
