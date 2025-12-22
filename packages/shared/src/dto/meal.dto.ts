/**
 * Meal DTOs
 */

export interface CreateMealDto {
    description?: string;
    photoBase64?: string;
    additionalPhotos?: string[];
    mealTime?: string;
}

export interface MealResponseDto {
    id: string;
    type: string;
    title: string | null;
    description: string | null;
    photoUrl: string | null;
    mealTime: string;
    isAnalyzing: boolean;
    activeSnapshot: NutritionSnapshotDto | null;
    items: MealItemDto[];
}

export interface NutritionSnapshotDto {
    id: string;
    version: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    confidence: number;
    qualityScore: number | null;
}

export interface MealItemDto {
    id: string;
    name: string;
    portionDesc: string | null;
    gramsEst: number | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    confidence: number | null;
}

export interface ListMealsQueryDto {
    from?: string;
    to?: string;
}
