import useSWR from 'swr'
import { apiFetcher } from '@/lib/api-client'

export interface CoachMessage {
    id: string
    role: 'coach' | 'user'
    type: 'reflection' | 'reply' | 'question'
    content: string
    date: string
    createdAt: string
}

export function useCoachMessages() {
    const { data, error, isLoading, mutate } = useSWR<CoachMessage[]>(
        '/coach/messages',
        apiFetcher,
        {
            revalidateOnFocus: true, // Refresh to see new coach messages
            dedupingInterval: 10000, // 10 seconds cache
            keepPreviousData: true,
        }
    )

    return {
        messages: data || [],
        isLoading,
        error,
        refresh: mutate,
        mutate,
    }
}
