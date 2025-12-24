'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'
import { apiFetcher } from '@/lib/api-client'

interface SWRProviderProps {
    children: ReactNode
}

/**
 * Global SWR configuration for the app
 * - 30 second deduplication to prevent redundant requests
 * - 5 minute cache time for stale data
 * - Auto-revalidate on window focus
 */
export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                fetcher: apiFetcher,
                dedupingInterval: 30000, // 30 seconds - prevent duplicate requests
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                shouldRetryOnError: true,
                errorRetryCount: 2,
                errorRetryInterval: 3000,
                // Keep previous data while revalidating
                keepPreviousData: true,
                // Focus throttling
                focusThrottleInterval: 10000, // 10 seconds
            }}
        >
            {children}
        </SWRConfig>
    )
}
