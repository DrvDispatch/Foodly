import useSWR from 'swr'
import { apiFetcher } from '@/lib/api-client'
import type { TimeRange } from '@/components/trends/TimeRangeSelector'

interface MealBreakdown {
    breakfast: number
    lunch: number
    dinner: number
    snack: number
}

interface MealBreakdownData {
    range: string
    breakdown: {
        calories: MealBreakdown
        protein: MealBreakdown
        carbs: MealBreakdown
        fat: MealBreakdown
    }
    totals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    goals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    consistencyScores: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    mealCount: number
}

export function useMealBreakdown(range: TimeRange) {
    const { data, error, isLoading, mutate } = useSWR<MealBreakdownData>(
        `/trends/meal-breakdown?range=${range}`,
        apiFetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000 // 1 minute
        }
    )

    return {
        data,
        isLoading,
        error,
        refresh: mutate
    }
}
