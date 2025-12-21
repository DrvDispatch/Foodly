'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, CheckCircle } from 'lucide-react'
import type { MetricType } from './MetricTabs'

interface TrendStats {
    mean: number
    stdDev: number
    consistencyScore: number
    trend: 'up' | 'down' | 'stable'
}

interface TrendStatsCardProps {
    metric: MetricType
    stats: TrendStats
    goal: number
}

const METRIC_LABELS: Record<MetricType, { label: string; unit: string }> = {
    calories: { label: 'Calories', unit: 'kcal' },
    protein: { label: 'Protein', unit: 'g' },
    carbs: { label: 'Carbs', unit: 'g' },
    fat: { label: 'Fat', unit: 'g' },
    weight: { label: 'Weight', unit: 'kg' }
}

export function TrendStatsCard({ metric, stats, goal }: TrendStatsCardProps) {
    const { label, unit } = METRIC_LABELS[metric]

    // Consistency level
    const consistencyLevel = stats.consistencyScore >= 80 ? 'Stable' :
        stats.consistencyScore >= 50 ? 'Moderate' : 'Volatile'

    const consistencyColor = stats.consistencyScore >= 80 ? 'text-green-600' :
        stats.consistencyScore >= 50 ? 'text-amber-600' : 'text-red-500'

    const consistencyIcon = stats.consistencyScore >= 80 ? <CheckCircle className="w-4 h-4" /> :
        stats.consistencyScore >= 50 ? <Shield className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />

    // Trend icon
    const TrendIcon = stats.trend === 'up' ? TrendingUp :
        stats.trend === 'down' ? TrendingDown : Minus

    const trendColor = stats.trend === 'up' ? 'text-green-600' :
        stats.trend === 'down' ? 'text-red-500' : 'text-surface-400'

    // Goal difference
    const diffFromGoal = stats.mean - goal
    const diffPct = Math.round((diffFromGoal / goal) * 100)
    const isOver = diffFromGoal > 0

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-4">
            <div className="grid grid-cols-3 gap-4">
                {/* Average */}
                <div>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1">Average</p>
                    <p className="text-xl font-bold text-surface-900">
                        {stats.mean.toLocaleString()}
                        <span className="text-xs font-normal text-surface-400 ml-1">{unit}</span>
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        isOver ? "text-amber-600" : "text-green-600"
                    )}>
                        {isOver ? '+' : ''}{diffPct}% vs goal
                    </p>
                </div>

                {/* Consistency */}
                <div>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1">Consistency</p>
                    <div className={cn("flex items-center gap-1.5", consistencyColor)}>
                        {consistencyIcon}
                        <span className="text-lg font-bold">{consistencyLevel}</span>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">
                        ±{stats.stdDev} {unit}
                    </p>
                </div>

                {/* Trend */}
                <div>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1">Trend</p>
                    <div className={cn("flex items-center gap-1.5", trendColor)}>
                        <TrendIcon className="w-5 h-5" />
                        <span className="text-lg font-bold capitalize">{stats.trend}</span>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">
                        {stats.trend === 'stable' ? 'Holding steady' :
                            stats.trend === 'up' ? 'Increasing' : 'Decreasing'}
                    </p>
                </div>
            </div>
        </div>
    )
}
