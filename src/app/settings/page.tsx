'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

import { BottomNav } from '@/components/bottom-nav'
import { IdentityCard } from '@/components/profile/IdentityCard'
import { BodyActivitySection } from '@/components/profile/BodyActivitySection'
import { WeightTrackingSection } from '@/components/profile/WeightTrackingSection'
import { DietarySection } from '@/components/profile/DietarySection'
import { AITransparencySection } from '@/components/profile/AITransparencySection'
import { ThemeSection } from '@/components/profile/ThemeSection'
import { DataControlSection } from '@/components/profile/DataControlSection'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
    const router = useRouter()
    const { profile, isLoading, error, updateProfile, refresh } = useProfile()

    const handleUpdate = async (field: string, value: any) => {
        await updateProfile({ [field]: value })
    }

    return (
        <div className="min-h-screen pb-24 bg-surface-50">
            {/* Header */}
            <header className="px-5 pt-6 pb-4 bg-surface-50 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <h1 className="text-title text-surface-900">Settings</h1>
                    <button
                        onClick={() => refresh()}
                        disabled={isLoading}
                        className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-full disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-4 space-y-4">
                {/* Loading */}
                {isLoading && !profile && (
                    <div className="space-y-4">
                        <div className="h-48 bg-surface-100 rounded-3xl animate-pulse" />
                        <div className="h-20 bg-surface-100 rounded-2xl animate-pulse" />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-8 text-center text-surface-500">
                        <p>Failed to load profile.</p>
                        <button onClick={() => refresh()} className="mt-2 text-primary-600 underline">
                            Retry
                        </button>
                    </div>
                )}

                {/* Profile Content */}
                {profile && (
                    <>
                        {/* Identity Card - Always visible, non-collapsible */}
                        <IdentityCard
                            profile={profile}
                            onEdit={() => router.push('/settings/edit')}
                        />

                        {/* Body & Activity - Collapsible */}
                        <BodyActivitySection
                            profile={profile}
                            onUpdate={handleUpdate}
                        />

                        {/* Weight Tracking - Collapsible */}
                        <WeightTrackingSection
                            onNavigateToTrends={() => router.push('/trends')}
                        />

                        {/* Dietary Preferences - Collapsible */}
                        <DietarySection
                            profile={profile}
                            onUpdate={handleUpdate}
                        />

                        {/* AI Settings - Collapsible */}
                        <AITransparencySection />

                        {/* Theme / Appearance */}
                        <ThemeSection />

                        {/* Data & Privacy - Collapsible */}
                        <DataControlSection />
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    )
}


