/**
 * React hooks for fetching Gemini-powered insights
 * 
 * CACHING STRATEGY:
 * - Cache includes actual meal/day values in key to avoid stale data
 * - Longer TTL (30 min) to reduce API calls
 * - Clear cache on date change
 */

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import {
    InsightSignal,
    UserContext,
    getMealInsightSignal,
    getDailyInsightSignal,
    getWhatNextSignal,
    MealNutrition,
    DayContext,
} from '@/lib/insights'

type DetailLevel = 'brief' | 'detailed'

// Client-side cache with longer TTL
const clientCache = new Map<string, { text: string; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes - much longer to reduce API calls

// Build cache key from actual data values (not just signal facts)
function getCacheKey(
    type: string,
    level: DetailLevel,
    goalType: string,
    values: { calories: number; protein: number; carbs: number; fat: number },
    date?: string
): string {
    const dateKey = date || new Date().toISOString().split('T')[0]
    return `${type}:${level}:${goalType}:${dateKey}:${values.calories}:${values.protein}:${values.carbs}:${values.fat}`
}

async function fetchInsight(
    signal: InsightSignal,
    userContext: UserContext,
    level: DetailLevel,
    cacheKey: string
): Promise<string | null> {
    // Check cache first
    const cached = clientCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.text
    }

    try {
        const data = await apiClient.post<{ insight: string }>('/insights', { signal, userContext, level })
        if (data.insight) {
            clientCache.set(cacheKey, { text: data.insight, timestamp: Date.now() })
            return data.insight
        }
        return null
    } catch {
        return null
    }
}

// ============================================================================
// BRIEF INSIGHTS (for cards on home screen)
// ============================================================================

/**
 * Hook to get brief meal insight (10-15 words)
 */
export function useMealInsight(
    userContext: UserContext | null,
    meal: MealNutrition | null
) {
    const [insight, setInsight] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!userContext || !meal) {
            setInsight(null)
            return
        }

        const signal = getMealInsightSignal(userContext, meal)
        if (!signal) {
            setInsight(null)
            return
        }

        // Build cache key from actual values
        const cacheKey = getCacheKey('meal', 'brief', userContext.goalType, meal)

        // If same key, don't refetch
        if (cacheKey === lastKeyRef.current) {
            return
        }
        lastKeyRef.current = cacheKey

        // Check cache synchronously
        const cached = clientCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setInsight(cached.text)
            return
        }

        setIsLoading(true)
        fetchInsight(signal, userContext, 'brief', cacheKey)
            .then(text => setInsight(text))
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userContext?.goalType, meal?.calories, meal?.protein, meal?.carbs, meal?.fat])

    return { insight, isLoading }
}

/**
 * Hook to get brief daily insight (10-15 words)
 */
export function useDailyInsight(
    userContext: UserContext | null,
    day: DayContext | null,
    selectedDate: Date
) {
    const [insight, setInsight] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!userContext || !day) {
            setInsight(null)
            return
        }

        // Only generate insights for TODAY - past/future days don't need "what to do next"
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selectedDay = new Date(selectedDate)
        selectedDay.setHours(0, 0, 0, 0)
        if (selectedDay.getTime() !== today.getTime()) {
            setInsight(null)
            return
        }

        const dateStr = selectedDate.toISOString().split('T')[0]
        const signal = getDailyInsightSignal(userContext, day, selectedDate)

        // Build cache key including date and actual values
        const cacheKey = getCacheKey('daily', 'brief', userContext.goalType, {
            calories: day.calories,
            protein: day.protein,
            carbs: day.carbs,
            fat: day.fat,
        }, dateStr)

        // If same key, don't refetch
        if (cacheKey === lastKeyRef.current) {
            return
        }
        lastKeyRef.current = cacheKey

        // Clear insight when date changes before fetching new
        setInsight(null)

        // Check cache synchronously
        const cached = clientCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setInsight(cached.text)
            return
        }

        setIsLoading(true)
        fetchInsight(signal, userContext, 'brief', cacheKey)
            .then(text => setInsight(text))
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userContext?.goalType, day?.calories, day?.protein, day?.mealCount, selectedDate.toISOString().split('T')[0]])

    return { insight, isLoading }
}

/**
 * Hook to get what-next hint (8-10 words)
 */
export function useWhatNextHint(
    userContext: UserContext | null,
    day: DayContext | null
) {
    const [hint, setHint] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!userContext || !day) {
            setHint(null)
            return
        }

        const signal = getWhatNextSignal(userContext, day)
        if (!signal) {
            setHint(null)
            return
        }

        const cacheKey = getCacheKey('whatnext', 'brief', userContext.goalType, {
            calories: day.calories,
            protein: day.protein,
            carbs: day.carbs,
            fat: day.fat,
        })

        if (cacheKey === lastKeyRef.current) {
            return
        }
        lastKeyRef.current = cacheKey

        const cached = clientCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setHint(cached.text)
            return
        }

        setIsLoading(true)
        fetchInsight(signal, userContext, 'brief', cacheKey)
            .then(text => setHint(text))
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userContext?.goalType, day?.calories, day?.protein, day?.mealCount])

    return { hint, isLoading }
}

/**
 * Batch fetch brief insights for multiple meals with daily context
 */
