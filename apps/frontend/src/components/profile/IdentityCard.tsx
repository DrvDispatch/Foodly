'use client'

import { cn } from '@/lib/utils'
import { Target, Flame, ChevronRight, Dumbbell, Heart, Scale, Zap } from 'lucide-react'

interface IdentityCardProps {
    profile: {
        goalType: string
        secondaryFocus?: string[]
        targetCal?: number
        proteinTarget?: number
        carbTarget?: number
        fatTarget?: number
        activityLevel?: string
        dietaryPrefs?: string[]
    }
    onEdit?: () => void
}

// Goal type display mapping
const GOAL_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    fat_loss: { label: 'Fat Loss', icon: Flame, color: 'text-orange-600' },
    maintenance: { label: 'Maintenance', icon: Scale, color: 'text-blue-600' },
    muscle_gain: { label: 'Muscle Gain', icon: Dumbbell, color: 'text-purple-600' },
    strength: { label: 'Strength', icon: Zap, color: 'text-amber-600' },
    recomp: { label: 'Recomposition', icon: Target, color: 'text-green-600' },
    health: { label: 'General Health', icon: Heart, color: 'text-pink-600' }
}

const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Active',
    athlete: 'Very Active'
}

export function IdentityCard({ profile, onEdit }: IdentityCardProps) {
    const goalInfo = GOAL_LABELS[profile.goalType] || GOAL_LABELS.maintenance
    const GoalIcon = goalInfo.icon

    // Infer dietary pattern from preferences
    const inferDietaryPattern = () => {
        const prefs = profile.dietaryPrefs || []
        if (prefs.includes('vegan')) return 'Vegan'
        if (prefs.includes('vegetarian')) return 'Vegetarian'
        if (prefs.includes('pescatarian')) return 'Pescatarian'
        if (prefs.includes('keto')) return 'Keto'
        if (prefs.length > 0) return 'Custom'
        return null
    }

    const dietaryPattern = inferDietaryPattern()

    return (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-2xl p-4 border border-primary-200 dark:border-primary-800">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-xl bg-white dark:bg-surface-800 shadow-sm", goalInfo.color)}>
                        <GoalIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-primary-600 dark:text-primary-400 font-medium">Nutrition Identity</p>
                        <p className="text-sm font-semibold text-surface-900">{goalInfo.label}</p>
                    </div>
                </div>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-surface-800 rounded-full shadow-sm hover:shadow transition-all"
                    >
                        Edit
                        <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Secondary focuses */}
            {profile.secondaryFocus && profile.secondaryFocus.length > 0 && (
                <div className="mb-3">
                    <p className="text-[10px] text-primary-600 dark:text-primary-400 mb-1">Also focusing on</p>
                    <div className="flex flex-wrap gap-1">
                        {profile.secondaryFocus.map((focus, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-white/60 dark:bg-surface-800/60 text-surface-600 rounded-full">
                                {focus}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Targets & Activity Grid */}
            <div className="grid grid-cols-2 gap-2">
                {/* Targets */}
                <div className="bg-white dark:bg-surface-800 rounded-xl p-3 shadow-sm">
                    <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wide mb-1.5">Daily Targets</p>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-surface-500">Calories</span>
                            <span className="font-semibold text-surface-900">{profile.targetCal?.toLocaleString() || '—'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-surface-500">Protein</span>
                            <span className="font-semibold text-surface-900">{profile.proteinTarget ? `${profile.proteinTarget}g` : '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Activity & Pattern */}
                <div className="bg-white dark:bg-surface-800 rounded-xl p-3 shadow-sm">
                    <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wide mb-1.5">Lifestyle</p>
                    <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1 text-xs">
                            <span className="text-surface-500 shrink-0">Activity</span>
                            <span className="font-semibold text-surface-900 text-right text-[11px]">{ACTIVITY_LABELS[profile.activityLevel || 'moderate'] || 'Moderate'}</span>
                        </div>
                        {dietaryPattern && (
                            <div className="flex justify-between text-xs">
                                <span className="text-surface-500">Diet</span>
                                <span className="font-semibold text-surface-900">{dietaryPattern}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
