'use client'

import { useEffect, useState } from 'react'
import { Flame, TrendingUp, TrendingDown, Minus, Zap, Target, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface MomentumData {
    level: 'strong' | 'building' | 'steady' | 'starting'
    trend: 'up' | 'stable' | 'down'
    score: number
    streak: number
    weeklyChange: number
    building: string | null
    win: string | null
}

const LEVEL_CONFIG = {
    strong: {
        label: 'Strong',
        color: 'from-orange-500 to-red-500',
        textColor: 'text-orange-500',
        bgColor: 'bg-orange-50',
        ringColor: 'ring-orange-500',
        icon: Flame,
        description: 'Excellent momentum'
    },
    building: {
        label: 'Building',
        color: 'from-primary-500 to-emerald-500',
        textColor: 'text-primary-500',
        bgColor: 'bg-primary-50',
        ringColor: 'ring-primary-500',
        icon: TrendingUp,
        description: 'Growing stronger'
    },
    steady: {
        label: 'Steady',
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        ringColor: 'ring-blue-500',
        icon: Target,
        description: 'Holding pattern'
    },
    starting: {
        label: 'Starting',
        color: 'from-surface-400 to-surface-500',
        textColor: 'text-surface-500',
        bgColor: 'bg-surface-100',
        ringColor: 'ring-surface-400',
        icon: Zap,
        description: 'Building foundation'
    }
}

interface MomentumMeterProps {
    className?: string
    compact?: boolean
}

export function MomentumMeter({ className, compact = false }: MomentumMeterProps) {
    const { data, isLoading } = useSWR<MomentumData>('/api/momentum', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000 // Cache for 1 minute
    })

    if (isLoading || !data) {
        return (
            <div className={cn("animate-pulse", className)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-200" />
                    <div className="space-y-2">
                        <div className="w-20 h-4 bg-surface-200 rounded" />
                        <div className="w-16 h-3 bg-surface-100 rounded" />
                    </div>
                </div>
            </div>
        )
    }

    const config = LEVEL_CONFIG[data.level]
    const Icon = config.icon
    const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus

    if (compact) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    `bg-gradient-to-br ${config.color}`
                )}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className={cn("text-sm font-semibold", config.textColor)}>
                        {config.label}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("", className)}>
            {/* Main Momentum Display */}
            <div className="flex items-center gap-4">
                {/* Animated Ring */}
                <div className="relative">
                    <div className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center",
                        "bg-gradient-to-br shadow-lg",
                        config.color
                    )}>
                        <Icon className="w-7 h-7 text-white" />
                    </div>
                    {/* Pulse animation for strong momentum */}
                    {data.level === 'strong' && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-red-500 animate-ping opacity-30" />
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold", config.textColor)}>
                            Momentum: {config.label}
                        </span>
                        <TrendIcon className={cn(
                            "w-4 h-4",
                            data.trend === 'up' && "text-green-500",
                            data.trend === 'down' && "text-amber-500",
                            data.trend === 'stable' && "text-surface-400"
                        )} />
                    </div>

                    {/* Progress bar */}
                    <div className="mt-1.5 w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", config.color)}
                            style={{ width: `${data.score}%` }}
                        />
                    </div>

                    {/* Trend indicator */}
                    {data.weeklyChange !== 0 && (
                        <p className="text-xs text-surface-500 mt-1">
                            {data.weeklyChange > 0 ? '↑' : '↓'} {Math.abs(data.weeklyChange)}% this week
                        </p>
                    )}
                </div>
            </div>

            {/* Building & Win Section */}
            <div className="mt-4 space-y-2">
                {/* What you're building */}
                {data.building && (
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl",
                        config.bgColor
                    )}>
                        <Sparkles className={cn("w-4 h-4", config.textColor)} />
                        <span className="text-sm">
                            <span className="text-surface-500">Today you&apos;re building:</span>{' '}
                            <span className={cn("font-medium", config.textColor)}>{data.building}</span>
                        </span>
                    </div>
                )}

                {/* Today's win */}
                {data.win && (
                    <p className="text-xs text-surface-500 px-3">
                        ✓ {data.win}
                    </p>
                )}
            </div>
        </div>
    )
}

/**
 * MomentumBadge - A minimal inline badge for showing momentum
 */
export function MomentumBadge({ className }: { className?: string }) {
    const { data } = useSWR<MomentumData>('/api/momentum', fetcher, {
        revalidateOnFocus: false
    })

    if (!data) return null

    const config = LEVEL_CONFIG[data.level]
    const Icon = config.icon

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            config.bgColor, config.textColor,
            className
        )}>
            <Icon className="w-3 h-3" />
            {config.label}
        </div>
    )
}
