'use client'

import { cn } from '@/lib/utils'

export type MetricType = 'calories' | 'protein' | 'carbs' | 'fat' | 'weight'

interface MetricTabsProps {
    selected: MetricType
    onChange: (metric: MetricType) => void
}

const METRICS: { value: MetricType; label: string; color: string; activeColor: string }[] = [
    { value: 'calories', label: 'Calories', color: 'text-orange-500', activeColor: 'bg-gradient-to-r from-orange-500 to-amber-500' },
    { value: 'protein', label: 'Protein', color: 'text-blue-500', activeColor: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { value: 'carbs', label: 'Carbs', color: 'text-amber-500', activeColor: 'bg-gradient-to-r from-amber-500 to-yellow-500' },
    { value: 'fat', label: 'Fat', color: 'text-pink-500', activeColor: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { value: 'weight', label: 'Weight', color: 'text-purple-500', activeColor: 'bg-gradient-to-r from-purple-500 to-violet-500' },
]

export function MetricTabs({ selected, onChange }: MetricTabsProps) {
    return (
        <div className="flex gap-2">
            {METRICS.map((metric) => (
                <button
                    key={metric.value}
                    onClick={() => onChange(metric.value)}
                    className={cn(
                        "flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all",
                        selected === metric.value
                            ? `${metric.activeColor} text-white shadow-lg`
                            : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                    )}
                >
                    {metric.label}
                </button>
            ))}
        </div>
    )
}
