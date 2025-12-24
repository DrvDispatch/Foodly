'use client'

import { X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDetailedDailyInsight } from '@/hooks/useInsights'
import { UserContext, DayContext } from '@/lib/insights'
import type { DailySummary } from './DailyProgressCard'

interface NutritionModalProps {
    summary: DailySummary
    selectedDate: Date
    userContext?: UserContext | null
    mealCount?: number
    onClose: () => void
}

export function NutritionModal({
    summary,
    selectedDate,
    userContext,
    mealCount = 0,
    onClose
}: NutritionModalProps) {
    const proteinProgress = (summary.protein / summary.goalProtein) * 100
    const carbsProgress = (summary.carbs / summary.goalCarbs) * 100
    const fatProgress = (summary.fat / summary.goalFat) * 100
    const caloriesProgress = (summary.calories / summary.goalCalories) * 100

    const isToday = selectedDate.toDateString() === new Date().toDateString()
    const dateLabel = isToday
        ? "Today's"
        : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

    // Build day context for detailed insight
    const dayContext: DayContext = {
        calories: summary.calories,
        protein: summary.protein,
        carbs: summary.carbs,
        fat: summary.fat,
        mealCount,
        hourOfDay: new Date().getHours(),
    }

    // Fetch detailed insight (2-3 sentences)
    const { insight, isLoading } = useDetailedDailyInsight(
        userContext || null,
        dayContext,
        selectedDate,
        true
    )

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 animate-scale-in">
                <div className="bg-surface-800 rounded-3xl shadow-2xl max-w-md mx-auto p-6 border border-surface-700">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">
                            {isToday ? "Today's Nutrition" : dateLabel}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-surface-400 hover:text-white rounded-full hover:bg-surface-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* AI Insight - Properly styled for dark mode */}
                    {(insight || isLoading) && (
                        <div className={cn(
                            "mb-6 p-4 rounded-2xl bg-surface-700/50 border border-surface-600",
                            isLoading && "animate-pulse"
                        )}>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-sm text-surface-200 leading-relaxed">
                                    {insight || "Analyzing your day..."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Calories */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">Calories</span>
                            <span className="text-sm text-surface-300">
                                {summary.calories.toLocaleString()} / {summary.goalCalories.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    caloriesProgress > 100
                                        ? "bg-red-500"
                                        : "bg-gradient-to-r from-orange-400 to-orange-500"
                                )}
                                style={{ width: `${Math.min(100, caloriesProgress)}%` }}
                            />
                        </div>
                        <p className="text-xs text-surface-400 mt-1">
                            {summary.goalCalories - summary.calories > 0
                                ? `${(summary.goalCalories - summary.calories).toLocaleString()} remaining`
                                : summary.calories > summary.goalCalories
                                    ? `${(summary.calories - summary.goalCalories).toLocaleString()} over target`
                                    : 'Goal reached! 🎉'}
                        </p>
                    </div>

                    {/* Macros */}
                    <div className="space-y-4">
                        <MacroDetailRow
                            label="Protein"
                            current={summary.protein}
                            goal={summary.goalProtein}
                            progress={proteinProgress}
                            color="bg-blue-500"
                            description="Builds and repairs muscles"
                        />
                        <MacroDetailRow
                            label="Carbohydrates"
                            current={summary.carbs}
                            goal={summary.goalCarbs}
                            progress={carbsProgress}
                            color="bg-amber-500"
                            description="Primary energy source"
                        />
                        <MacroDetailRow
                            label="Fat"
                            current={summary.fat}
                            goal={summary.goalFat}
                            progress={fatProgress}
                            color="bg-rose-500"
                            description="Supports cell growth"
                        />
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 text-white font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    )
}

function MacroDetailRow({
    label,
    current,
    goal,
    progress,
    color,
    description,
}: {
    label: string
    current: number
    goal: number
    progress: number
    color: string
    description: string
}) {
    const isOver = current > goal

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <div>
                    <span className="text-sm font-medium text-white">{label}</span>
                    <p className="text-xs text-surface-400">{description}</p>
                </div>
                <span className={cn(
                    "text-sm tabular-nums",
                    isOver ? "text-red-400" : "text-surface-300"
                )}>
                    {Math.round(current)}g / {goal}g
                </span>
            </div>
            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isOver ? "bg-red-500" : color
                    )}
                    style={{ width: `${Math.min(100, progress)}%` }}
                />
            </div>
        </div>
    )
}
