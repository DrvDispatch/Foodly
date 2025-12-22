/**
 * Nutrition Calculation Utilities
 * These are shared between frontend and backend
 */

import { ACTIVITY_MULTIPLIERS, type ActivityLevel } from '../constants/activity';

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(
    weightKg: number,
    heightCm: number,
    ageYears: number,
    sex: 'male' | 'female'
): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
    return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate target calories based on goal
 */
export function calculateTargetCalories(
    tdee: number,
    goalType: 'lose' | 'maintain' | 'gain',
    weeklyPaceKg: number = 0.5
): number {
    // 1kg of body weight ≈ 7700 calories
    const dailyDelta = (weeklyPaceKg * 7700) / 7;

    switch (goalType) {
        case 'lose':
            return Math.round(tdee - dailyDelta);
        case 'gain':
            return Math.round(tdee + dailyDelta);
        default:
            return tdee;
    }
}

/**
 * Calculate macro targets based on calories and goal
 */
export function calculateMacroTargets(
    targetCalories: number,
    weightKg: number,
    goalType: 'lose' | 'maintain' | 'gain'
): { protein: number; carbs: number; fat: number } {
    // Protein: 1.6-2.2g per kg for weight loss/gain, 1.2-1.6g for maintenance
    const proteinPerKg = goalType === 'maintain' ? 1.4 : 2.0;
    const protein = Math.round(weightKg * proteinPerKg);

    // Fat: 25-30% of calories
    const fatCalories = targetCalories * 0.28;
    const fat = Math.round(fatCalories / 9);

    // Remaining calories from carbs
    const proteinCalories = protein * 4;
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4);

    return { protein, carbs, fat };
}

/**
 * Calculate percentage of goal
 */
export function calculateProgress(current: number, goal: number): number {
    if (goal === 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
}
