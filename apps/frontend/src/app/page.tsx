'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Flame,
    Sparkles,
    Calendar,
    ChevronDown,
    Scale,
    MessageCircle,
    ChevronRight,
    ChevronLeft,
    Utensils,
    Target,
    TrendingUp,
    TrendingDown,
    Check,
    X,
    Plus,
    Edit2,
    Trash2
} from 'lucide-react'
import NextImage from 'next/image'
import useSWR from 'swr'

import { NutritionModal, DatePicker } from '@/components/home'
import { QuickAdd } from '@/components/quick-add'
import { QuickAddFab } from '@/components/QuickAddFab'
import { AddWeightSheet } from '@/components/AddWeightSheet'
import { BottomNav } from '@/components/bottom-nav'
import { useTodaySummary } from '@/hooks/useTodaySummary'
import { cn } from '@/lib/utils'
import { apiClient, apiFetcher } from '@/lib/api-client'
import {
    UserContext,
    mapLegacyGoalType,
    parseSecondaryFocuses,
} from '@/lib/insights'

// Circular progress ring component
function CalorieRing({
    consumed,
    target,
    size = 100,
    strokeWidth = 8
}: {
    consumed: number
    target: number
    size?: number
    strokeWidth?: number
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const progress = Math.min(consumed / target, 1)
    const strokeDashoffset = circumference * (1 - progress)
    const isOver = consumed > target
    const percentage = Math.round((consumed / target) * 100)

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-surface-200 dark:text-white/10"
                    strokeWidth={strokeWidth}
                />
                {/* Main progress ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={isOver ? "#ef4444" : "url(#calorieGradient)"}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                    style={{
                        filter: isOver ? 'drop-shadow(0 0 6px rgba(239,68,68,0.5))' : 'drop-shadow(0 0 6px rgba(16,185,129,0.4))'
                    }}
                />
                <defs>
                    <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Center percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn(
                    "text-xl font-bold",
                    isOver ? "text-red-400" : "text-emerald-400"
                )}>
                    {percentage}%
                </span>
            </div>
        </div>
    )
}


// Macro progress bar component
function MacroBar({
    label,
    current,
    target,
    color
}: {
    label: string
    current: number
    target: number
    color: 'blue' | 'amber' | 'rose'
}) {
    const percentage = Math.min((current / target) * 100, 100)
    const isOver = current > target
    const colorClasses = {
        blue: 'bg-blue-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
    }
    const textColors = {
        blue: 'text-blue-400',
        amber: 'text-amber-400',
        rose: 'text-rose-400',
    }

    return (
        <div className="flex-1">
            <p className="text-xs text-surface-400 mb-1">{label}</p>
            <p className={cn("text-sm font-semibold", isOver ? "text-red-400" : textColors[color])}>
                {Math.round(current)}g
            </p>
            <div className="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full mt-1 overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isOver ? "bg-red-500" : colorClasses[color]
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    )
}

// Swipeable Meal row component with edit/delete actions
function MealRow({
    meal,
    onClick,
    onEdit,
    onDelete
}: {
    meal: {
        id: string
        title?: string | null
        photoUrl?: string | null
        mealTime: string | Date
        activeSnapshot?: { calories: number } | null
    }
    onClick: () => void
    onEdit?: () => void
    onDelete?: () => void
}) {
    const [swipeX, setSwipeX] = useState(0)
    const [startX, setStartX] = useState(0)
    const [startY, setStartY] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const ACTION_THRESHOLD = 80 // pixels to reveal actions

    const time = new Date(meal.mealTime)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / 60000)

    let timeLabel: string
    if (diffMinutes < 1) {
        timeLabel = 'Just now'
    } else if (diffMinutes < 60) {
        timeLabel = `${diffMinutes} min ago`
    } else {
        timeLabel = time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX)
        setStartY(e.touches[0].clientY)
        // Don't set isSwiping yet - wait for move to determine direction
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        const diffX = currentX - startX
        const diffY = currentY - startY

        // If not already swiping, check direction
        if (!isSwiping) {
            // If horizontal move is significantly larger than vertical, start swiping
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
                setIsSwiping(true)
            } else {
                return // Let browser handle vertical scroll
            }
        }

        // If we are swiping, handle the movement
        if (isSwiping) {
            // Only allow swiping left (negative values), limit to -160px
            const newSwipeX = Math.max(-160, Math.min(0, diffX + (swipeX < 0 ? swipeX : 0)))
            setSwipeX(diffX < 0 ? newSwipeX : Math.min(0, diffX))
        }
    }

    const handleTouchEnd = () => {
        setIsSwiping(false)
        // Snap to open or closed
        if (swipeX < -ACTION_THRESHOLD) {
            setSwipeX(-160) // Reveal actions
            // Haptic feedback
            if ('vibrate' in navigator) navigator.vibrate(10)
        } else {
            setSwipeX(0) // Close
        }
    }

    const closeSwipe = () => setSwipeX(0)

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Background actions */}
            <div className="absolute inset-y-0 right-0 flex">
                <button
                    onClick={() => {
                        closeSwipe()
                        onEdit?.()
                    }}
                    className="w-20 flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                    <Edit2 className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={() => {
                        closeSwipe()
                        onDelete?.()
                    }}
                    className="w-20 flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors"
                >
                    <Trash2 className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Main content - swipeable */}
            <div
                ref={containerRef}
                className={cn(
                    "relative flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 select-none touch-pan-y cursor-grab active:cursor-grabbing",
                    !isSwiping && "transition-transform duration-200 ease-out"
                )}
                style={{
                    transform: `translateX(${swipeX}px)`,
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (swipeX === 0) onClick()
                    else closeSwipe()
                }}
            >
                {meal.photoUrl ? (
                    <NextImage
                        src={meal.photoUrl}
                        alt={meal.title || 'Meal'}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-5 h-5 text-surface-400 dark:text-surface-500" />
                    </div>
                )}
                <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                        {meal.title || 'Untitled Meal'}
                    </p>
                    <p className="text-xs text-surface-400">
                        {meal.activeSnapshot?.calories || 0} kcal • {timeLabel}
                    </p>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-500 flex-shrink-0" />
            </div>
        </div>
    )
}

