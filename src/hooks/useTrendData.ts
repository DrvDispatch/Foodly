import useSWR from 'swr'
import type { TimeRange } from '@/components/trends/TimeRangeSelector'

interface TrendDataPoint {
    date: string
    calories: number
    protein: number
    carbs: number
    fat: number
    mealCount: number
}

interface TrendStats {
    mean: number
    stdDev: number
    consistencyScore: number
    trend: 'up' | 'down' | 'stable'
}

interface TrendData {
    range: string
    startDate: string
    endDate: string
    goals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    dataPoints: TrendDataPoint[]
    stats: {
        calories: TrendStats
        protein: TrendStats
        carbs: TrendStats
        fat: TrendStats
    }
    confidence: {
        loggedDays: number
        totalDays: number
        percentage: number
        level: 'high' | 'medium' | 'low'
    }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useTrendData(range: TimeRange) {
    const { data, error, isLoading, mutate } = useSWR<TrendData>(
        `/api/trends?range=${range}`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000 // 30 seconds
        }
    )

    return {
        data,
        isLoading,
        error,
        refresh: mutate
    }
}
