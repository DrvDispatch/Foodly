'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { preload } from 'swr'
import { formatTime, getMealTypeLabel, cn } from '@/lib/utils'
import { UtensilsCrossed, Loader2, ChevronRight, Flame, Sparkles, Pencil, Trash2 } from 'lucide-react'
import NextImage from 'next/image'
import { apiFetcher } from '@/lib/api-client'

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
    onEdit?: () => void
    onDelete?: () => void
    className?: string
}

export const MealCard = memo(function MealCard({ meal, insight, onClick, onEdit, onDelete, className }: MealCardProps) {
    const time = formatTime(meal.mealTime)
    const isAnalyzing = meal.isAnalyzing || meal.type === 'analyzing'
    const typeLabel = isAnalyzing ? 'Analyzing...' : getMealTypeLabel(meal.type)
    const hasAnalysis = meal.activeSnapshot && !isAnalyzing

    // Swipe state
    const containerRef = useRef<HTMLDivElement>(null)
    const startX = useRef(0)
    const currentX = useRef(0)
    const [translateX, setTranslateX] = useState(0)
    const [isSwipeActive, setIsSwipeActive] = useState(false)
    const isDragging = useRef(false)

    // Swipe thresholds
    const SWIPE_THRESHOLD = 80 // pixels to reveal actions
    const ACTION_WIDTH = 140 // width of action buttons area

    // Touch handlers for swipe-left gesture
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX
        currentX.current = e.touches[0].clientX
        isDragging.current = true
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return

        currentX.current = e.touches[0].clientX
        const deltaX = currentX.current - startX.current

        // Only allow swipe left (negative delta)
        if (deltaX > 0 && translateX === 0) return

        // Clamp the translation
        const newTranslateX = Math.max(-ACTION_WIDTH, Math.min(0, deltaX + (isSwipeActive ? -ACTION_WIDTH : 0)))
        setTranslateX(newTranslateX)
    }, [isSwipeActive, translateX])

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false

        const deltaX = currentX.current - startX.current

        if (!isSwipeActive && deltaX < -SWIPE_THRESHOLD) {
            // Reveal actions
            setTranslateX(-ACTION_WIDTH)
            setIsSwipeActive(true)
        } else if (isSwipeActive && deltaX > SWIPE_THRESHOLD) {
            // Hide actions
            setTranslateX(0)
            setIsSwipeActive(false)
        } else {
            // Snap back to current state
            setTranslateX(isSwipeActive ? -ACTION_WIDTH : 0)
        }
    }, [isSwipeActive])

    const handleCloseSwipe = useCallback(() => {
        setTranslateX(0)
        setIsSwipeActive(false)
    }, [])

    // Prefetch meal data on hover for instant navigation
    const handleMouseEnter = useCallback(() => {
        preload(`/meals/${meal.id}`, apiFetcher)
    }, [meal.id])

    const handleClick = useCallback(() => {
        if (isSwipeActive) {
            handleCloseSwipe()
        } else {
            onClick?.()
        }
    }, [isSwipeActive, handleCloseSwipe, onClick])

    const hasActions = onEdit || onDelete

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden rounded-2xl", className)}
        >
            {/* Action buttons behind the card */}
            {hasActions && (
                <div className="absolute inset-y-0 right-0 flex items-stretch">
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit()
                                handleCloseSwipe()
                            }}
                            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-blue-500 text-white active:bg-blue-600 transition-colors"
                        >
                            <Pencil className="w-5 h-5" />
                            <span className="text-xs font-medium">Edit</span>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                                handleCloseSwipe()
                            }}
                            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-red-500 text-white active:bg-red-600 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="text-xs font-medium">Delete</span>
                        </button>
                    )}
                </div>
            )}

            {/* Main card content - swipeable */}
            <div
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onTouchStart={hasActions ? handleTouchStart : undefined}
                onTouchMove={hasActions ? handleTouchMove : undefined}
                onTouchEnd={hasActions ? handleTouchEnd : undefined}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
                data-swipeable={hasActions ? "true" : undefined}
                className={cn(
                    "card card-interactive p-4 cursor-pointer relative z-10",
                    hasActions && "swipeable",
                    isDragging.current ? "" : "transition-transform duration-200"
                )}
                style={{ transform: `translateX(${translateX}px)` }}
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

                    {/* Arrow - hide when swiped */}
                    {!isSwipeActive && (
                        <ChevronRight className="w-5 h-5 text-surface-300 flex-shrink-0 mt-1" />
                    )}
                </div>
            </div>
        </div>
    )
})

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

