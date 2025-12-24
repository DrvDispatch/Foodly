'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'

export interface UserProfile {
    // Basic info
    name?: string | null
    email?: string | null
    image?: string | null

    // Physical stats
    sex?: string | null
    birthDate?: string | null
    age?: number | null
    heightCm?: number | null
    currentWeight?: number | null
    startingWeight?: number | null
    targetWeight?: number | null

    // Goals
    goalType?: string | null
    secondaryFocus?: string | null
    activityLevel?: string | null
    weeklyPace?: number | null

    // Targets
    maintenanceCal?: number | null
    targetCal?: number | null
    proteinTarget?: number | null
    carbTarget?: number | null
    fatTarget?: number | null

    // Preferences
    unitSystem?: string
    timezone?: string
    dietaryPrefs?: string | null
    allergies?: string | null

    // Status
    onboarded?: boolean
}

interface ProfileContextType {
    profile: UserProfile | null
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    isLoading: true,
    error: null,
    refetch: async () => { },
})

export function ProfileProvider({ children }: { children: ReactNode }) {
    const { status } = useSession()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchProfile = useCallback(async () => {
        if (status !== 'authenticated') {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const data = await apiClient.get<UserProfile>('/profile')
            setProfile(data)
            setError(null)
        } catch (err) {
            console.error('Failed to fetch profile:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch profile'))
        } finally {
            setIsLoading(false)
        }
    }, [status])

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProfile()
        } else if (status === 'unauthenticated') {
            setProfile(null)
            setIsLoading(false)
        }
    }, [status, fetchProfile])

    return (
        <ProfileContext.Provider value={{ profile, isLoading, error, refetch: fetchProfile }}>
            {children}
        </ProfileContext.Provider>
    )
}

export function useProfile() {
    const context = useContext(ProfileContext)
    if (!context) {
        throw new Error('useProfile must be used within a ProfileProvider')
    }
    return context
}

// Derived helpers for common use cases
export function useNutritionTargets() {
    const { profile, isLoading } = useProfile()
    return {
        isLoading,
        targetCal: profile?.targetCal ?? 2000,
        proteinTarget: profile?.proteinTarget ?? 150,
        carbTarget: profile?.carbTarget ?? 200,
        fatTarget: profile?.fatTarget ?? 65,
    }
}

export function useGoalContext() {
    const { profile, isLoading } = useProfile()
    return {
        isLoading,
        goalType: profile?.goalType ?? 'maintenance',
        secondaryFocus: profile?.secondaryFocus,
        activityLevel: profile?.activityLevel ?? 'moderate',
    }
}
