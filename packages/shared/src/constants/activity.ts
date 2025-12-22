/**
 * Activity Level Configuration
 */

export const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    athlete: 1.9,        // Very hard exercise, physical job
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; description: string }> = {
    sedentary: {
        label: 'Sedentary',
        description: 'Little or no exercise, desk job',
    },
    light: {
        label: 'Light',
        description: 'Light exercise 1-3 days/week',
    },
    moderate: {
        label: 'Moderate',
        description: 'Moderate exercise 3-5 days/week',
    },
    active: {
        label: 'Active',
        description: 'Hard exercise 6-7 days/week',
    },
    athlete: {
        label: 'Athlete',
        description: 'Very hard exercise, physical job',
    },
};
