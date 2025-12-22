/**
 * Shared Formatting Utilities
 */

/**
 * Convert height from feet/inches to cm
 */
export function feetToCm(feet: number, inches: number): number {
    return (feet * 12 + inches) * 2.54;
}

/**
 * Convert weight from lbs to kg
 */
export function lbsToKg(lbs: number): number {
    return lbs * 0.453592;
}

/**
 * Convert kg to lbs
 */
export function kgToLbs(kg: number): number {
    return kg * 2.20462;
}

/**
 * Format calories for display
 */
export function formatCalories(cal: number): string {
    return Math.round(cal).toLocaleString();
}

/**
 * Format macro value for display
 */
export function formatMacro(value: number, unit: string = 'g'): string {
    return `${Math.round(value)}${unit}`;
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
    };
    return labels[type] || type;
}

/**
 * Generate a random demo user ID
 */
export function generateDemoUserId(): string {
    return `demo_${Math.random().toString(36).substring(2, 15)}`;
}
