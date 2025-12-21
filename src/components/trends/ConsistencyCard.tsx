'use client'

import { cn } from '@/lib/utils'
import { Activity, TrendingUp, TrendingDown, Minus, Calendar, Zap } from 'lucide-react'
import type { MetricType } from './MetricTabs'

interface TrendStats {
    mean: number
    stdDev: number
    consistencyScore: number
    trend: 'up' | 'down' | 'stable'
}

interface ConsistencyCardProps {
    stats: {
        calories: TrendStats
        protein: TrendStats
        carbs: TrendStats
        fat: TrendStats
    }
    goals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
}

// Get consistency label and color
function getConsistencyInfo(score: number) {
    if (score >= 80) return { label: 'Stable', color: 'text-green-600', bg: 'bg-green-50', icon: '🎯' }
    if (score >= 50) return { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', icon: '📊' }
    return { label: 'Volatile', color: 'text-red-500', bg: 'bg-red-50', icon: '📈' }
}

// Get trend icon
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-green-500" />
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
    return <Minus className="w-3.5 h-3.5 text-surface-400" />
}

export function ConsistencyCard({ stats, goals }: ConsistencyCardProps) {
    // Calculate weekend vs weekday divergence (simplified - just show calories consistency)
    const calorieConsistency = getConsistencyInfo(stats.calories.consistencyScore)
    const proteinConsistency = getConsistencyInfo(stats.protein.consistencyScore)

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-surface-900">How steady you&apos;ve been</h3>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 divide-x divide-surface-100">
                {/* Calorie Consistency */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-surface-500">Calories</p>
                        <TrendIcon trend={stats.calories.trend} />
                    </div>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                        calorieConsistency.bg, calorieConsistency.color
                    )}>
                        <span>{calorieConsistency.icon}</span>
                        <span>{calorieConsistency.label}</span>
                    </div>
                    <p className="text-[10px] text-surface-400 mt-2">
                        Varies by ±{stats.calories.stdDev} kcal
                    </p>
                </div>

                {/* Protein Consistency */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-surface-500">Protein</p>
                        <TrendIcon trend={stats.protein.trend} />
                    </div>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                        proteinConsistency.bg, proteinConsistency.color
                    )}>
                        <span>{proteinConsistency.icon}</span>
                        <span>{proteinConsistency.label}</span>
                    </div>
                    <p className="text-[10px] text-surface-400 mt-2">
                        Varies by ±{stats.protein.stdDev}g
                    </p>
                </div>
            </div>

            {/* Overall Score */}
            <div className="px-4 py-3 bg-surface-50 border-t border-surface-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-surface-600">Overall Stability</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Progress bar */}
                        <div className="w-20 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    stats.calories.consistencyScore >= 80 ? "bg-green-500" :
                                        stats.calories.consistencyScore >= 50 ? "bg-amber-500" : "bg-red-400"
                                )}
                                style={{ width: `${stats.calories.consistencyScore}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-surface-700">
                            {stats.calories.consistencyScore}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
