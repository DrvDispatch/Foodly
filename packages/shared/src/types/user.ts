/**
 * Core User Types
 */

export interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    isDemo: boolean;
    emailVerified: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserWithProfile extends User {
    profile: Profile | null;
}

export interface Profile {
    id: string;
    userId: string;
    sex: 'male' | 'female' | null;
    birthDate: Date | null;
    age: number | null;
    heightCm: number | null;
    currentWeight: number | null;
    targetWeight: number | null;
    activityLevel: ActivityLevel | null;
    goalType: GoalType | null;
    secondaryFocus: string | null;
    weeklyPace: number | null;
    maintenanceCal: number | null;
    targetCal: number | null;
    proteinTarget: number | null;
    carbTarget: number | null;
    fatTarget: number | null;
    onboarded: boolean;
    unitSystem: 'metric' | 'imperial';
    dietaryPrefs: string | null;
    allergies: string | null;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
}

// ActivityLevel is exported from constants/activity.ts
import type { ActivityLevel } from '../constants/activity';
export type { ActivityLevel };

export type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain' | 'strength' | 'recomp' | 'health' | 'lose' | 'maintain' | 'gain';

export interface Goal {
    id: string;
    userId: string;
    dailyCal: number;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    isActive: boolean;
    createdAt: Date;
}
