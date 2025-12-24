'use client'

import useSWR from 'swr'
import { apiFetcher } from '@/lib/api-client'
import { PatternType, CalendarMonthData } from '@/lib/calendar'

export function useCalendarMonth(month: string, pattern: PatternType | null) {
    const params = new URLSearchParams()
    params.set('month', month)
    if (pattern) params.set('pattern', pattern)

    const { data, error, isLoading, mutate } = useSWR<CalendarMonthData>(
        `/calendar/month?${params.toString()}`,
        apiFetcher,
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

