import useSWR from 'swr'
import { apiFetcher } from '@/lib/api-client'

export interface WeightEntry {
    id: string
    weight: number
    date: string
    note: string | null
}

interface WeightHistoryResponse {
    entries: WeightEntry[]
}

export function useWeightEntries() {
    const { data, error, isLoading, mutate } = useSWR<WeightHistoryResponse>(
        '/weight/history',
        apiFetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 seconds cache
            keepPreviousData: true,
        }
    )

    return {
        entries: data?.entries || [],
        isLoading,
        error,
        refresh: mutate,
        mutate,
    }
}

