/**
 * Goal-Aware Insight Signals Engine
 * 
 * This module detects WHEN an insight is needed and WHAT the situation is.
 * It returns structured signals, NOT text.
 * 
 * The InsightService handles the phrasing using Gemini.
 */

// ============================================================================
// TYPES
// ============================================================================

export type PrimaryGoal =
    | 'fat_loss'
    | 'maintenance'
    | 'muscle_gain'
    | 'strength'
    | 'recomp'
    | 'health';

export type SecondaryFocus =
    | 'vegan'
    | 'vegetarian'
    | 'strength_lifting'
    | 'endurance'
    | 'longevity'
    | 'satiety'
    | 'aesthetic'
    | 'metabolic_health';

export interface UserContext {
    goalType: PrimaryGoal;
    secondaryFocuses: SecondaryFocus[];
    sex?: string;
    age?: number;
    activityLevel?: string;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
}

export interface DayContext {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
    hourOfDay: number;
}

export interface MealNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

// ============================================================================
// SIGNAL TYPES (what we pass to Gemini)
// ============================================================================

export interface MealInsightSignal {
    type: 'meal';
    priority: 'low' | 'medium' | 'high';
    facts: {
        lowProtein?: boolean;
        highProtein?: boolean;
        lowCarbs?: boolean;
        highCarbs?: boolean;
        highFat?: boolean;
        lightMeal?: boolean;
        substantialMeal?: boolean;
        caloriesPerProtein?: number;
    };
    userGoal: PrimaryGoal;
    secondaryFocuses: SecondaryFocus[];
    meal: MealNutrition;
    dailyProgress?: {
        proteinMet: boolean;
        carbsMet: boolean;
        fatMet: boolean;
        allGoalsMet: boolean;
        allGoalsExceeded: boolean;
        totalCalories: number;
        totalProtein: number;
        totalCarbs: number;
        totalFat: number;
    };
}

export interface DailyInsightSignal {
    type: 'daily';
    priority: 'low' | 'medium' | 'high';
    facts: {
        pacingLight?: boolean;
        pacingHeavy?: boolean;
        proteinLagging?: boolean;
        proteinStrong?: boolean;
        carbsLow?: boolean;
        noMeals?: boolean;
        goalReached?: boolean;
        nearTarget?: boolean;
        isPastDate?: boolean;
        allGoalsMet?: boolean;
        allGoalsExceeded?: boolean;
        proteinMet?: boolean;
        carbsMet?: boolean;
        fatMet?: boolean;
        remainingProtein?: number;
        remainingCarbs?: number;
        remainingFat?: number;
    };
    userGoal: PrimaryGoal;
    secondaryFocuses: SecondaryFocus[];
    day: DayContext;
    targetCalories: number;
    targetProtein: number;
    targetCarbs?: number;
    targetFat?: number;
    expectedProgressPct: number;
    mealDescriptions?: string[];
}

export interface WhatNextSignal {
    type: 'whatnext';
    priority: 'low' | 'medium' | 'high';
    facts: {
        proteinBehind?: boolean;
        dinnerDecides?: boolean;
        nearTargetEarly?: boolean;
        surplusBehind?: boolean;
        carbsNeeded?: boolean;
    };
    userGoal: PrimaryGoal;
    secondaryFocuses: SecondaryFocus[];
    day: DayContext;
}

export type InsightSignal = MealInsightSignal | DailyInsightSignal | WhatNextSignal;

// ============================================================================
// GOAL LABELS (for UI and prompts)
// ============================================================================

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, { label: string; description: string }> = {
    fat_loss: { label: 'Fat Loss', description: 'Lose body fat while preserving muscle' },
    maintenance: { label: 'Maintenance', description: 'Maintain current weight and body composition' },
    muscle_gain: { label: 'Muscle Gain', description: 'Build muscle with a calorie surplus' },
    strength: { label: 'Strength & Performance', description: 'Optimize for lifting and athletic output' },
    recomp: { label: 'Recomposition', description: 'Slowly lose fat while building muscle' },
    health: { label: 'General Health', description: 'Focus on overall wellness and nutrition quality' },
};

export const SECONDARY_FOCUS_LABELS: Record<SecondaryFocus, { label: string; emoji: string }> = {
    vegan: { label: 'Plant-Based / Vegan', emoji: '🌱' },
    vegetarian: { label: 'Vegetarian', emoji: '🥗' },
    strength_lifting: { label: 'Strength Training', emoji: '🏋️' },
    endurance: { label: 'Endurance / Cardio', emoji: '🏃' },
    longevity: { label: 'Longevity & Micronutrients', emoji: '🧬' },
    satiety: { label: 'Satiety & Hunger Control', emoji: '😌' },
    aesthetic: { label: 'Get Lean / Aesthetic', emoji: '💪' },
    metabolic_health: { label: 'Metabolic Health', emoji: '❤️' },
};

