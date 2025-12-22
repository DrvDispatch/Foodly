/**
 * Profile DTOs
 */

export interface UpdateProfileDto {
    sex?: 'male' | 'female';
    age?: number;
    heightCm?: number;
    currentWeight?: number;
    targetWeight?: number;
    weeklyPace?: number;
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
    goalType?: string;
    unitSystem?: 'metric' | 'imperial';
    maintenanceCal?: number;
    targetCal?: number;
    proteinTarget?: number;
    carbTarget?: number;
    fatTarget?: number;
    onboarded?: boolean;
    dietaryPrefs?: string[];
    allergies?: string[];
}

export interface ProfileResponseDto {
    id: string;
    userId: string;
    sex: string | null;
    age: number | null;
    heightCm: number | null;
    currentWeight: number | null;
    targetWeight: number | null;
    activityLevel: string | null;
    goalType: string | null;
    weeklyPace: number | null;
    maintenanceCal: number | null;
    targetCal: number | null;
    proteinTarget: number | null;
    carbTarget: number | null;
    fatTarget: number | null;
    onboarded: boolean;
    unitSystem: string;
    dietaryPrefs: string | null;
    allergies: string | null;
    timezone: string;
}
