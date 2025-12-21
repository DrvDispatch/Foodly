'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

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
            const res = await fetch('/api/bootstrap')

            if (!res.ok) {
                throw new Error('Bootstrap failed')
            }

            const data = await res.json()

            if (!data.authenticated) {
                setState(prev => ({
                    ...prev,
                    isBootstrapped: true,
                    isLoading: false,
                    authenticated: false
                }))
                return
            }

            // Hydrate state from bootstrap data
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

            // AGGRESSIVE PRE-WARMING: Trigger compilation of all pages
            // This makes dev experience much faster
            const routes = [
                '/calendar',
                '/timeline',
                '/trends',
                '/habits',
                '/health',
                '/coach',
                '/settings'
            ]

            // Pre-warm: fetch each route to trigger Next.js compilation
            // This runs in parallel and doesn't block the UI
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
                { key: 'calendar_month', url: `/api/calendar/month?month=${currentMonth}` },
                { key: 'coach_messages', url: '/api/coach/messages' },
                { key: 'habits_summary', url: '/api/habits/summary' },
                { key: 'health_weekly', url: '/api/health/weekly' },
                { key: 'trends_history', url: '/api/weight/history' },
            ]

            apiPrefetches.forEach(({ key, url }) => {
                fetch(url)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data) {
                            // Store in global cache for pages to read
                            globalDataCache.set(key, {
                                data,
                                timestamp: Date.now()
                            })
                            console.log(`[Prefetch] ${key} cached`)
                        }
                    })
                    .catch(() => { }) // Ignore errors
            })

            // Wait for pre-warming (but don't block the app)
            Promise.all(prewarmPromises).then(() => {
                console.log('[Bootstrap] All pages pre-warmed')
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
