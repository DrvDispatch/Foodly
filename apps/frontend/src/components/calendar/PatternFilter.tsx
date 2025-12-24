'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PATTERNS, PatternType } from '@/lib/calendar'

interface PatternFilterProps {
    selected: PatternType | null
    onSelect: (pattern: PatternType | null) => void
}

const patternOptions = [
    { id: PATTERNS.LOW_PROTEIN, label: 'Low Protein Days', color: 'bg-blue-100 text-blue-700' },
    { id: PATTERNS.HIGH_CARB, label: 'High Carb Days', color: 'bg-orange-100 text-orange-700' },
    { id: PATTERNS.ON_TRACK, label: 'On Track Days', color: 'bg-green-100 text-green-700' },
    { id: PATTERNS.MISSED_LOGGING, label: 'Skipped Logging', color: 'bg-surface-200 text-surface-600' },
    { id: PATTERNS.TRAINING, label: 'Training Days', color: 'bg-purple-100 text-purple-700' },
]

export function PatternFilter({ selected, onSelect }: PatternFilterProps) {
    return (
        <div className="p-3 bg-white border border-surface-200 rounded-xl shadow-lg relative z-30">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Highlight Logic</span>
                {selected && (
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-surface-400 hover:text-surface-900 flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>

            <div className="space-y-1">
                {patternOptions.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => onSelect(selected === option.id ? null : option.id as PatternType)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            selected === option.id
                                ? "bg-surface-100 text-surface-900"
                                : "text-surface-600 hover:bg-surface-50"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", option.color.replace('text-', 'bg-').split(' ')[0])} />
                            {option.label}
                        </div>
                        {selected === option.id && <Check className="w-4 h-4 text-primary-600" />}
                    </button>
                ))}
            </div>

            <p className="mt-2 text-[10px] text-center text-surface-400">
                Only one lens active at a time.
            </p>
        </div>
    )
}
