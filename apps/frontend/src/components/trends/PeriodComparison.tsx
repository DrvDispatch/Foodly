'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Minus, CalendarDays, TrendingUp, Loader2 } from 'lucide-react'
import { usePeriodComparison } from '@/hooks/usePeriodComparison'

type PresetType = '14d' | '30d'

interface PeriodComparisonProps {
    className?: string
}

// Delta indicator component
function DeltaIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
    // inverse: true means lower is better (e.g., variability)
    const isPositive = inverse ? value < 0 : value > 0
    const isNegative = inverse ? value > 0 : value < 0
    const isNeutral = value === 0

    if (isNeutral) {
        return (
            <span className="text-surface-400 text-xs flex items-center gap-0.5">
                <Minus className="w-3 h-3" />
                0%
            </span>
        )
    }

    return (
        <span className={cn(
            "text-xs flex items-center gap-0.5 font-medium",
            isPositive ? "text-green-600" : "text-red-500"
        )}>
            {value > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
            ) : (
                <ArrowDownRight className="w-3 h-3" />
            )}
            {value > 0 ? '+' : ''}{value}%
        </span>
    )
}

export function PeriodComparison({ className }: PeriodComparisonProps) {
    const [preset, setPreset] = useState<PresetType>('14d')
    const { data, isLoading, error } = usePeriodComparison(preset)

    return (
        <div className={cn("bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden", className)}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-surface-900">Period Comparison</h3>
                </div>

                {/* Preset Toggle */}
                <div className="flex bg-surface-100 p-0.5 rounded-lg">
                    <button
                        onClick={() => setPreset('14d')}
                        className={cn(
                            "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all",
                            preset === '14d'
                                ? "bg-white text-surface-900 shadow-sm"
                                : "text-surface-500"
                        )}
                    >
                        14 Days
                    </button>
                    <button
                        onClick={() => setPreset('30d')}
                        className={cn(
                            "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all",
                            preset === '30d'
                                ? "bg-white text-surface-900 shadow-sm"
                                : "text-surface-500"
                        )}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="p-8 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="p-4 text-center text-surface-400 text-sm">
                    Failed to load comparison
                </div>
            )}

            {/* Data */}
            {data && !isLoading && (
                <>
                    {/* Period Labels */}
                    <div className="grid grid-cols-3 px-4 py-2 bg-surface-50 text-[10px] font-medium text-surface-500">
                        <div></div>
                        <div className="text-center">
                            <span className="text-surface-700">Current</span>
                            <p className="text-[9px] text-surface-400">{data.period1.start} – {data.period1.end}</p>
                        </div>
                        <div className="text-center">
                            <span className="text-surface-700">Previous</span>
                            <p className="text-[9px] text-surface-400">{data.period2.start} – {data.period2.end}</p>
                        </div>
                    </div>

                    {/* Metrics Rows */}
                    <div className="divide-y divide-surface-100">
                        {/* Calories */}
                        <div className="grid grid-cols-3 px-4 py-3 items-center">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="text-xs text-surface-700">Avg Calories</span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-semibold text-surface-900">{data.period1.avgCalories.toLocaleString()}</span>
                                <DeltaIndicator value={data.deltas.calories} />
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-surface-500">{data.period2.avgCalories.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Protein */}
                        <div className="grid grid-cols-3 px-4 py-3 items-center">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs text-surface-700">Avg Protein</span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-semibold text-surface-900">{data.period1.avgProtein}g</span>
                                <DeltaIndicator value={data.deltas.protein} />
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-surface-500">{data.period2.avgProtein}g</span>
                            </div>
                        </div>

                        {/* Variability */}
                        <div className="grid grid-cols-3 px-4 py-3 items-center">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-3 h-3 text-surface-400" />
                                <span className="text-xs text-surface-700">Variability</span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-semibold text-surface-900">±{data.period1.calorieVariability}</span>
                                <DeltaIndicator value={data.deltas.variability} inverse />
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-surface-500">±{data.period2.calorieVariability}</span>
                            </div>
                        </div>

                        {/* Logged Days */}
                        <div className="grid grid-cols-3 px-4 py-3 items-center">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-3 h-3 text-surface-400" />
                                <span className="text-xs text-surface-700">Days Logged</span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-semibold text-surface-900">
                                    {data.period1.loggedDays}/{data.period1.totalDays}
                                </span>
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-surface-500">
                                    {data.period2.loggedDays}/{data.period2.totalDays}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
