'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'

export interface Meal {
    id: string
    type: string
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
}

export interface DailySummary {
    calories: number
    protein: number
    carbs: number
    fat: number
    goalCalories: number
    goalProtein: number
    goalCarbs: number
    goalFat: number
}

interface UseDailyMealsOptions {
    goals?: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
}

export function useDailyMeals(selectedDate: Date, options?: UseDailyMealsOptions) {
    const [meals, setMeals] = useState<Meal[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [summary, setSummary] = useState<DailySummary>({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        goalCalories: options?.goals?.calories || 2000,
        goalProtein: options?.goals?.protein || 150,
        goalCarbs: options?.goals?.carbs || 200,
        goalFat: options?.goals?.fat || 65,
    })

    // Update goals when they change
    useEffect(() => {
        if (options?.goals) {
            setSummary(prev => ({
                ...prev,
                goalCalories: options.goals!.calories,
                goalProtein: options.goals!.protein,
                goalCarbs: options.goals!.carbs,
                goalFat: options.goals!.fat,
            }))
        }
    }, [options?.goals])

    const fetchMeals = useCallback(async () => {
        try {
            const startOfDay = new Date(selectedDate)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(selectedDate)
            endOfDay.setHours(23, 59, 59, 999)

            const data: Meal[] = await apiClient.get(
                `/meals?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`
            )

            setMeals(data)

            // Calculate totals (only from analyzed meals)
            let totalCal = 0, totalP = 0, totalC = 0, totalF = 0
            for (const meal of data) {
                if (meal.activeSnapshot) {
                    totalCal += meal.activeSnapshot.calories
                    totalP += meal.activeSnapshot.protein
                    totalC += meal.activeSnapshot.carbs
                    totalF += meal.activeSnapshot.fat
                }
            }

            setSummary(prev => ({
                ...prev,
                calories: totalCal,
                protein: totalP,
                carbs: totalC,
                fat: totalF,
            }))

            // Return true if any meals are still analyzing
            return data.some(m => m.isAnalyzing || m.type === 'analyzing')
        } catch (error) {
            console.error('Failed to fetch meals:', error)
        }
        return false
    }, [selectedDate])

    const deleteMeal = useCallback(async (mealId: string) => {
        try {
            await apiClient.delete(`/meals/${mealId}`)
            // Optimistic update
            setMeals(prev => prev.filter(m => m.id !== mealId))
            // Recalculate summary
            await fetchMeals()
            return true
        } catch (error) {
            console.error('Failed to delete meal:', error)
        }
        return false
    }, [fetchMeals])

    const refreshMeals = useCallback(async () => {
        const hasAnalyzing = await fetchMeals()
        return hasAnalyzing
    }, [fetchMeals])

    // Initial fetch
    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null

        async function initialFetch() {
            setIsLoading(true)
            const hasAnalyzing = await fetchMeals()
            setIsLoading(false)

            // Poll while analyzing
            if (hasAnalyzing) {
                pollInterval = setInterval(async () => {
                    const stillAnalyzing = await fetchMeals()
                    if (!stillAnalyzing && pollInterval) {
                        clearInterval(pollInterval)
                        pollInterval = null
                    }
                }, 2000)
            }
        }

        initialFetch()

        return () => {
            if (pollInterval) clearInterval(pollInterval)
        }
    }, [fetchMeals])

    return {
        meals,
        isLoading,
        summary,
        deleteMeal,
        refreshMeals,
    }
}