// ============================================================================
// MEAL INSIGHT SIGNAL DETECTION
// ============================================================================

/**
 * Detect if a meal warrants an insight and return structured signal.
 * Returns null if no insight needed.
 */
export function getMealInsightSignal(
    user: UserContext,
    meal: MealNutrition,
    dailyProgress?: MealInsightSignal['dailyProgress'],
): MealInsightSignal | null {
    const { calories, protein, carbs, fat } = meal;
    const totalMacros = protein + carbs + fat;

    if (totalMacros === 0 || calories < 50) return null;

    // Macro proportions
    const proteinPct = protein / totalMacros;
    const carbsPct = carbs / totalMacros;
    const fatPct = fat / totalMacros;

    const facts: MealInsightSignal['facts'] = {};
    let priority: 'low' | 'medium' | 'high' = 'low';

    // Protein analysis
    if (proteinPct < 0.15 && calories > 200) {
        facts.lowProtein = true;
        if (user.goalType === 'muscle_gain' || user.goalType === 'fat_loss') {
            priority = 'medium';
        }
    }
    if (proteinPct > 0.35) {
        facts.highProtein = true;
        priority = 'medium';
    }

    // Carbs analysis
    if (carbsPct < 0.15 && calories > 200) {
        facts.lowCarbs = true;
        if (user.goalType === 'strength' || user.secondaryFocuses.includes('endurance')) {
            priority = 'high';
        }
    }
    if (carbsPct > 0.65) {
        facts.highCarbs = true;
    }

    // Fat analysis
    if (fatPct > 0.5 && calories > 300) {
        facts.highFat = true;
        if (user.goalType === 'fat_loss') {
            priority = 'high';
        }
    }

    // Meal size
    if (calories < 150) {
        facts.lightMeal = true;
    }
    if (calories > 700) {
        facts.substantialMeal = true;
    }

    // Calories per protein gram (useful for satiety/MPS insights)
    if (protein > 0) {
        facts.caloriesPerProtein = Math.round(calories / protein);
    }

    // Only return signal if there are meaningful facts
    if (Object.keys(facts).length === 0) return null;

    return {
        type: 'meal',
        priority,
        facts,
        userGoal: user.goalType,
        secondaryFocuses: user.secondaryFocuses,
        meal,
        dailyProgress,
    };
}

// ============================================================================
// DAILY INSIGHT SIGNAL DETECTION
// ============================================================================

/**
 * Detect daily progress signal for insight generation.
 */
export function getDailyInsightSignal(
    user: UserContext,
    day: DayContext,
    selectedDate: Date,
    mealDescriptions?: string[],
): DailyInsightSignal {
    const calPct = day.calories / user.targetCalories;
    const proteinPct = day.protein / user.targetProtein;
    const carbsPct = day.carbs / user.targetCarbs;
    const hour = day.hourOfDay;

    // Expected progress based on time
    const expectedProgress = hour < 10 ? 0.15 : hour < 14 ? 0.4 : hour < 18 ? 0.6 : 0.85;

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const isPastDate = selectedDate < new Date() && !isToday;

    const facts: DailyInsightSignal['facts'] = {};
    let priority: 'low' | 'medium' | 'high' = 'low';

    // Calculate goal completion status
    const proteinMet = day.protein >= user.targetProtein;
    const carbsMet = day.carbs >= user.targetCarbs;
    const fatMet = day.fat >= user.targetFat;
    const allGoalsMet = calPct >= 0.95 && proteinMet && carbsMet && fatMet;

    // All goals EXCEEDED (significantly over - no action needed at all)
    const allGoalsExceeded =
        calPct >= 1.1 &&
        day.protein >= user.targetProtein * 1.1 &&
        day.carbs >= user.targetCarbs * 0.9 &&
        day.fat >= user.targetFat * 0.9;

    // Remaining macros (for suggestions)
    const remainingProtein = Math.max(0, user.targetProtein - day.protein);
    const remainingCarbs = Math.max(0, user.targetCarbs - day.carbs);
    const remainingFat = Math.max(0, user.targetFat - day.fat);

    if (isPastDate) {
        facts.isPastDate = true;
    }

    if (day.mealCount === 0) {
        facts.noMeals = true;
        priority = 'medium';
    } else {
        // Goal completion - check exceeded first
        if (allGoalsExceeded) {
            facts.allGoalsExceeded = true;
            facts.allGoalsMet = true;
            priority = 'low';
        } else if (allGoalsMet) {
            facts.allGoalsMet = true;
            priority = 'low';
            if (proteinMet) facts.proteinMet = true;
            if (carbsMet) facts.carbsMet = true;
            if (fatMet) facts.fatMet = true;

            if (remainingProtein > 0) facts.remainingProtein = remainingProtein;
            if (remainingCarbs > 0) facts.remainingCarbs = remainingCarbs;
            if (remainingFat > 0) facts.remainingFat = remainingFat;
        }

        // Pacing analysis (only if not all goals met)
        if (!allGoalsMet) {
            if (calPct < expectedProgress * 0.7) {
                facts.pacingLight = true;
                if (user.goalType === 'muscle_gain') priority = 'high';
            }
            if (calPct > expectedProgress * 1.3 && calPct < 1) {
                facts.pacingHeavy = true;
                if (user.goalType === 'fat_loss') priority = 'high';
            }

            // Protein vs calories
            if (proteinPct < calPct - 0.15 && proteinPct < 0.7) {
                facts.proteinLagging = true;
                if (user.goalType === 'muscle_gain' || user.goalType === 'fat_loss') {
                    priority = 'high';
                }
            }
            if (proteinPct > calPct + 0.15) {
                facts.proteinStrong = true;
            }

            // Carbs
            if (carbsPct < 0.3 && user.goalType === 'strength') {
                facts.carbsLow = true;
            }

            // Goal status
            if (calPct >= 1) {
                facts.goalReached = true;
                priority = 'medium';
            }
            if (calPct > 0.85 && calPct < 1) {
                facts.nearTarget = true;
            }
        }
    }

    return {
        type: 'daily',
        priority,
        facts,
        userGoal: user.goalType,
        secondaryFocuses: user.secondaryFocuses,
        day,
        targetCalories: user.targetCalories,
        targetProtein: user.targetProtein,
        targetCarbs: user.targetCarbs,
        targetFat: user.targetFat,
        expectedProgressPct: expectedProgress,
        mealDescriptions,
    };
}

