/**
 * Goal Type Labels and Configuration
 */

export const PRIMARY_GOAL_LABELS: Record<string, { label: string; description: string }> = {
    fat_loss: {
        label: 'Fat Loss',
        description: 'Reduce body fat while preserving muscle',
    },
    maintenance: {
        label: 'Maintenance',
        description: 'Maintain current weight and body composition',
    },
    muscle_gain: {
        label: 'Muscle Gain',
        description: 'Build muscle with controlled weight gain',
    },
    strength: {
        label: 'Strength',
        description: 'Focus on strength gains',
    },
    recomp: {
        label: 'Body Recomposition',
        description: 'Lose fat and gain muscle simultaneously',
    },
    health: {
        label: 'General Health',
        description: 'Focus on overall health and wellness',
    },
    lose: {
        label: 'Weight Loss',
        description: 'Lose weight',
    },
    maintain: {
        label: 'Maintain Weight',
        description: 'Maintain current weight',
    },
    gain: {
        label: 'Weight Gain',
        description: 'Gain weight',
    },
};

export const SECONDARY_FOCUS_OPTIONS = [
    { id: 'energy', label: 'Energy Levels', icon: '⚡' },
    { id: 'sleep', label: 'Better Sleep', icon: '😴' },
    { id: 'muscle', label: 'Build Muscle', icon: '💪' },
    { id: 'endurance', label: 'Endurance', icon: '🏃' },
    { id: 'mental', label: 'Mental Clarity', icon: '🧠' },
    { id: 'digestion', label: 'Digestion', icon: '🌿' },
];
