/**
 * Nutrition calculation utilities
 */

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number, sex: string): number {
    if (sex === 'female') {
        return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
    const multipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        athlete: 1.9,
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

/**
 * Calculate macro targets based on calories, goal type, and body weight
 */
export function calculateMacroTargets(
    calories: number,
    goalType: string,
    bodyWeightKg: number
): { protein: number; carbs: number; fat: number } {
    // Protein: 1.8-2.2g per kg bodyweight depending on goal
    let proteinPerKg = 2.0;
    if (goalType === 'fat_loss' || goalType === 'lose' || goalType === 'recomp') {
        proteinPerKg = 2.2; // Higher protein during cut to preserve muscle
    } else if (goalType === 'muscle_gain' || goalType === 'gain') {
        proteinPerKg = 2.0;
    } else {
        proteinPerKg = 1.8;
    }

    const protein = Math.round(bodyWeightKg * proteinPerKg);
    const proteinCalories = protein * 4;

    // Fat: 25-30% of calories
    const fatPercent = goalType === 'fat_loss' || goalType === 'lose' ? 0.25 : 0.30;
    const fatCalories = calories * fatPercent;
    const fat = Math.round(fatCalories / 9);

    // Carbs: remaining calories
    const carbCalories = calories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4);

    return { protein, carbs, fat };
}

/**
 * Get human-readable goal label
 */
export function getGoalLabel(goalType: string): string {
    const labels: Record<string, string> = {
        lose: 'Fat Loss',
        fat_loss: 'Fat Loss',
        gain: 'Muscle Gain',
        muscle_gain: 'Muscle Gain',
        recomp: 'Body Recomp',
        maintain: 'Maintenance',
        maintenance: 'Maintenance',
        health: 'General Health',
    };
    return labels[goalType] || goalType;
}
