'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

import { BottomNav } from '@/components/bottom-nav'
import { AccountCard } from '@/components/profile/AccountCard'
import { IdentityCard } from '@/components/profile/IdentityCard'
import { BodyActivitySection } from '@/components/profile/BodyActivitySection'
import { DietarySection } from '@/components/profile/DietarySection'
import { AITransparencySection } from '@/components/profile/AITransparencySection'
import { ThemeSection } from '@/components/profile/ThemeSection'
import { DataControlSection } from '@/components/profile/DataControlSection'
import { SettingsPageSkeleton } from '@/components/ui/skeletons'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
    const router = useRouter()
    const { profile, isLoading, error, updateProfile, refresh } = useProfile()

    const handleUpdate = async (field: string, value: any) => {
        await updateProfile({ [field]: value })
    }

    return (
        <div className="min-h-screen pb-24 bg-surface-50 dark:bg-surface-900">
            {/* Header */}
            <header className="px-5 pt-6 pb-4 bg-surface-50 dark:bg-surface-900 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <h1 className="text-title text-surface-900">Settings</h1>
                    <button
                        onClick={() => refresh()}
                        disabled={isLoading}
                        className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-4 space-y-4">
                {/* Loading Skeleton */}
                {isLoading && !profile && <SettingsPageSkeleton />}

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
                        {/* Section: Account */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide px-1">Account</p>
                            <AccountCard
                                profile={profile}
                                onEdit={() => router.push('/settings/profile')}
                            />
                        </div>

                        {/* Section: Nutrition Identity */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide px-1">Nutrition Identity</p>
                            <IdentityCard
                                profile={profile}
                                onEdit={() => router.push('/settings/goals')}
                            />
                        </div>

                        {/* Body & Activity - Collapsible */}
                        <BodyActivitySection
                            profile={profile}
                            onUpdate={handleUpdate}
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

                        {/* Log Out Button - Prominent at bottom */}
                        <button
                            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                            className="w-full mt-4 p-4 bg-white dark:bg-surface-800 rounded-2xl shadow-sm flex items-center justify-center gap-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Log Out</span>
                        </button>

                        {/* Legal Links */}
                        <div className="flex items-center justify-center gap-4 text-sm text-surface-400 mt-6">
                            <a href="/privacy" className="hover:text-surface-600 transition-colors">
                                Privacy Policy
                            </a>
                            <span>•</span>
                            <a href="/terms" className="hover:text-surface-600 transition-colors">
                                Terms of Service
                            </a>
                        </div>
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    )
}


