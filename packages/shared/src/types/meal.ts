/**
 * Meal Types
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'analyzing' | 'unknown';

export interface Meal {
    id: string;
    userId: string;
    type: MealType;
    title: string | null;
    description: string | null;
    photoUrl: string | null;
    photoKey: string | null;
    mealTime: Date;
    activeSnapshotId: string | null;
    isAnalyzing: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MealWithDetails extends Meal {
    items: MealItem[];
    activeSnapshot: NutritionSnapshot | null;
}

export interface MealItem {
    id: string;
    mealId: string;
    name: string;
    portionDesc: string | null;
    gramsEst: number | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    confidence: number | null;
    isProcessed: boolean;
    alternatives: string | null;
}

export interface NutritionSnapshot {
    id: string;
    mealId: string;
    version: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
    // Micronutrients
    vitaminD: number | null;
    vitaminC: number | null;
    vitaminB12: number | null;
    iron: number | null;
    calcium: number | null;
    magnesium: number | null;
    zinc: number | null;
    potassium: number | null;
    // Quality metrics
    qualityScore: number | null;
    isUltraProcessed: boolean | null;
    // Metadata
    confidence: number;
    notes: string | null;
    followUps: string | null;
    isActive: boolean;
    createdAt: Date;
}

export interface MealAnalysisResult {
    mealType: MealType;
    title: string;
    items: {
        name: string;
        portionDescription: string;
        estimatedGrams: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
        confidence: number;
    }[];
    totalNutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
        vitaminD?: number;
        vitaminC?: number;
        vitaminB12?: number;
        iron?: number;
        calcium?: number;
        magnesium?: number;
        zinc?: number;
        potassium?: number;
    };
    overallConfidence: number;
    qualityScore?: number;
    description: string;
    notes?: string[];
}
