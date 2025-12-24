'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface MealBreakdown {
    breakfast: number
    lunch: number
    dinner: number
    snack: number
}

interface MacroSourceBreakdownProps {
    metric: 'calories' | 'protein' | 'carbs' | 'fat'
    breakdown: MealBreakdown
    total: number
    consistencyScore: number // 0-100
    goal: number
}

// Small circular progress ring
function MealRing({
    label,
    value,
    total,
    color
}: {
    label: string
    value: number
    total: number
    color: string
}) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
    const radius = 28
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference * (1 - percentage / 100)

    const mealEmojis: Record<string, string> = {
        'Breakfast': '🌅',
        'Lunch': '☀️',
        'Dinner': '🌙',
        'Snack': '🍿'
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                    {/* Background ring */}
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-surface-200 dark:text-surface-600"
                    />
                    {/* Progress ring */}
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg">{mealEmojis[label]}</span>
                </div>
            </div>
            <span className="text-xs text-surface-600 dark:text-surface-400">{label}</span>
            <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">{percentage}%</span>
        </div>
    )
}

// Consistency meter
function ConsistencyMeter({ score }: { score: number }) {
    const getLabel = (s: number) => {
        if (s >= 80) return { text: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400' }
        if (s >= 60) return { text: 'Good', color: 'text-blue-600 dark:text-blue-400' }
        if (s >= 40) return { text: 'Moderate', color: 'text-amber-600 dark:text-amber-400' }
        return { text: 'Needs work', color: 'text-red-500 dark:text-red-400' }
    }

    const label = getLabel(score)

    return (
        <div className="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-700/50 rounded-xl">
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-surface-600 dark:text-surface-400">Consistency</span>
                    <span className={cn("text-xs font-medium", label.color)}>{label.text}</span>
                </div>
                <div className="h-2 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-700",
                            score >= 80 ? "bg-emerald-500" :
                                score >= 60 ? "bg-blue-500" :
                                    score >= 40 ? "bg-amber-500" : "bg-red-400"
                        )}
                        style={{ width: `${Math.min(score, 100)}%` }}
                    />
                </div>
            </div>
            <span className="text-lg font-bold text-surface-800 dark:text-surface-100">{score}%</span>
        </div>
    )
}

export function MacroSourceBreakdown({
    metric,
    breakdown,
    total,
    consistencyScore,
    goal
}: MacroSourceBreakdownProps) {
    const [aiExplanation, setAiExplanation] = useState<string | null>(null)
    const [isLoadingAI, setIsLoadingAI] = useState(false)
    const [aiRequested, setAiRequested] = useState(false)

    const metricConfig = {
        calories: {
            label: 'Calories',
            unit: 'kcal',
            color: '#f97316', // orange
            bgClass: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
            borderClass: 'border-orange-200 dark:border-orange-800/50'
        },
        protein: {
            label: 'Protein',
            unit: 'g',
            color: '#3b82f6', // blue
            bgClass: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
            borderClass: 'border-blue-200 dark:border-blue-800/50'
        },
        carbs: {
            label: 'Carbs',
            unit: 'g',
            color: '#eab308', // yellow
            bgClass: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
            borderClass: 'border-amber-200 dark:border-amber-800/50'
        },
        fat: {
            label: 'Fat',
            unit: 'g',
            color: '#ec4899', // pink
            bgClass: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
            borderClass: 'border-rose-200 dark:border-rose-800/50'
        }
    }

    const config = metricConfig[metric]

    // Find the dominant meal
    const dominantMeal = useMemo(() => {
        const meals = [
            { name: 'Breakfast', value: breakdown.breakfast },
            { name: 'Lunch', value: breakdown.lunch },
            { name: 'Dinner', value: breakdown.dinner },
            { name: 'Snack', value: breakdown.snack }
        ]
        return meals.reduce((max, meal) => meal.value > max.value ? meal : max, meals[0])
    }, [breakdown])

    // Fetch AI explanation
    const fetchAIExplanation = async () => {
        if (aiRequested) return
        setIsLoadingAI(true)
        setAiRequested(true)

        try {
            const response = await apiClient.post<{ explanation: string }>('/trends/explain-source', {
                metric,
                breakdown,
                total,
                goal,
                consistencyScore
            })
            setAiExplanation(response.explanation)
        } catch (error) {
            console.error('Failed to get AI explanation:', error)
            // Fallback explanation
            const pct = Math.round((dominantMeal.value / total) * 100)
            setAiExplanation(
                `Most of your ${config.label.toLowerCase()} (${pct}%) comes from ${dominantMeal.name.toLowerCase()}. ` +
                `${consistencyScore >= 70 ? "You're doing great with consistency!" : "Try to spread intake more evenly across meals for better results."}`
            )
        } finally {
            setIsLoadingAI(false)
        }
    }

    // Lite mode when not enough data
    if (total === 0) {
        return (
            <div className={cn(
                "rounded-2xl p-5 border",
                config.bgClass,
                config.borderClass
            )}>
                <p className="text-center text-surface-600 dark:text-surface-400 py-4">
                    Log some meals to see where your {config.label.toLowerCase()} comes from!
                </p>
            </div>
        )
    }

    return (
        <div className={cn(
            "rounded-2xl p-5 border space-y-4",
            config.bgClass,
            config.borderClass
        )}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">
                    {config.label} by Meal
                </h3>
                <span className="text-sm text-surface-600 dark:text-surface-400">
                    {Math.round(total)} {config.unit} total
                </span>
            </div>

            {/* Meal Rings */}
            <div className="flex justify-between px-2">
                <MealRing
                    label="Breakfast"
                    value={breakdown.breakfast}
                    total={total}
                    color={config.color}
                />
                <MealRing
                    label="Lunch"
                    value={breakdown.lunch}
                    total={total}
                    color={config.color}
                />
                <MealRing
                    label="Dinner"
                    value={breakdown.dinner}
                    total={total}
                    color={config.color}
                />
                <MealRing
                    label="Snack"
                    value={breakdown.snack}
                    total={total}
                    color={config.color}
                />
            </div>

            {/* Dominant Insight */}
            <p className="text-sm text-surface-700 dark:text-surface-300 text-center">
                Most {config.label.toLowerCase()} comes from{' '}
                <span className="font-semibold">{dominantMeal.name}</span>
                {' '}({Math.round((dominantMeal.value / total) * 100)}%)
            </p>

            {/* Consistency Score */}
            <ConsistencyMeter score={consistencyScore} />

            {/* AI Explanation */}
            {!aiRequested ? (
                <button
                    onClick={fetchAIExplanation}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/60 dark:bg-surface-700/60 hover:bg-white/80 dark:hover:bg-surface-600/80 transition-colors text-sm font-medium text-surface-700 dark:text-surface-200"
                >
                    <Sparkles className="w-4 h-4" />
                    Get AI Analysis
                </button>
            ) : isLoadingAI ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-surface-600 dark:text-surface-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                </div>
            ) : aiExplanation ? (
                <div className="p-3 bg-white/60 dark:bg-surface-700/60 rounded-xl">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-surface-800 dark:text-surface-200 leading-relaxed">
                            {aiExplanation}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

