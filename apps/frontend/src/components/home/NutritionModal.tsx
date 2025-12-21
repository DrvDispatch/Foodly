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
                className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 animate-scale-in">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md mx-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-heading text-surface-900">
                            {isToday ? "Today's Nutrition" : dateLabel}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-surface-400 hover:text-surface-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* AI Insight - Detailed */}
                    {(insight || isLoading) && (
                        <div className={cn(
                            "mb-6 p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200/50",
                            isLoading && "opacity-60"
                        )}>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-body text-surface-700 leading-relaxed">
                                    {insight || "Analyzing your day..."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Calories */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-body font-semibold text-surface-900">Calories</span>
                            <span className="text-body text-surface-600">
                                {summary.calories.toLocaleString()} / {summary.goalCalories.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, caloriesProgress)}%` }}
                            />
                        </div>
                        <p className="text-caption text-surface-500 mt-1">
                            {summary.goalCalories - summary.calories > 0
                                ? `${(summary.goalCalories - summary.calories).toLocaleString()} remaining`
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
                        className="btn btn-secondary w-full mt-6"
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
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <div>
                    <span className="text-body font-medium text-surface-900">{label}</span>
                    <p className="text-micro text-surface-400">{description}</p>
                </div>
                <span className="text-caption text-surface-600 tabular-nums">
                    {Math.round(current)}g / {goal}g
                </span>
            </div>
            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", color)}
                    style={{ width: `${Math.min(100, progress)}%` }}
                />
            </div>
        </div>
    )
}
