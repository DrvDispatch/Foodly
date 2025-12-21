'use client'

import { formatTime, getMealTypeLabel, cn } from '@/lib/utils'
import { UtensilsCrossed, Loader2, ChevronRight, Flame, Sparkles } from 'lucide-react'
import NextImage from 'next/image'

interface MealCardProps {
    meal: {
        id: string
        type: string
        title?: string | null
        description?: string | null
        photoUrl?: string | null
        mealTime: string | Date
        isAnalyzing?: boolean
        activeSnapshot?: {
            calories: number
            protein: number
            carbs: number
            fat: number
            confidence: number
        } | null
    }
    // Goal-aware insight (generated externally)
    insight?: string | null
    onClick?: () => void
    className?: string
}

export function MealCard({ meal, insight, onClick, className }: MealCardProps) {
    const time = formatTime(meal.mealTime)
    const isAnalyzing = meal.isAnalyzing || meal.type === 'analyzing'
    const typeLabel = isAnalyzing ? 'Analyzing...' : getMealTypeLabel(meal.type)
    const hasAnalysis = meal.activeSnapshot && !isAnalyzing

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
            className={cn(
                "card card-interactive p-4 cursor-pointer",
                className
            )}
        >
            {/* Top Row: Photo, Title */}
            <div className="flex items-start gap-3">
                {/* Photo/Icon */}
                <div className="relative w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br from-surface-100 to-surface-200 flex items-center justify-center overflow-hidden">
                    {meal.photoUrl ? (
                        <NextImage
                            src={meal.photoUrl}
                            alt={meal.description || typeLabel}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <UtensilsCrossed className="w-6 h-6 text-surface-400" />
                    )}
                    {/* Analyzing overlay */}
                    {isAnalyzing && meal.photoUrl && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white animate-pulse-soft" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="min-w-0">
                        <h3 className="text-body font-semibold text-surface-900 truncate">
                            {meal.title || meal.description || typeLabel}
                        </h3>
                        <p className="text-caption text-surface-500">
                            {isAnalyzing ? (
                                <span className="text-primary-600 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    AI analyzing...
                                </span>
                            ) : (
                                <>{typeLabel} • {time}</>
                            )}
                        </p>
                    </div>

                    {/* Nutrition Row */}
                    <div className="mt-2">
                        {isAnalyzing ? (
                            // Skeleton loading state
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-16 skeleton rounded-lg" />
                                <div className="h-6 w-12 skeleton rounded-lg" />
                                <div className="h-6 w-12 skeleton rounded-lg" />
                                <div className="h-6 w-12 skeleton rounded-lg" />
                            </div>
                        ) : hasAnalysis ? (
                            <>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Calories Badge */}
                                    <span className="pill macro-calories">
                                        <Flame className="w-3 h-3" />
                                        <span>{meal.activeSnapshot!.calories}</span>
                                    </span>

                                    {/* Macros */}
                                    <span className="pill macro-protein">
                                        P {Math.round(meal.activeSnapshot!.protein)}g
                                    </span>
                                    <span className="pill macro-carbs">
                                        C {Math.round(meal.activeSnapshot!.carbs)}g
                                    </span>
                                    <span className="pill macro-fat">
                                        F {Math.round(meal.activeSnapshot!.fat)}g
                                    </span>
                                </div>

                                {/* Goal-aware insight - one line verdict */}
                                {insight && (
                                    <p className="text-micro text-surface-500 mt-1.5">
                                        {insight}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-caption text-surface-400 italic">
                                No nutrition data
                            </p>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-surface-300 flex-shrink-0 mt-1" />
            </div>
        </div>
    )
}

export function MealCardSkeleton() {
    return (
        <div className="card p-4">
            <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl skeleton" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton rounded" />
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="flex gap-2 mt-3">
                        <div className="h-6 w-16 skeleton rounded-lg" />
                        <div className="h-6 w-12 skeleton rounded-lg" />
                        <div className="h-6 w-12 skeleton rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    )
}
