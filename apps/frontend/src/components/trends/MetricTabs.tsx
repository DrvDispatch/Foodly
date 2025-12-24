'use client'

import { cn } from '@/lib/utils'

export type MetricType = 'calories' | 'protein' | 'carbs' | 'fat'

interface MetricTabsProps {
    selected: MetricType
    onChange: (metric: MetricType) => void
}

const METRICS: { value: MetricType; label: string; emoji: string; color: string; activeColor: string }[] = [
    { value: 'calories', label: 'Calories', emoji: '🔥', color: 'text-orange-500', activeColor: 'bg-gradient-to-r from-orange-500 to-amber-500' },
    { value: 'protein', label: 'Protein', emoji: '🥩', color: 'text-blue-500', activeColor: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { value: 'carbs', label: 'Carbs', emoji: '🍞', color: 'text-amber-500', activeColor: 'bg-gradient-to-r from-amber-500 to-yellow-500' },
    { value: 'fat', label: 'Fat', emoji: '🥑', color: 'text-pink-500', activeColor: 'bg-gradient-to-r from-pink-500 to-rose-500' },
]

export function MetricTabs({ selected, onChange }: MetricTabsProps) {
    return (
        <div className="flex gap-2">
            {METRICS.map((metric) => (
                <button
                    key={metric.value}
                    onClick={() => onChange(metric.value)}
                    className={cn(
                        "flex-1 py-2.5 px-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
                        selected === metric.value
                            ? `${metric.activeColor} text-white shadow-lg`
                            : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                    )}
                >
                    <span>{metric.emoji}</span>
                    <span>{metric.label}</span>
                </button>
            ))}
        </div>
    )
}
