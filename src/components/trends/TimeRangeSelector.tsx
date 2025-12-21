'use client'

import { cn } from '@/lib/utils'

export type TimeRange = '7d' | '30d' | '90d' | '180d'

interface TimeRangeSelectorProps {
    selected: TimeRange
    onChange: (range: TimeRange) => void
}

const RANGES: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '180d', label: '6 Months' },
]

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
    return (
        <div className="flex bg-surface-100 p-1 rounded-xl">
            {RANGES.map((range) => (
                <button
                    key={range.value}
                    onClick={() => onChange(range.value)}
                    className={cn(
                        "flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                        selected === range.value
                            ? "bg-white text-surface-900 shadow-sm"
                            : "text-surface-500 hover:text-surface-700"
                    )}
                >
                    {range.label}
                </button>
            ))}
        </div>
    )
}
