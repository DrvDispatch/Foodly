/**
 * Profile-related types for onboarding and settings
 */

export interface MacroTargets {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface DailySummary {
    date: string;
    mealCount: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    hasAnalyzing: boolean;
}

export interface WeightEntry {
    id: string;
    userId: string;
    weight: number;
    date: Date;
    note: string | null;
    createdAt: Date;
}

export interface CoachState {
    id: string;
    userId: string;
    lastReflectionDate: string | null;
    hasUnread: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface BootstrapResponse {
    authenticated: boolean;
    ready: boolean;
    profile?: {
        id: string | undefined;
        name: string | null;
        email: string;
        onboarded: boolean;
        goalType: string;
        unitSystem: string;
    };
    goals?: MacroTargets;
    today?: DailySummary;
    weight?: {
        value: number;
        date: string;
    } | null;
    coach?: {
        unread: boolean;
    };
    calendar?: {
        month: string;
        days: {
            date: string;
            calories: number;
            mealCount: number;
        }[];
    };
    habits?: {
        streak: number;
        daysWithMeals: number;
    };
}
