'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { apiClient } from './api-client'
import { syncAuthState } from './auth-bridge'

// ============================================================================
// TYPES
// ============================================================================

export interface AppProfile {
    id?: string
    name: string | null
    email: string
    onboarded: boolean
    goalType: string
    unitSystem: string
}

export interface AppGoals {
    calories: number
    protein: number
    carbs: number
    fat: number
}

export interface TodaySummary {
    date: string
    mealCount: number
    calories: number
    protein: number
    carbs: number
    fat: number
    hasAnalyzing: boolean
}

export interface AppWeight {
    value: number
    date: string
}

export interface CalendarDay {
    date: string
    calories: number
    mealCount: number
}

export interface AppState {
    // Bootstrap status
    isBootstrapped: boolean
    isLoading: boolean
    error: string | null

    // Core data
    authenticated: boolean
    profile: AppProfile | null
    goals: AppGoals
    today: TodaySummary | null
    weight: AppWeight | null
    coachUnread: boolean
    calendar: {
        month: string
        days: CalendarDay[]
    }
    habits: {
        streak: number
        daysWithMeals: number
    }
}

// ============================================================================
// GLOBAL DATA CACHE
// ============================================================================

interface CacheEntry {
    data: any
    timestamp: number
}

// Global cache for prefetched API data
const globalDataCache = new Map<string, CacheEntry>()

// Cache TTL - 5 minutes
const CACHE_TTL = 5 * 60 * 1000

/**
 * Get data from the global cache
 * Returns null if not cached or expired
 */
export function getCachedData<T>(key: string): T | null {
    const entry = globalDataCache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        globalDataCache.delete(key)
        return null
    }

    return entry.data as T
}

/**
 * Manually set data in the global cache
 */
export function setCachedData(key: string, data: any): void {
    globalDataCache.set(key, {
        data,
        timestamp: Date.now()
    })
}

/**
 * Invalidate a cache entry
 */
export function invalidateCache(key: string): void {
    globalDataCache.delete(key)
}

/**
 * Invalidate all cache entries
 */
export function clearCache(): void {
    globalDataCache.clear()
}

interface AppContextType extends AppState {
    // Actions
    refresh: () => Promise<void>
    updateToday: (partial: Partial<TodaySummary>) => void
    setCoachUnread: (unread: boolean) => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const defaultGoals: AppGoals = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65
}

const defaultState: AppState = {
    isBootstrapped: false,
    isLoading: true,
    error: null,
    authenticated: false,
    profile: null,
    goals: defaultGoals,
    today: null,
    weight: null,
    coachUnread: false,
    calendar: { month: '', days: [] },
    habits: { streak: 0, daysWithMeals: 0 }
}

