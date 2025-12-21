'use client'

import useSWR from 'swr'
import { PatternType } from '@/lib/calendar'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useCalendarMonth(month: string, pattern: PatternType | null) {
    const params = new URLSearchParams()
    params.set('month', month)
    if (pattern) params.set('pattern', pattern)

    const { data, error, isLoading, mutate } = useSWR(
        `/api/calendar/month?${params.toString()}`,
        fetcher,
        {
            keepPreviousData: true, // Smooth transitions between months
            revalidateOnFocus: false,
        }
    )

    return {
        data,
        isLoading,
        error,
        refresh: mutate
    }
}
