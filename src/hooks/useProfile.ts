import useSWR from 'swr'
import { apiClient, apiFetcher } from '@/lib/api-client'

interface ProfileData {
    id?: string
    // Identity
    goalType: string
    secondaryFocus?: string[]
    // Targets
    targetCal?: number
    proteinTarget?: number
    carbTarget?: number
    fatTarget?: number
    maintenanceCal?: number
    // Body
    sex?: string
    age?: number
    birthDate?: string
    heightCm?: number
    currentWeight?: number
    targetWeight?: number
    // Activity
    activityLevel?: string
    weeklyPace?: number
    // Preferences
    unitSystem?: string
    dietaryPrefs?: string[]
    allergies?: string[]
    // Meta
    onboarded?: boolean
    timezone?: string
}

const fetcher = async (url: string) => {
    const data = await apiFetcher<any>(url)

    // Parse JSON fields if they're strings
    const safeJsonParse = (val: any) => {
        if (Array.isArray(val)) return val
        if (typeof val === 'string') {
            try { return JSON.parse(val) } catch { return [] }
        }
        return []
    }

    return {
        ...data,
        secondaryFocus: safeJsonParse(data.secondaryFocus),
        dietaryPrefs: safeJsonParse(data.dietaryPrefs),
        allergies: safeJsonParse(data.allergies)
    }
}

export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR<ProfileData>(
        '/profile',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000
        }
    )

    const updateProfile = async (updates: Partial<ProfileData>) => {
        try {
            await apiClient.post('/profile', updates)
            mutate() // Refresh data
            return true
        } catch {
            return false
        }
    }

    return {
        profile: data,
        isLoading,
        error,
        updateProfile,
        refresh: mutate
    }
}
