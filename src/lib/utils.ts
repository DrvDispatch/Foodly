import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(
    weightKg: number,
    heightCm: number,
    ageYears: number,
    sex: 'male' | 'female'
): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
    return sex === 'male' ? base + 5 : base - 161
}

/**
 * Activity level multipliers for TDEE calculation
 */
export const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    athlete: 1.9,        // Very hard exercise, physical job
} as const

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
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
    const dailyDelta = (weeklyPaceKg * 7700) / 7

    switch (goalType) {
        case 'lose':
            return Math.round(tdee - dailyDelta)
        case 'gain':
            return Math.round(tdee + dailyDelta)
        default:
            return tdee
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
    const proteinPerKg = goalType === 'maintain' ? 1.4 : 2.0
    const protein = Math.round(weightKg * proteinPerKg)

    // Fat: 25-30% of calories
    const fatCalories = targetCalories * 0.28
    const fat = Math.round(fatCalories / 9)

    // Remaining calories from carbs
    const proteinCalories = protein * 4
    const carbCalories = targetCalories - proteinCalories - fatCalories
    const carbs = Math.round(carbCalories / 4)

    return { protein, carbs, fat }
}

/**
 * Convert height from feet/inches to cm
 */
export function feetToCm(feet: number, inches: number): number {
    return (feet * 12 + inches) * 2.54
}

/**
 * Convert weight from lbs to kg
 */
export function lbsToKg(lbs: number): number {
    return lbs * 0.453592
}

/**
 * Convert kg to lbs
 */
export function kgToLbs(kg: number): number {
    return kg * 2.20462
}

/**
 * Format calories for display
 */
export function formatCalories(cal: number): string {
    return Math.round(cal).toLocaleString()
}

/**
 * Format macro value for display
 */
export function formatMacro(value: number, unit: string = 'g'): string {
    return `${Math.round(value)}${unit}`
}

/**
 * Calculate percentage of goal
 */
export function calculateProgress(current: number, goal: number): number {
    if (goal === 0) return 0
    return Math.min(100, Math.round((current / goal) * 100))
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high'
    if (confidence >= 0.5) return 'medium'
    return 'low'
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })
}

/**
 * Get meal type label
 */
export function getMealTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snack',
    }
    return labels[type] || type
}

/**
 * Generate a random demo user ID
 */
export function generateDemoUserId(): string {
    return `demo_${Math.random().toString(36).substring(2, 15)}`
}
