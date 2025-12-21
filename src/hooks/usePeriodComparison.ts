import useSWR from 'swr'

interface PeriodData {
    label: string
    start: string
    end: string
    avgCalories: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    loggedDays: number
    totalDays: number
    calorieVariability: number
}

interface CompareData {
    preset: string
    period1: PeriodData
    period2: PeriodData
    deltas: {
        calories: number
        protein: number
        carbs: number
        fat: number
        variability: number
    }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function usePeriodComparison(preset: '14d' | '30d' = '14d') {
    const { data, error, isLoading, mutate } = useSWR<CompareData>(
        `/api/trends/compare?preset=${preset}`,
        fetcher,
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