const AppContext = createContext<AppContextType | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { status } = useSession()
    const [state, setState] = useState<AppState>(defaultState)
    const bootstrapAttempted = useRef(false)

    // Bootstrap function
    const bootstrap = useCallback(async () => {
        if (status === 'loading') return

        setState(prev => ({ ...prev, isLoading: true, error: null }))

        try {
            // If authenticated via NextAuth, sync JWT
            if (status === 'authenticated') {
                const session = await fetch('/api/auth/session').then(r => r.json())
                await syncAuthState(session)
            } else {
                await syncAuthState(null)
            }

            // Call NestJS bootstrap endpoint
            const data = await apiClient.get<any>('/bootstrap')

            if (!data.authenticated) {
                setState(prev => ({
                    ...prev,
                    isBootstrapped: true,
                    isLoading: false,
                    authenticated: false
                }))
                return
            }

            // AGGRESSIVE PRE-WARMING: Trigger compilation of all pages FIRST
            // This ensures pages are ready before the loading screen disappears
            const routes = [
                '/calendar',
                '/timeline',
                '/trends',
                '/health',
                '/coach',
                '/settings',
                '/weight'
            ]

            // Pre-warm: fetch each route to trigger Next.js compilation
            console.log('[Bootstrap] Starting page pre-warming...')
            const prewarmPromises = routes.map(route =>
                fetch(route, {
                    method: 'HEAD',
                    cache: 'no-store'
                }).catch(() => { }) // Ignore errors
            )

            // Also use router.prefetch for navigation cache
            routes.forEach(route => {
                router.prefetch(route)
            })

            // BACKGROUND DATA PREFETCH: Load API data for all major pages
            // This makes page data available instantly when navigating
            const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
            const apiPrefetches = [
                { key: 'calendar_month', url: `/calendar/month?month=${currentMonth}` },
                { key: 'coach_messages', url: '/coach/messages' },
                { key: 'health_weekly', url: '/health/weekly' },
                { key: 'trends_30d', url: '/trends?range=30d' },
                { key: 'weight_history', url: '/weight/history' },
            ]

            // Start API prefetches
            const apiPrefetchPromises = apiPrefetches.map(({ key, url }) =>
                apiClient.get(url)
                    .then(apiData => {
                        if (apiData) {
                            globalDataCache.set(key, {
                                data: apiData,
                                timestamp: Date.now()
                            })
                            console.log(`[Prefetch] ${key} cached`)
                        }
                    })
                    .catch(() => { }) // Ignore errors
            )

            // WAIT for page pre-warming before showing the app
            // This ensures instant navigation after loading screen
            await Promise.all(prewarmPromises)
            console.log('[Bootstrap] All pages pre-warmed')

            // Also wait for critical API prefetches (with timeout)
            await Promise.race([
                Promise.all(apiPrefetchPromises),
                new Promise(resolve => setTimeout(resolve, 3000)) // Max 3 second wait
            ])
            console.log('[Bootstrap] API prefetches complete')

            // NOW hydrate state - this triggers LaunchScreen to fade out
            setState({
                isBootstrapped: true,
                isLoading: false,
                error: null,
                authenticated: true,
                profile: data.profile,
                goals: data.goals || defaultGoals,
                today: data.today,
                weight: data.weight,
                coachUnread: data.coach?.unread || false,
                calendar: data.calendar || { month: '', days: [] },
                habits: data.habits || { streak: 0, daysWithMeals: 0 }
            })

        } catch (error) {
            console.error('Bootstrap error:', error)
            setState(prev => ({
                ...prev,
                isBootstrapped: true,
                isLoading: false,
                error: 'Failed to load app data'
            }))
        }
    }, [status, router])

    // Run bootstrap once when session is ready
    useEffect(() => {
        if (status !== 'loading' && !bootstrapAttempted.current) {
            bootstrapAttempted.current = true
            bootstrap()
        }
    }, [status, bootstrap])

    // Actions for updating state
    const refresh = useCallback(async () => {
        bootstrapAttempted.current = false
        await bootstrap()
    }, [bootstrap])

    const updateToday = useCallback((partial: Partial<TodaySummary>) => {
        setState(prev => ({
            ...prev,
            today: prev.today ? { ...prev.today, ...partial } : null
        }))
    }, [])

    const setCoachUnread = useCallback((unread: boolean) => {
        setState(prev => ({ ...prev, coachUnread: unread }))
    }, [])

    const contextValue: AppContextType = {
        ...state,
        refresh,
        updateToday,
        setCoachUnread
    }

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    )
}

// ============================================================================
// HOOK
// ============================================================================

export function useApp() {
    const context = useContext(AppContext)
    if (!context) {
        throw new Error('useApp must be used within AppBootstrapProvider')
    }
    return context
}

// Convenience hooks
export function useAppProfile() {
    const { profile, goals } = useApp()
    return { profile, goals }
}

export function useAppToday() {
    const { today, goals, updateToday } = useApp()
    return { today, goals, updateToday }
}

export function useAppCoach() {
    const { coachUnread, setCoachUnread } = useApp()
    return { coachUnread, setCoachUnread }
}