// Today's Direction Card - swipeable with real insights
function TodaysDirectionCard({
    summary,
    goals,
    profile,
    weight,
    habits,
    meals,
    onLogMeal
}: {
    summary: { calories: number; protein: number; carbs: number; fat: number }
    goals: { calories: number; protein: number; carbs: number; fat: number }
    profile: { goalType: string }
    weight: { kg: number } | null
    habits: { streak: number; daysWithMeals: number }
    meals: Array<{ activeSnapshot?: { calories: number; protein: number } | null }>
    onLogMeal: () => void
}) {
    const [activeSlide, setActiveSlide] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // Calculate real insights
    const calorieDeficit = goals.calories - summary.calories
    const proteinGap = goals.protein - summary.protein
    const isOnTrack = summary.calories <= goals.calories
    const hour = new Date().getHours()

    // Generate personalized tips based on actual data
    const tips: string[] = []

    if (proteinGap > 30 && hour < 18) {
        tips.push(`Prioritize protein at dinner 🍗`)
    }
    if (hour >= 20 && summary.calories < goals.calories * 0.9) {
        tips.push(`Avoid late-night snacking 🚫`)
    }
    if (summary.protein >= goals.protein) {
        tips.push(`Great protein intake today! 💪`)
    }
    if (meals.length === 0 && hour >= 10) {
        tips.push(`Log your first meal to stay on track`)
    }

    // Goal type display
    const goalLabels: Record<string, string> = {
        lose: 'fat loss',
        fat_loss: 'fat loss',
        gain: 'muscle gain',
        muscle_gain: 'muscle gain',
        maintain: 'maintenance',
        maintenance: 'maintenance',
        recomp: 'recomp',
        health: 'health',
    }
    const goalLabel = goalLabels[profile.goalType] || profile.goalType

    // Calculate meal quality score average
    const qualityScores = meals
        .map(m => (m.activeSnapshot as { qualityScore?: number } | null)?.qualityScore)
        .filter((s): s is number => s != null)
    const avgQualityScore = qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : null

    // Direction text - DON'T say 'deficit', say 'remaining' or 'left'
    let directionText = ''
    const remaining = goals.calories - summary.calories
    if (remaining > 0) {
        directionText = `${remaining.toLocaleString()} kcal left for today. You're on track for your ${goalLabel} goal.`
    } else {
        directionText = `You've exceeded your ${goals.calories.toLocaleString()} kcal target by ${Math.abs(remaining).toLocaleString()}. Consider lighter meals.`
    }

    const slides = [
        // Slide 1: Today's Direction
        <div key="direction" className="min-w-full px-1">
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm dark:shadow-none border border-surface-100 dark:border-surface-700">
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-surface-900 mb-1">Today&apos;s Direction</h3>
                        <p className="text-xs text-surface-500 dark:text-surface-300 leading-relaxed">
                            {directionText}
                        </p>
                    </div>
                </div>

                {tips.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                        {tips.slice(0, 2).map((tip, i) => (
                            <p key={i} className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-teal-500 dark:bg-teal-400" />
                                {tip}
                            </p>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                        <span className={cn(
                            "font-medium",
                            isOnTrack ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                            {habits.daysWithMeals}/7 days on track
                        </span>
                        {habits.streak > 0 && (
                            <span className="text-surface-500 dark:text-surface-400">
                                🔥 {habits.streak} day streak
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onLogMeal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Log Meal
                    </button>
                </div>
            </div>
        </div>,

        // Slide 2: Weight & Progress
        <div key="progress" className="min-w-full px-1">
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm dark:shadow-none border border-surface-100 dark:border-surface-700">
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-surface-900 mb-1">Your Progress</h3>
                        <p className="text-xs text-surface-500 dark:text-surface-300">
                            {weight ? `Current weight: ${weight.kg} kg` : 'Log your weight to track progress'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700/50">
                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">Meal Quality</p>
                        <p className="text-lg font-semibold text-surface-900">
                            {avgQualityScore ? `${avgQualityScore}/100` : '--'}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700/50">
                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">Days Logged</p>
                        <p className="text-lg font-semibold text-surface-900">
                            {habits.daysWithMeals}/7 this week
                        </p>
                    </div>
                </div>
            </div>
        </div>
    ]

    return (
        <div className="relative">
            <div
                ref={containerRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {slides}
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-1.5 mt-2">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            containerRef.current?.scrollTo({
                                left: i * containerRef.current.offsetWidth,
                                behavior: 'smooth'
                            })
                            setActiveSlide(i)
                        }}
                        className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors",
                            activeSlide === i ? "bg-emerald-500 dark:bg-emerald-400" : "bg-surface-300 dark:bg-surface-600"
                        )}
                    />
                ))}
            </div>
        </div>
    )
}

export default function HomePage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    // Selected date for viewing
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return today
    })

    // UI state
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
    const [isAddWeightOpen, setIsAddWeightOpen] = useState(false)
    const [showNutritionDetail, setShowNutritionDetail] = useState(false)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true)
    const [deletingMealId, setDeletingMealId] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // User context for AI insights
    const [userContext, setUserContext] = useState<UserContext | null>(null)

    // UNIFIED DATA FETCH
    const {
        data: todayData,
        isLoading,
        meals,
        summary,
        goals,
        profile,
        isToday,
        refresh: refreshTodayData
    } = useTodaySummary(selectedDate)

    // Fetch weight data for insights
    const { data: weightData } = useSWR('/weight', apiFetcher)

    // Set user context from unified data
    useEffect(() => {
        if (profile && goals) {
            setUserContext({
                goalType: mapLegacyGoalType(profile.goalType),
                secondaryFocuses: parseSecondaryFocuses(profile.secondaryFocus),
                sex: undefined,
                age: undefined,
                activityLevel: undefined,
                targetCalories: goals.calories,
                targetProtein: goals.protein,
                targetCarbs: goals.carbs,
                targetFat: goals.fat,
            })
        }
    }, [profile, goals])

    // Derived date helpers
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isTodayDate = isToday
    const isPast = selectedDate < today
    const isFuture = selectedDate > today

    // Time-based greeting
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    // Auth redirect
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    // Check onboarding
    useEffect(() => {
        async function checkOnboarding() {
            if (status !== 'authenticated') return
            if (profile && !profile.onboarded) {
                router.push('/onboarding/goal')
                return
            }
            setIsCheckingOnboarding(false)
        }
        checkOnboarding()
    }, [status, router, profile])

    // Handle meal added
    const handleMealAdded = async (mealDate?: Date) => {
        if (mealDate) {
            const mealDay = new Date(mealDate)
            mealDay.setHours(0, 0, 0, 0)
            if (mealDay.toDateString() !== selectedDate.toDateString()) {
                setSelectedDate(mealDay)
            }
        }

        const poll = async () => {
            const result = await refreshTodayData()
            const stillAnalyzing = result?.meals?.some(m => m.isAnalyzing)
            if (stillAnalyzing) {
                setTimeout(poll, 2000)
            }
        }
        await refreshTodayData()
        poll()
    }

    // Handle meal delete
    const handleDeleteMeal = async () => {
        if (!deletingMealId) return
        setIsDeleting(true)
        try {
            await apiClient.delete(`/meals/${deletingMealId}`)
            await refreshTodayData()
            // Haptic feedback on success
            if ('vibrate' in navigator) navigator.vibrate(50)
        } catch (err) {
            console.error('Failed to delete meal:', err)
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
            setDeletingMealId(null)
        }
    }

    // Computed values
    const caloriesConsumed = summary?.calories || 0
    const caloriesTarget = goals?.calories || 2000
    const caloriesRemaining = Math.max(0, caloriesTarget - caloriesConsumed)

    const proteinConsumed = summary?.protein || 0
    const proteinTarget = goals?.protein || 150

    const carbsConsumed = summary?.carbs || 0
    const carbsTarget = goals?.carbs || 200

    const fatConsumed = summary?.fat || 0
    const fatTarget = goals?.fat || 65

    // Weight from unified data
    const currentWeight = todayData?.weight?.kg

    // Habits from unified data
    const habitsStreak = todayData?.habits?.streak || 0
    const daysWithMeals = todayData?.habits?.daysWithMeals || 0

    // Sort meals by time (newest first)
    const sortedMeals = useMemo(() =>
        [...meals].sort((a, b) =>
            new Date(b.mealTime).getTime() - new Date(a.mealTime).getTime()
        ), [meals]
    )

    // Calculate micronutrients from today's meals (real data!)
    const micronutrients = useMemo(() => {
        // Sum up micronutrients from all meal snapshots
        const totals = { vitaminD: 0, iron: 0, fiber: 0, vitaminC: 0 }
        meals.forEach(meal => {
            const snap = meal.activeSnapshot as {
                vitaminD?: number
                iron?: number
                fiber?: number
                vitaminC?: number
            } | null
            if (snap) {
                totals.vitaminD += snap.vitaminD || 0
                totals.iron += snap.iron || 0
                totals.fiber += snap.fiber || 0
                totals.vitaminC += snap.vitaminC || 0
            }
        })

        // Daily values (DV) for reference
        return [
            { name: 'Vitamin D', value: totals.vitaminD, dv: 20, unit: 'mcg' },
            { name: 'Iron', value: totals.iron, dv: 18, unit: 'mg' },
            { name: 'Fiber', value: totals.fiber, dv: 28, unit: 'g' },
            { name: 'Vitamin C', value: totals.vitaminC, dv: 90, unit: 'mg' },
        ].filter(n => n.value > 0 || meals.length > 0)
    }, [meals])

    // Loading state
    if (status === 'loading' || isCheckingOnboarding) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-surface-500">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-24 bg-surface-50 dark:bg-surface-900">
            {/* Header */}
            <header className="px-5 pt-6 pb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-surface-900">
                        {greeting}, {session?.user?.name?.split(' ')[0] || 'there'}
                    </h1>
                    {session?.user?.image ? (
                        <NextImage
                            src={session.user.image}
                            alt="Profile"
                            width={36}
                            height={36}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                            <span className="text-sm font-medium text-surface-700 dark:text-white">
                                {session?.user?.name?.[0] || 'U'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Date picker & Ask AI */}
                <div className="flex items-center justify-between mt-4">
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        onClick={() => setShowDatePicker(true)}
                    >
                        <Calendar className="w-4 h-4 text-surface-500" />
                        <span className="text-sm text-surface-900">
                            {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}, {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronDown className="w-4 h-4 text-surface-500" />
                    </button>

                    <button
                        onClick={() => router.push('/coach')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    >
                        <Sparkles className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                        <span className="text-sm text-surface-900">Ask AI</span>
                    </button>
                </div>
            </header>

            {/* Date Picker Modal */}
            {showDatePicker && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
                    <div className="w-full bg-white dark:bg-surface-800 rounded-t-3xl p-4 pb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-surface-900">Select Date</h2>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center"
                            >
                                <X className="w-4 h-4 text-surface-600 dark:text-white" />
                            </button>
                        </div>
                        <DatePicker
                            selectedDate={selectedDate}
                            onDateChange={(date) => {
                                setSelectedDate(date)
                                setShowDatePicker(false)
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Viewing Another Day Banner */}
            {!isToday && (
                <div className="px-5 mb-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                    Viewing {isFuture ? 'future' : 'past'} day
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
                        >
                            Go to Today
                        </button>
                    </div>
                </div>
            )}

            {/* Goal Adjustment Banner - Shows when over/under target */}
            {todayData?.goalAdjustment?.shouldAdjust && (
                <section className="px-5 mb-4">
                    <button
                        onClick={() => router.push('/adjust-goals')}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center gap-4 hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/30 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-surface-900 dark:text-white mb-0.5">
                                {todayData.goalAdjustment.difference > 0
                                    ? `${Math.abs(todayData.goalAdjustment.difference).toFixed(1)}kg over target`
                                    : `${Math.abs(todayData.goalAdjustment.difference).toFixed(1)}kg under target`
                                }
                            </p>
                            <p className="text-xs text-surface-400">
                                Tap to review your plan →
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-amber-400" />
                    </button>
                </section>
            )}

            <section className="px-5 mb-4">
                <div
                    className="p-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm dark:shadow-none cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors"
                    onClick={() => setShowNutritionDetail(true)}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <CalorieRing
                            consumed={caloriesConsumed}
                            target={caloriesTarget}
                            size={100}
                            strokeWidth={8}
                        />
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-3xl font-bold",
                                    caloriesConsumed > caloriesTarget ? "text-red-500 dark:text-red-400" : "text-surface-900"
                                )}>
                                    {caloriesConsumed.toLocaleString()}
                                </span>
                                <span className="text-surface-400">
                                    / {caloriesTarget.toLocaleString()} kcal
                                </span>
                            </div>
                            <p className={cn(
                                "text-sm mt-1",
                                caloriesConsumed > caloriesTarget ? "text-red-400" : "text-surface-400"
                            )}>
                                {caloriesConsumed > caloriesTarget
                                    ? `${(caloriesConsumed - caloriesTarget).toLocaleString()} over`
                                    : `${caloriesRemaining.toLocaleString()} remaining`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Macro bars */}
                    <div className="flex gap-4">
                        <MacroBar
                            label="Protein"
                            current={proteinConsumed}
                            target={proteinTarget}
                            color="blue"
                        />
                        <MacroBar
                            label="Carbs"
                            current={carbsConsumed}
                            target={carbsTarget}
                            color="amber"
                        />
                        <MacroBar
                            label="Fat"
                            current={fatConsumed}
                            target={fatTarget}
                            color="rose"
                        />
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="px-5 mb-4">
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsQuickAddOpen(true)}
                        disabled={isFuture}
                        className={cn(
                            "flex-1 py-3 rounded-xl flex items-center justify-center transition-all",
                            "bg-surface-100 dark:bg-surface-700/50 hover:bg-surface-200 dark:hover:bg-surface-600/50 active:scale-95",
                            isFuture && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Utensils className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </button>
                    <button
                        onClick={() => setIsAddWeightOpen(true)}
                        disabled={isFuture}
                        className={cn(
                            "flex-1 py-3 rounded-xl flex items-center justify-center transition-all",
                            "bg-surface-100 dark:bg-surface-700/50 hover:bg-surface-200 dark:hover:bg-surface-600/50 active:scale-95",
                            isFuture && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Scale className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </button>
                    <button
                        onClick={() => router.push('/coach')}
                        className="flex-1 py-3 rounded-xl flex items-center justify-center transition-all bg-surface-100 dark:bg-surface-700/50 hover:bg-surface-200 dark:hover:bg-surface-600/50 active:scale-95"
                    >
                        <MessageCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </button>
                </div>
            </section>

            {/* Today's Direction Card - Swipeable */}
            {isToday && profile && goals && (
                <section className="px-5 mb-4">
                    <TodaysDirectionCard
                        summary={summary || { calories: 0, protein: 0, carbs: 0, fat: 0 }}
                        goals={goals}
                        profile={profile}
                        weight={todayData?.weight || null}
                        habits={{ streak: habitsStreak, daysWithMeals }}
                        meals={meals}
                        onLogMeal={() => setIsQuickAddOpen(true)}
                    />
                </section>
            )}

            {/* Today's Meals */}
            <section className="px-5 mb-4">
                <h2 className="text-lg font-semibold text-surface-900 mb-3">
                    Today&apos;s Meals
                </h2>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
                        ))}
                    </div>
                ) : sortedMeals.length > 0 ? (
                    <div className="space-y-2">
                        {sortedMeals.map(meal => (
                            <MealRow
                                key={meal.id}
                                meal={meal}
                                onClick={() => router.push(`/meal/${meal.id}`)}
                                onEdit={() => router.push(`/meal/${meal.id}?edit=true`)}
                                onDelete={() => {
                                    setDeletingMealId(meal.id)
                                    setShowDeleteConfirm(true)
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-6 rounded-xl bg-white dark:bg-surface-800 shadow-sm dark:shadow-none text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                            <Flame className="w-6 h-6 text-surface-400 dark:text-surface-500" />
                        </div>
                        <p className="text-sm font-medium text-surface-900 mb-1">No meals logged yet</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-4">Capture your first meal of the day</p>
                        <button
                            onClick={() => setIsQuickAddOpen(true)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white transition-colors"
                        >
                            Log Meal
                        </button>
                    </div>
                )}
            </section>

            {/* Insights & Trends */}
            <section className="px-5 mb-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-3">
                    Insights & Trends
                </h2>

                <div className="p-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm dark:shadow-none">
                    {/* Weight & Goal Row - Clickable */}
                    <button
                        onClick={() => router.push('/weight')}
                        className="flex gap-4 mb-4 w-full text-left hover:bg-surface-50 dark:hover:bg-surface-700/30 -m-2 p-2 rounded-xl transition-colors"
                    >
                        <div className="flex-1">
                            <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">Weight Trend</p>
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-semibold text-surface-900">
                                    {currentWeight ? `${currentWeight} kg` : '--'}
                                </p>
                                {/* Weight comparison to TARGET - dynamic coloring */}
                                {currentWeight && profile?.targetWeight && (() => {
                                    const diff = currentWeight - profile.targetWeight
                                    const isAboveTarget = diff > 0
                                    const isBelowTarget = diff < 0
                                    const isAtTarget = Math.abs(diff) < 0.5

                                    if (isAtTarget) {
                                        return (
                                            <span className="text-xs font-medium text-emerald-400">
                                                ✓ At goal
                                            </span>
                                        )
                                    }

                                    // Determine if goal is weight gain (muscle_gain, strength) or loss (fat_loss, recomp)
                                    const goalIsGain = profile.goalType === 'muscle_gain' || profile.goalType === 'strength'
                                    const goalIsLoss = profile.goalType === 'lose' || profile.goalType === 'fat_loss' || profile.goalType === 'recomp'

                                    // For gain: below target = need to gain (show up arrow, green = on track)
                                    // For loss: above target = need to lose (show down arrow, green = on track)
                                    let isOnTrack = false
                                    let actionText = ''
                                    let icon = null

                                    if (goalIsGain) {
                                        // Gaining weight goal
                                        isOnTrack = isAboveTarget || (isBelowTarget && Math.abs(diff) < 1) // Getting closer is good
                                        actionText = isBelowTarget ? `${Math.abs(diff).toFixed(1)}kg to gain` : `${diff.toFixed(1)}kg gained`
                                        icon = <TrendingUp className="w-3 h-3" />
                                    } else if (goalIsLoss) {
                                        // Losing weight goal  
                                        isOnTrack = isBelowTarget || (isAboveTarget && Math.abs(diff) < 1)
                                        actionText = isAboveTarget ? `${diff.toFixed(1)}kg to lose` : `${Math.abs(diff).toFixed(1)}kg lost`
                                        icon = <TrendingDown className="w-3 h-3" />
                                    } else {
                                        // Maintenance or other
                                        actionText = `${Math.abs(diff).toFixed(1)}kg ${isAboveTarget ? 'over' : 'under'}`
                                        icon = isAboveTarget ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                                    }

                                    return (
                                        <span className={cn(
                                            "text-xs font-medium flex items-center gap-0.5",
                                            goalIsGain ? "text-blue-400" : goalIsLoss ? "text-emerald-400" : "text-surface-400"
                                        )}>
                                            {icon}
                                            {actionText}
                                        </span>
                                    )
                                })()}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">Target Weight</p>
                            <p className="text-sm text-surface-900">
                                {profile?.targetWeight ? `${profile.targetWeight} kg` : 'Not set'}
                            </p>
                        </div>
                    </button>

                    {/* Micronutrient Snapshot - Clickable to Health Page */}
                    <button
                        onClick={() => router.push('/health')}
                        className="w-full text-left hover:bg-surface-50 dark:hover:bg-surface-700/30 -m-2 p-2 rounded-xl transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-surface-900">Micronutrient Snapshot</p>
                            <ChevronRight className="w-4 h-4 text-surface-400" />
                        </div>
                        {micronutrients.length > 0 && meals.length > 0 ? (
                            <div className="space-y-2">
                                {micronutrients.map(nutrient => {
                                    const percentage = Math.min((nutrient.value / nutrient.dv) * 100, 100)
                                    const color = percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                                    return (
                                        <div key={nutrient.name} className="flex items-center gap-3">
                                            <span className="text-xs text-surface-400 w-20">{nutrient.name}</span>
                                            <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all", color)}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-surface-400 w-10 text-right">
                                                {Math.round(percentage)}%
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-surface-500">Log meals to see micronutrient data</p>
                        )}
                    </button>
                </div>
            </section >

            {/* Nutrition Detail Modal */}
            {
                showNutritionDetail && (
                    <NutritionModal
                        summary={summary}
                        selectedDate={selectedDate}
                        userContext={userContext}
                        mealCount={meals.length}
                        onClose={() => setShowNutritionDetail(false)}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-sm w-full shadow-xl animate-scale-in">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-surface-900 text-center mb-2">
                            Delete Meal?
                        </h3>
                        <p className="text-sm text-surface-500 text-center mb-6">
                            This action cannot be undone. The meal and all its nutritional data will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeletingMealId(null)
                                }}
                                disabled={isDeleting}
                                className="flex-1 py-3 rounded-xl bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-white font-medium hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteMeal}
                                disabled={isDeleting}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB */}
            <QuickAddFab
                onAddMeal={() => setIsQuickAddOpen(true)}
                onAddWeight={() => setIsAddWeightOpen(true)}
                disabled={isFuture}
                hidden={showDatePicker}
            />

            {/* Quick Add Sheet */}
            <QuickAdd
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                onSuccess={handleMealAdded}
            />

            {/* Add Weight Sheet */}
            <AddWeightSheet
                isOpen={isAddWeightOpen}
                onClose={() => setIsAddWeightOpen(false)}
            />

            {/* Bottom Navigation */}
            <BottomNav coachUnread={todayData?.coachUnread} />
        </div >
    )
}