// ============================================================================
// WHAT NEXT SIGNAL DETECTION
// ============================================================================

/**
 * Detect "What next?" hint signal.
 * Returns null if no meaningful hint.
 */
export function getWhatNextSignal(
    user: UserContext,
    day: DayContext,
): WhatNextSignal | null {
    const calPct = day.calories / user.targetCalories;
    const proteinPct = day.protein / user.targetProtein;
    const carbsPct = day.carbs / user.targetCarbs;
    const hour = day.hourOfDay;

    // Only show hints in afternoon/evening with data
    if (hour < 12 || day.mealCount < 1) return null;

    const facts: WhatNextSignal['facts'] = {};
    let priority: 'low' | 'medium' | 'high' = 'low';

    // Protein behind
    if (proteinPct < 0.4 && calPct > 0.4 && hour >= 15) {
        facts.proteinBehind = true;
        if (user.goalType === 'muscle_gain' || user.goalType === 'fat_loss') {
            priority = 'high';
        } else {
            priority = 'medium';
        }
    }

    // Dinner decides
    if (calPct < 0.4 && hour >= 17) {
        facts.dinnerDecides = true;
        priority = 'medium';
    }

    // Near target early
    if (calPct > 0.85 && hour < 18) {
        facts.nearTargetEarly = true;
        if (user.goalType === 'fat_loss') priority = 'high';
    }

    // Surplus behind (muscle gain)
    if (user.goalType === 'muscle_gain' && calPct < 0.5 && hour >= 18) {
        facts.surplusBehind = true;
        priority = 'high';
    }

    // Carbs needed (strength/endurance)
    if (
        (user.goalType === 'strength' || user.secondaryFocuses.includes('endurance')) &&
        carbsPct < 0.4 &&
        hour < 18
    ) {
        facts.carbsNeeded = true;
        priority = 'medium';
    }

    // Only return if there are facts
    if (Object.keys(facts).length === 0) return null;

    return {
        type: 'whatnext',
        priority,
        facts,
        userGoal: user.goalType,
        secondaryFocuses: user.secondaryFocuses,
        day,
    };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map legacy goalType string to PrimaryGoal
 */
export function mapLegacyGoalType(goalType: string | null | undefined): PrimaryGoal {
    switch (goalType) {
        case 'lose':
            return 'fat_loss';
        case 'maintain':
            return 'maintenance';
        case 'gain':
            return 'muscle_gain';
        case 'fat_loss':
        case 'maintenance':
        case 'muscle_gain':
        case 'strength':
        case 'recomp':
        case 'health':
            return goalType as PrimaryGoal;
        default:
            return 'health'; // Safe default
    }
}

/**
 * Parse secondary focuses from JSON string
 */
export function parseSecondaryFocuses(json: string | null | undefined): SecondaryFocus[] {
    if (!json) return [];
    try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
            return parsed.filter((f: string) =>
                Object.keys(SECONDARY_FOCUS_LABELS).includes(f),
            ) as SecondaryFocus[];
        }
        return [];
    } catch {
        return [];
    }
}