export function useMealInsights(
    userContext: UserContext | null,
    meals: Array<{ id: string; nutrition: MealNutrition | null }>,
    dailySummary?: { calories: number; protein: number; carbs: number; fat: number }
) {
    const [insights, setInsights] = useState<Record<string, string | null>>({})
    const [isLoading, setIsLoading] = useState(false)
    const lastMealsRef = useRef<string>('')

    useEffect(() => {
        if (!userContext || meals.length === 0) {
            setInsights({})
            return
        }

        // Build daily progress context for situational awareness
        let dailyProgress: MealNutrition & {
            proteinMet: boolean
            carbsMet: boolean
            fatMet: boolean
            allGoalsMet: boolean
            allGoalsExceeded: boolean
            totalCalories: number
            totalProtein: number
            totalCarbs: number
            totalFat: number
        } | undefined

        if (dailySummary) {
            const proteinMet = dailySummary.protein >= userContext.targetProtein
            const carbsMet = dailySummary.carbs >= userContext.targetCarbs
            const fatMet = dailySummary.fat >= userContext.targetFat
            const calPct = dailySummary.calories / userContext.targetCalories
            const allGoalsMet = calPct >= 0.95 && proteinMet && carbsMet && fatMet
            const allGoalsExceeded = calPct >= 1.1 &&
                dailySummary.protein >= userContext.targetProtein * 1.1 &&
                dailySummary.carbs >= userContext.targetCarbs * 0.9 &&
                dailySummary.fat >= userContext.targetFat * 0.9

            dailyProgress = {
                calories: dailySummary.calories,
                protein: dailySummary.protein,
                carbs: dailySummary.carbs,
                fat: dailySummary.fat,
                proteinMet,
                carbsMet,
                fatMet,
                allGoalsMet,
                allGoalsExceeded,
                totalCalories: dailySummary.calories,
                totalProtein: dailySummary.protein,
                totalCarbs: dailySummary.carbs,
                totalFat: dailySummary.fat,
            }
        }

        // Build a stable key for all meals (include daily summary)
        const mealsKey = meals.map(m =>
            m.nutrition ? `${m.id}:${m.nutrition.calories}:${m.nutrition.protein}` : m.id
        ).join('|') + (dailySummary ? `:daily:${dailySummary.calories}:${dailySummary.protein}` : '')

        // Skip if same meals
        if (mealsKey === lastMealsRef.current) {
            return
        }
        lastMealsRef.current = mealsKey

        setIsLoading(true)

        Promise.all(
            meals.map(async (meal) => {
                if (!meal.nutrition) return { id: meal.id, insight: null }

                const signal = getMealInsightSignal(userContext, meal.nutrition, dailyProgress)
                if (!signal) return { id: meal.id, insight: null }

                // Include daily context in cache key
                const cacheKey = getCacheKey('meal', 'brief', userContext.goalType, meal.nutrition) +
                    (dailyProgress?.allGoalsMet ? ':goalsmet' : '')
                const insight = await fetchInsight(signal, userContext, 'brief', cacheKey)
                return { id: meal.id, insight }
            })
        ).then(results => {
            const map: Record<string, string | null> = {}
            results.forEach(r => { map[r.id] = r.insight })
            setInsights(map)
        }).finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userContext?.goalType, meals.map(m => m.nutrition?.calories).join(','), dailySummary?.calories, dailySummary?.protein])

    return { insights, isLoading }
}

// ============================================================================
// DETAILED INSIGHTS (for modals and detail views)
// ============================================================================

/**
 * Hook to get detailed daily insight (2-3 sentences)
 */
export function useDetailedDailyInsight(
    userContext: UserContext | null,
    day: DayContext | null,
    selectedDate: Date,
    enabled: boolean = true
) {
    const [insight, setInsight] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!enabled || !userContext || !day) {
            setInsight(null)
            return
        }

        // Only generate insights for TODAY
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selectedDay = new Date(selectedDate)
        selectedDay.setHours(0, 0, 0, 0)
        if (selectedDay.getTime() !== today.getTime()) {
            setInsight(null)
            return
        }

        const dateStr = selectedDate.toISOString().split('T')[0]
        const signal = getDailyInsightSignal(userContext, day, selectedDate)

        const cacheKey = getCacheKey('daily', 'detailed', userContext.goalType, {
            calories: day.calories,
            protein: day.protein,
            carbs: day.carbs,
            fat: day.fat,
        }, dateStr)

        if (cacheKey === lastKeyRef.current) {
            return
        }
        lastKeyRef.current = cacheKey

        // Clear old insight when date changes
        setInsight(null)

        const cached = clientCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setInsight(cached.text)
            return
        }

        setIsLoading(true)
        fetchInsight(signal, userContext, 'detailed', cacheKey)
            .then(text => setInsight(text))
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, userContext?.goalType, day?.calories, day?.protein, day?.mealCount, selectedDate.toISOString().split('T')[0]])

    return { insight, isLoading }
}

/**
 * Hook to get detailed meal insight (2-3 sentences)
 */
export function useDetailedMealInsight(
    userContext: UserContext | null,
    meal: MealNutrition | null,
    enabled: boolean = true
) {
    const [insight, setInsight] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!enabled || !userContext || !meal) {
            setInsight(null)
            return
        }

        const signal = getMealInsightSignal(userContext, meal)
        if (!signal) {
            setInsight(null)
            return
        }

        const cacheKey = getCacheKey('meal', 'detailed', userContext.goalType, meal)

        if (cacheKey === lastKeyRef.current) {
            return
        }
        lastKeyRef.current = cacheKey

        const cached = clientCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setInsight(cached.text)
            return
        }

        setIsLoading(true)
        fetchInsight(signal, userContext, 'detailed', cacheKey)
            .then(text => setInsight(text))
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, userContext?.goalType, meal?.calories, meal?.protein, meal?.carbs, meal?.fat])

    return { insight, isLoading }
}
