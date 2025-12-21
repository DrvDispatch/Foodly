'use client'

import { GoalRing } from '@/components/goal-ring'
import { cn } from '@/lib/utils'
import { UserContext, DayContext, getDailyInsightSignal } from '@/lib/insights'
import { useDailyInsight } from '@/hooks/useInsights'

interface DailySummary {
    calories: number
    protein: number
    carbs: number
    fat: number
    goalCalories: number
    goalProtein: number
    goalCarbs: number
    goalFat: number
}

interface DailyProgressCardProps {
    summary: DailySummary
    selectedDate: Date
    mealCount?: number
    userContext?: UserContext | null
    onClick?: () => void
}

export function DailyProgressCard({
    summary,
    selectedDate,
    mealCount = 0,
    userContext,
    onClick
}: DailyProgressCardProps) {
    const proteinProgress = Math.min(100, (summary.protein / summary.goalProtein) * 100)
    const carbsProgress = Math.min(100, (summary.carbs / summary.goalCarbs) * 100)
    const fatProgress = Math.min(100, (summary.fat / summary.goalFat) * 100)

    // Build day context for insight hook
    const hourOfDay = new Date().getHours()
    const dayContext: DayContext = {
        calories: summary.calories,
        protein: summary.protein,
        carbs: summary.carbs,
        fat: summary.fat,
        mealCount,
        hourOfDay,
    }

    // Use Gemini-powered daily insight
    const { insight, isLoading } = useDailyInsight(
        userContext || null,
        dayContext,
        selectedDate
    )

    // Simple fallback while loading or if no Gemini response
    const displayInsight = insight || (
        isLoading
            ? "Analyzing your progress..."
            : "Tracking in progress."
    )

    return (
        <div
            className={cn(
                "card p-5 transition-all",
                onClick && "cursor-pointer hover:shadow-lg"
            )}
            onClick={onClick}
        >
            <div className="flex items-center gap-5">
                {/* Calorie Ring */}
                <GoalRing
                    current={summary.calories}
                    goal={summary.goalCalories}
                    size="lg"
                />

                {/* Stats */}
                <div className="flex-1 min-w-0">
                    <div className="mb-3">
                        <div className="flex items-baseline gap-1">
                            <span className="text-display text-calories">
                                {summary.calories.toLocaleString()}
                            </span>
                            <span className="text-body text-surface-400">
                                / {summary.goalCalories.toLocaleString()}
                            </span>
                        </div>
                        {/* Gemini-powered insight */}
                        <p className={cn(
                            "text-caption text-surface-600 mt-1 transition-opacity",
                            isLoading && "opacity-60"
                        )}>
                            {displayInsight}
                        </p>
                    </div>

                    {/* Macro Bars */}
                    <div className="space-y-2">
                        <MacroProgressRow
                            label="Protein"
                            shortLabel="P"
                            current={summary.protein}
                            goal={summary.goalProtein}
                            color="macro-protein"
                            progress={proteinProgress}
                        />
                        <MacroProgressRow
                            label="Carbs"
                            shortLabel="C"
                            current={summary.carbs}
                            goal={summary.goalCarbs}
                            color="macro-carbs"
                            progress={carbsProgress}
                        />
                        <MacroProgressRow
                            label="Fat"
                            shortLabel="F"
                            current={summary.fat}
                            goal={summary.goalFat}
                            color="macro-fat"
                            progress={fatProgress}
                        />
                    </div>
                </div>
            </div>

            {onClick && (
                <p className="text-micro text-surface-400 text-center mt-3">
                    View nutrition breakdown →
                </p>
            )}
        </div>
    )
}

function MacroProgressRow({
    label,
    shortLabel,
    current,
    goal,
    color,
    progress,
}: {
    label: string
    shortLabel: string
    current: number
    goal: number
    color: string
    progress: number
}) {
    return (
        <div className="flex items-center gap-2" title={label}>
            <span className={cn("pill w-6 h-6 p-0 text-micro", color)}>
                {shortLabel}
            </span>
            <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", color)}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className="text-micro text-surface-600 w-16 text-right tabular-nums">
                {Math.round(current)}/{goal}g
            </span>
        </div>
    )
}

export type { DailySummary }
