import useSWR from 'swr'
import { apiFetcher } from '@/lib/api-client'

interface WeightEntry {
    id: string
    weight: number
    date: string
    note?: string
}

interface WeightTrendData {
    entries: WeightEntry[]
    targetWeight?: number
    currentWeight?: number
    unitSystem: string
    goalType?: string
    weeklyPace?: number
}

export function useWeightTrend(dateRange: '7d' | '30d' | '90d' | '180d') {
    // Determine how many entries to fetch based on range
    const limit = dateRange === '7d' ? 14 : dateRange === '30d' ? 60 : dateRange === '90d' ? 180 : 365

    const { data, error, isLoading, mutate } = useSWR<WeightTrendData>(
        `/weight?limit=${limit}`,
        apiFetcher,
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
            refreshInterval: 0
        }
    )

    // Filter entries by date range
    const filteredEntries = data?.entries.filter(entry => {
        const entryDate = new Date(entry.date)
        const now = new Date()
        const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 180
        const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        return entryDate >= cutoff
    }) || []

    return {
        entries: filteredEntries,
        targetWeight: data?.targetWeight,
        currentWeight: data?.currentWeight,
        unitSystem: (data?.unitSystem || 'metric') as 'metric' | 'imperial',
        goalType: data?.goalType as 'fat_loss' | 'maintenance' | 'muscle_gain' | 'strength' | 'recomp' | 'health' | undefined,
        weeklyPace: data?.weeklyPace, // kg per week from user's onboarding settings
        isLoading,
        error,
        refresh: mutate
    }
}

