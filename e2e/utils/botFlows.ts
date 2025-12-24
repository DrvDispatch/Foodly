
export type BotAction =
    | 'LOG_MEAL'
    | 'LOG_WEIGHT'
    | 'CHAT_COACH'
    | 'CHECK_CALENDAR'
    | 'VIEW_TRENDS'
    | 'EDIT_PROFILE'
    | 'CHECK_HEALTH'
    | 'VIEW_TIMELINE'
    | 'BROWSE_SETTINGS'
    | 'IDLE';

export interface ActionWeight {
    action: BotAction;
    weight: number; // probability weight
}

export const DEFAULT_WEIGHTS: ActionWeight[] = [
    { action: 'LOG_MEAL', weight: 30 },
    { action: 'LOG_WEIGHT', weight: 10 },
    { action: 'CHAT_COACH', weight: 15 },
    { action: 'CHECK_CALENDAR', weight: 10 },
    { action: 'VIEW_TRENDS', weight: 10 },
    { action: 'EDIT_PROFILE', weight: 5 },
    { action: 'CHECK_HEALTH', weight: 5 },
    { action: 'VIEW_TIMELINE', weight: 10 },
    { action: 'BROWSE_SETTINGS', weight: 3 },
    { action: 'IDLE', weight: 2 },
];

export function getRandomAction(weights = DEFAULT_WEIGHTS): BotAction {
    const totalWeight = weights.reduce((acc, curr) => acc + curr.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weights) {
        if (random < item.weight) return item.action;
        random -= item.weight;
    }

    return 'IDLE';
}

// All meal images (original 10 + 2 new)
export const MEAL_IMAGES = [
    'meal_breakfast_eggs_1766423880515.png',
    'meal_chicken_rice_1766423839919.png',
    'meal_pasta_bolognese_1766423853027.png',
    'meal_salad_bowl_1766423895521.png',
    'meal_salmon_vegetables_1766423866634.png',
    'meal_sushi_plate_1766423919876.png',
    'meal_steak_potatoes_1766424485953.png',
    'meal_oatmeal_fruits_new_3_1766424579444.png',
    'meal_smoothie_bowl_new_3_1766424593146.png',
    'meal_burger_fries_final_1766424614883.png',
    'meal_avocado_toast_1766429033422.png',
    'meal_greek_yogurt_1766429046799.png',
];

export const COACH_QUESTIONS = [
    "How am I doing on my protein goal this week?",
    "Can you suggest a healthy dinner based on my remaining calories?",
    "What's my biggest vitamin deficiency right now?",
    "Tell me about my progress in the last 30 days.",
    "I'm feeling hungry but I hit my limit, what should I do?",
    "Explain my weight trend, is it healthy?",
    "Show me my best logging day lately.",
];

export const CALENDAR_QUERIES = [
    "Show days with high protein",
    "Days I logged more than 3 meals",
    "Days I logged weight",
    "Show streaks longer than 3 days",
    "Days with fiber over 25g"
];
