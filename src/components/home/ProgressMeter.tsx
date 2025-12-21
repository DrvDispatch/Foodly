'use client'

import { Zap, Check, Circle, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface ProgressData {
    rank: string
    tier: 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'
    subLevel: number
    icon: string
    totalXP: number
    currentLevelXP: number
    nextLevelXP: number
    progressPercent: number
    todayWins: { id: string; label: string; completed: boolean; xp: number }[]
    todayMealCount: number
    statusMessage: string
    streak: number
    hasComeback: boolean
}

// Tier colors - subtle and premium
const TIER_CONFIG = {
    starter: {
        gradient: 'from-surface-400 to-surface-500',
        text: 'text-surface-600',
        bg: 'bg-surface-100',
        progressBg: 'bg-surface-300',
        accent: '#6b7280'
    },
    bronze: {
        gradient: 'from-amber-600 to-orange-700',
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        progressBg: 'bg-amber-500',
        accent: '#d97706'
    },
    silver: {
        gradient: 'from-slate-400 to-slate-500',
        text: 'text-slate-500',
        bg: 'bg-slate-50',
        progressBg: 'bg-slate-400',
        accent: '#64748b'
    },
    gold: {
        gradient: 'from-yellow-500 to-amber-500',
        text: 'text-yellow-600',
        bg: 'bg-yellow-50',
        progressBg: 'bg-yellow-500',
        accent: '#ca8a04'
    },
    platinum: {
        gradient: 'from-cyan-400 to-teal-500',
        text: 'text-teal-500',
        bg: 'bg-teal-50',
        progressBg: 'bg-teal-500',
        accent: '#14b8a6'
    }
}

interface ProgressMeterProps {
    className?: string
}

export function ProgressMeter({ className }: ProgressMeterProps) {
    const { data, isLoading } = useSWR<ProgressData>('/api/progress', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 30000
    })

    if (isLoading || !data) {
        return (
            <div className={cn("animate-pulse", className)}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-200" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 w-24 bg-surface-200 rounded" />
                        <div className="h-2 w-full bg-surface-100 rounded" />
                    </div>
                </div>
            </div>
        )
    }

    const config = TIER_CONFIG[data.tier]
    const completedWins = data.todayWins.filter(w => w.completed).length
    const totalWins = data.todayWins.length

    return (
        <div className={className}>
            {/* Main Status Row */}
            <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className={cn(
                    "relative w-12 h-12 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br shadow-sm",
                    config.gradient
                )}>
                    <span className="text-white text-xl font-bold">
                        {data.icon}
                    </span>
                    {/* Level indicator */}
                    {data.tier !== 'starter' && data.tier !== 'platinum' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-surface-100">
                            <span className="text-[10px] font-bold text-surface-700">
                                {data.subLevel}
                            </span>
                        </div>
                    )}
                </div>

                {/* Rank & Progress */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-lg", config.text)}>
                            {data.rank}
                        </span>
                        {data.streak > 0 && (
                            <span className="text-xs text-surface-400 flex items-center gap-0.5">
                                <Zap className="w-3 h-3" />
                                {data.streak}d
                            </span>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1.5 w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                config.progressBg
                            )}
                            style={{ width: `${data.progressPercent}%` }}
                        />
                    </div>

                    {/* Progress Text */}
                    <p className="text-xs text-surface-400 mt-1">
                        {data.progressPercent}% to next rank
                    </p>
                </div>
            </div>

            {/* Today's Wins */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">
                        Today's Progress
                    </span>
                    <span className="text-xs text-surface-400">
                        {completedWins}/{totalWins} wins
                    </span>
                </div>

                <div className="space-y-1.5">
                    {data.todayWins.map(win => (
                        <div
                            key={win.id}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                                win.completed ? config.bg : "bg-surface-50"
                            )}
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center",
                                win.completed
                                    ? `${config.progressBg} text-white`
                                    : "border-2 border-surface-200"
                            )}>
                                {win.completed ? (
                                    <Check className="w-3 h-3" />
                                ) : (
                                    <Circle className="w-2 h-2 text-surface-300" />
                                )}
                            </div>
                            <span className={cn(
                                "text-sm flex-1",
                                win.completed ? "text-surface-700" : "text-surface-400"
                            )}>
                                {win.label}
                            </span>
                            <span className={cn(
                                "text-xs font-medium",
                                win.completed ? config.text : "text-surface-300"
                            )}>
                                +{win.xp}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Comeback Bonus */}
                {data.hasComeback && (
                    <div className="mt-2 px-3 py-2 bg-primary-50 rounded-lg flex items-center gap-2">
                        <ChevronUp className="w-4 h-4 text-primary-500" />
                        <span className="text-sm text-primary-700">
                            Welcome back! +8 XP bonus
                        </span>
                    </div>
                )}
            </div>

            {/* Status Message */}
            <p className="text-xs text-surface-500 mt-3 text-center">
                {data.statusMessage}
            </p>
        </div>
    )
}

/**
 * ProgressBadge - Minimal inline badge for showing rank
 */
export function ProgressBadge({ className }: { className?: string }) {
    const { data } = useSWR<ProgressData>('/api/progress', fetcher, {
        revalidateOnFocus: false
    })

    if (!data) return null

    const config = TIER_CONFIG[data.tier]

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            config.bg, config.text,
            className
        )}>
            <span>{data.icon}</span>
            {data.rank}
        </div>
    )
}
