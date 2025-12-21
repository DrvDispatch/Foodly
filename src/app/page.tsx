'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Flame, Sparkles, Calendar, ArrowRight } from 'lucide-react'
import NextImage from 'next/image'

import { DatePicker, DailyProgressCard, NutritionModal, DashboardCards } from '@/components/home'
import { MealCard, MealCardSkeleton } from '@/components/meal-card'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { QuickAdd } from '@/components/quick-add'
import { QuickAddFab } from '@/components/QuickAddFab'
import { AddWeightSheet } from '@/components/AddWeightSheet'
import { BottomNav } from '@/components/bottom-nav'
import { useTodaySummary } from '@/hooks/useTodaySummary'
import { useMealInsights, useWhatNextHint } from '@/hooks/useInsights'
import { formatDate, cn } from '@/lib/utils'
import {
    UserContext,
    DayContext,
    mapLegacyGoalType,
    parseSecondaryFocuses,
} from '@/lib/insights'

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
    const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true)
    const [deletingMealId, setDeletingMealId] = useState<string | null>(null)

    // User context for AI insights
    const [userContext, setUserContext] = useState<UserContext | null>(null)

    // UNIFIED DATA FETCH - Single API call for all Today data
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

    // Set user context from unified data (for AI insights)
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
    const isTodayDate = isToday // From hook
    const isPast = selectedDate < today
    const isFuture = selectedDate > today

    // Format date for banner
    const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    })

    // Auth redirect
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    // Check onboarding only (profile/goals now come from unified API)
    useEffect(() => {
        async function checkOnboarding() {
            if (status !== 'authenticated') return

            // Check if user has completed onboarding
            if (profile && !profile.onboarded) {
                router.push('/onboarding/goal')
                return
            }

            setIsCheckingOnboarding(false)
        }

        checkOnboarding()
    }, [status, router, profile])

    // Handle meal added - NO router.refresh() to avoid CSS flash
    const handleMealAdded = async (mealDate?: Date) => {
        // If meal was logged to a different date, switch to that date
        if (mealDate) {
            const mealDay = new Date(mealDate)
            mealDay.setHours(0, 0, 0, 0)
            if (mealDay.toDateString() !== selectedDate.toDateString()) {
                setSelectedDate(mealDay)
            }
        }

        // Start polling for analysis updates
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

    // Handle delete meal
    const handleDeleteMeal = async (mealId: string) => {
        setDeletingMealId(mealId)
        try {
            await fetch(`/api/meals/${mealId}`, { method: 'DELETE' })
            await refreshTodayData()
        } catch (error) {
            console.error('Failed to delete meal:', error)
        }
        setDeletingMealId(null)
    }

    // Jump to today
    const jumpToToday = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        setSelectedDate(today)
    }

    // Loading state
    if (status === 'loading' || isCheckingOnboarding) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-caption text-surface-500">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-24 bg-surface-50">
            {/* Header */}
            <header className="px-5 pt-6 pb-4 bg-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-caption text-surface-500">
                            {formatDate(new Date())}
                        </p>
                        <h1 className="text-title text-surface-900">
                            Hi, {session?.user?.name?.split(' ')[0] || 'there'} 👋
                        </h1>
                    </div>
                    <NextImage src="/favicon.png" alt="Foodly" width={40} height={40} className="rounded-xl shadow-lg" />
                </div>
            </header>

            {/* Date Picker */}
            <section className="mb-4 bg-white pb-2">
                <DatePicker
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />
            </section>

            {/* Past Date Banner - Very Prominent */}
            {!isToday && (
                <div className={cn(
                    "mx-5 mb-4 p-4 rounded-2xl",
                    isPast
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : "bg-gradient-to-r from-purple-500 to-purple-600"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold">
                                {isPast ? 'Viewing Past Date' : 'Viewing Future Date'}
                            </p>
                            <p className="text-white/80 text-caption">
                                {formattedSelectedDate}
                            </p>
                        </div>
                        <button
                            onClick={jumpToToday}
                            className="px-3 py-1.5 bg-white rounded-lg text-caption font-semibold text-blue-600 flex items-center gap-1"
                        >
                            Today
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Dashboard Insight Cards */}
            <DashboardCards
                selectedDate={selectedDate}
                summary={summary}
                goals={goals}
                onNutritionClick={() => setShowNutritionDetail(true)}
            />

            {/* Meals Section */}
            <section className="px-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-heading text-surface-900">
                        {isToday ? "Today's Meals" : `Meals on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </h2>
                    <span className="text-caption text-surface-400">
                        {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                    </span>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <MealCardSkeleton />
                        <MealCardSkeleton />
                    </div>
                ) : meals.length > 0 ? (
                    <MealsList
                        meals={meals}
                        userContext={userContext}
                        dailySummary={summary}
                        deletingMealId={deletingMealId}
                        onDelete={handleDeleteMeal}
                        onEdit={(id) => router.push(`/meal/${id}?edit=true`)}
                        onClick={(id) => router.push(`/meal/${id}`)}
                    />
                ) : (
                    <EmptyMealsState
                        isToday={isToday}
                        isPast={isPast}
                        onAddMeal={() => setIsQuickAddOpen(true)}
                    />
                )}
            </section>

            {/* What Next? Hint - goal-aware */}
            {isToday && meals.length > 0 && userContext && (
                <GoalAwareWhatNext userContext={userContext} summary={summary} />
            )}

            {/* Nutrition Detail Modal */}
            {showNutritionDetail && (
                <NutritionModal
                    summary={summary}
                    selectedDate={selectedDate}
                    userContext={userContext}
                    mealCount={meals.length}
                    onClose={() => setShowNutritionDetail(false)}
                />
            )}

            {/* FAB Menu - Add Meal or Add Weight */}
            <QuickAddFab
                onAddMeal={() => setIsQuickAddOpen(true)}
                onAddWeight={() => setIsAddWeightOpen(true)}
                disabled={isFuture}
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
        </div>
    )
}

// Meals list with Gemini-powered insights
function MealsList({
    meals,
    userContext,
    dailySummary,
    deletingMealId,
    onDelete,
    onEdit,
    onClick,
}: {
    meals: Array<{
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
    }>
    userContext: UserContext | null
    dailySummary?: { calories: number; protein: number; carbs: number; fat: number }
    deletingMealId: string | null
    onDelete: (id: string) => void
    onEdit: (id: string) => void
    onClick: (id: string) => void
}) {
    // Fetch all meal insights in parallel with daily context
    const mealData = meals.map(m => ({
        id: m.id,
        nutrition: m.activeSnapshot ? {
            calories: m.activeSnapshot.calories,
            protein: m.activeSnapshot.protein,
            carbs: m.activeSnapshot.carbs,
            fat: m.activeSnapshot.fat,
        } : null,
    }))
    const { insights } = useMealInsights(userContext, mealData, dailySummary)

    // Sort meals chronologically (newest first - first meal of day at bottom)
    const sortedMeals = [...meals].sort((a, b) => {
        const timeA = new Date(a.mealTime).getTime()
        const timeB = new Date(b.mealTime).getTime()
        return timeB - timeA  // Reversed: newest first
    })

    return (
        <div className="space-y-3">
            {sortedMeals.map((meal) => (
                <SwipeableRow
                    key={meal.id}
                    onDelete={() => onDelete(meal.id)}
                    onEdit={() => onEdit(meal.id)}
                    disabled={deletingMealId === meal.id}
                >
                    <MealCard
                        meal={meal}
                        insight={insights[meal.id]}
                        onClick={() => onClick(meal.id)}
                    />
                </SwipeableRow>
            ))}
        </div>
    )
}

// Goal-aware What Next hint using Gemini
function GoalAwareWhatNext({
    userContext,
    summary
}: {
    userContext: UserContext
    summary: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
}) {
    const hour = new Date().getHours()
    const dayContext: DayContext = {
        calories: summary.calories,
        protein: summary.protein,
        carbs: summary.carbs,
        fat: summary.fat,
        mealCount: 1,
        hourOfDay: hour,
    }

    const { hint, isLoading } = useWhatNextHint(userContext, dayContext)

    if (!hint && !isLoading) return null

    return (
        <div className="px-5 py-3">
            <p className={cn(
                "text-caption text-surface-500 text-center transition-opacity",
                isLoading && "opacity-50"
            )}>
                💭 {hint || "Thinking..."}
            </p>
        </div>
    )
}

// Empty state component
function EmptyMealsState({
    isToday,
    isPast,
    onAddMeal,
}: {
    isToday: boolean
    isPast: boolean
    onAddMeal: () => void
}) {
    return (
        <div className="card p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-surface-100 flex items-center justify-center">
                <Flame className="w-7 h-7 text-surface-400" />
            </div>
            <h3 className="text-body font-semibold text-surface-900 mb-1">
                {isToday ? 'No meals logged yet' : 'No meals on this day'}
            </h3>
            <p className="text-caption text-surface-500 mb-4">
                {isToday
                    ? 'Capture your first meal of the day'
                    : isPast
                        ? 'You can still log meals for past dates'
                        : 'Scroll to another date to view meals'}
            </p>
            {(isToday || isPast) && (
                <button
                    onClick={onAddMeal}
                    className="btn btn-primary"
                >
                    Log Meal
                </button>
            )}
        </div>
    )
}
