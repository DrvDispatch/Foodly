/**
 * Hook for fetching unified Today summary data
 * 
 * Replaces multiple separate hooks with a single SWR-powered fetch.
 * AI insights are fetched separately to not block initial render.
 */

'use client'

import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export interface TodayMeal {
    id: string
    type: string
    title: string | null
    description: string | null
    photoUrl: string | null
    mealTime: string
    isAnalyzing: boolean
    activeSnapshot: {
        calories: number
        protein: number
        carbs: number
        fat: number
        confidence: number
    } | null
    items: Array<{
        id: string
        name: string
        portion: string | null
        calories: number
        protein: number
        carbs: number
        fat: number
    }>
}

export interface TodaySummary {
    profile: {
        onboarded: boolean
        goalType: string
        secondaryFocus: string
        unitSystem: string
    }
    goals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    meals: TodayMeal[]
    summary: {
        calories: number
        protein: number
        carbs: number
        fat: number
        mealCount: number
    }
    weight: {
        kg: number
        date: string
    } | null
    habits: {
        streak: number
        daysWithMeals: number
        todayMealCount: number
    }
    coachUnread: boolean
    date: string
    isToday: boolean
    cachedInsight: string | null
}

export function useTodaySummary(selectedDate: Date) {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')

    const { data, error, isLoading, mutate } = useSWR<TodaySummary>(
        `/api/today/summary?date=${dateKey}`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000, // Prevent duplicate requests within 5s
            keepPreviousData: true, // Show stale data while revalidating
        }
    )

    return {
        data,
        isLoading,
        error,
        refresh: mutate,
        // Convenience accessors
        meals: data?.meals || [],
        summary: {
            ...data?.summary || { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
            goalCalories: data?.goals?.calories || 2000,
            goalProtein: data?.goals?.protein || 150,
            goalCarbs: data?.goals?.carbs || 200,
            goalFat: data?.goals?.fat || 65,
        },
        goals: data?.goals || { calories: 2000, protein: 150, carbs: 200, fat: 65 },
        profile: data?.profile,
        weight: data?.weight,
        habits: data?.habits,
        coachUnread: data?.coachUnread || false,
        isToday: data?.isToday || false
    }
}
