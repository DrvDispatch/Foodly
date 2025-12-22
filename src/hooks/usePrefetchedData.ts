'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCachedData, setCachedData } from '@/lib/app-store'
import { apiClient } from '@/lib/api-client'

interface UsePrefetchedDataOptions {
    /** Cache key used during bootstrap prefetch */
    cacheKey: string
    /** API endpoint to fetch if cache miss */
    apiUrl: string
    /** How long to wait before showing loading state (ms) */
    loadingDelay?: number
}

interface UsePrefetchedDataResult<T> {
    data: T | null
    isLoading: boolean
    error: string | null
    refresh: () => Promise<void>
    isFromCache: boolean
}

/**
 * Hook that reads from bootstrap cache first, then falls back to fresh fetch.
 * This makes navigation feel instant after bootstrap.
 */
export function usePrefetchedData<T>({
    cacheKey,
    apiUrl,
    loadingDelay = 100
}: UsePrefetchedDataOptions): UsePrefetchedDataResult<T> {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isFromCache, setIsFromCache] = useState(false)

    // Fetch data (with cache check)
    const fetchData = useCallback(async (skipCache = false) => {
        // First, try reading from cache
        if (!skipCache) {
            const cached = getCachedData<T>(cacheKey)
            if (cached) {
                console.log(`[usePrefetchedData] Cache HIT: ${cacheKey}`)
                setData(cached)
                setIsFromCache(true)
                return
            }
        }

        console.log(`[usePrefetchedData] Cache MISS: ${cacheKey}, fetching ${apiUrl}`)
        setIsFromCache(false)

        // Delay showing loading state to prevent flicker
        const loadingTimer = setTimeout(() => {
            setIsLoading(true)
        }, loadingDelay)

        try {
            const freshData: T = await apiClient.get(apiUrl)
            clearTimeout(loadingTimer)

            setData(freshData)
            setError(null)

            // Update cache for next time
            setCachedData(cacheKey, freshData)
        } catch (err) {
            clearTimeout(loadingTimer)
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }, [cacheKey, apiUrl, loadingDelay])

    // Initial fetch
    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Manual refresh (bypasses cache)
    const refresh = useCallback(async () => {
        await fetchData(true)
    }, [fetchData])

    return {
        data,
        isLoading,
        error,
        refresh,
        isFromCache
    }
}

// ============================================================================
// Pre-built hooks for each page
// ============================================================================

/** Hook for Calendar page - reads prefetched month data */
export function usePrefetchedCalendar() {
    return usePrefetchedData({
        cacheKey: 'calendar_month',
        apiUrl: '/calendar/month'
    })
}

/** Hook for Coach page - reads prefetched messages */
export function usePrefetchedCoach() {
    return usePrefetchedData({
        cacheKey: 'coach_messages',
        apiUrl: '/coach/messages'
    })
}

/** Hook for Habits page - reads prefetched summary */
export function usePrefetchedHabits() {
    return usePrefetchedData({
        cacheKey: 'habits_summary',
        apiUrl: '/habits/summary'
    })
}

/** Hook for Health page - reads prefetched weekly data */
export function usePrefetchedHealth() {
    return usePrefetchedData({
        cacheKey: 'health_weekly',
        apiUrl: '/health/weekly'
    })
}

/** Hook for Trends page - reads prefetched weight history */
export function usePrefetchedTrends() {
    return usePrefetchedData({
        cacheKey: 'trends_history',
        apiUrl: '/weight/history'
    })
}
