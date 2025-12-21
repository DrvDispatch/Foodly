'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface DayCellProps {
    date: Date
    dayStatus?: 'on_track' | 'off_target' | 'far_off' | 'no_data'
    goalScore?: number // 0-100 score for gradient colors
    contextIcon?: string
    patternHighlight?: string
    isToday: boolean
    isSelected?: boolean
    isFuture?: boolean
    onClick: () => void
}

const CONTEXT_ICONS: Record<string, string> = {
    travel: '✈️',
    training: '🏋️',
    social: '🎉',
    rest: '🌙',
    low_intake: '📉',
    unusual: '⏰',
    other: '📝'
}

// Get gradient color based on goal score (0-100)
// Gray = untracked, Orange = poor, Yellow = okay, Green = excellent
function getScoreGradient(score: number): string {
    if (score >= 85) {
        // Excellent - Vibrant Green
        return 'bg-gradient-to-br from-emerald-200 to-green-300 ring-1 ring-emerald-400'
    } else if (score >= 70) {
        // Good - Light Green
        return 'bg-gradient-to-br from-green-100 to-emerald-200 ring-1 ring-green-300'
    } else if (score >= 55) {
        // Okay - Yellow/Lime (transitioning)
        return 'bg-gradient-to-br from-lime-100 to-green-100 ring-1 ring-lime-300'
    } else if (score >= 40) {
        // Below target - Amber
        return 'bg-gradient-to-br from-amber-100 to-yellow-100 ring-1 ring-amber-300'
    } else if (score >= 20) {
        // Poor - Orange
        return 'bg-gradient-to-br from-orange-100 to-amber-100 ring-1 ring-orange-300'
    } else {
        // Very poor - Deep Orange/Red-ish
        return 'bg-gradient-to-br from-orange-200 to-orange-300 ring-1 ring-orange-400'
    }
}

// Pattern highlight colors (when AI filter is active)
const PATTERN_COLORS: Record<string, string> = {
    training: 'bg-gradient-to-br from-purple-100 to-violet-200 ring-2 ring-purple-400',
    low_protein: 'bg-gradient-to-br from-blue-100 to-blue-200 ring-2 ring-blue-300',
    high_carb: 'bg-gradient-to-br from-orange-100 to-orange-200 ring-2 ring-orange-300',
    on_track: 'bg-gradient-to-br from-green-100 to-green-200 ring-2 ring-green-300',
    over_target: 'bg-gradient-to-br from-red-100 to-red-200 ring-2 ring-red-300',
    missed_logging: 'bg-surface-200',
}

export function DayCell({
    date,
    dayStatus = 'no_data',
    goalScore,
    contextIcon,
    patternHighlight,
    isToday,
    isSelected,
    isFuture,
    onClick
}: DayCellProps) {

    // Determine background color
    // Priority: Pattern Highlight > Goal Score Gradient > Gray (untracked)
    const getBgClass = () => {
        if (patternHighlight) {
            return PATTERN_COLORS[patternHighlight] || PATTERN_COLORS.training
        }

        if (isFuture) {
            return 'bg-surface-50/30'
        }

        // Default view: gradient based on goal score
        if (goalScore !== undefined && goalScore > 0) {
            return getScoreGradient(goalScore)
        }

        // No data / untracked = gray
        return 'bg-surface-100'
    }

    const isTracked = goalScore !== undefined && goalScore > 0

    return (
        <button
            onClick={onClick}
            disabled={isFuture}
            className={cn(
                "relative aspect-square flex flex-col items-center justify-start pt-2 rounded-xl transition-all duration-200",
                "hover:scale-105 hover:shadow-md active:scale-95",
                getBgClass(),
                isSelected && "ring-2 ring-primary-600 shadow-lg z-10",
                isToday && !patternHighlight && !isSelected && "ring-2 ring-primary-500 font-bold shadow-md",
                isFuture && "opacity-30 cursor-default hover:shadow-none hover:scale-100"
            )}
        >
            <span className={cn(
                "text-sm leading-none font-medium",
                isToday ? "text-primary-600 font-bold" : "text-surface-700"
            )}>
                {format(date, 'd')}
            </span>

            {/* Content Container (Icon OR Score indicator) */}
            <div className="flex-1 flex items-center justify-center pb-1">
                {contextIcon ? (
                    <span className="text-sm leading-none select-none drop-shadow-sm">
                        {CONTEXT_ICONS[contextIcon] || '•'}
                    </span>
                ) : patternHighlight ? (
                    null // Color is the indicator when filter is active
                ) : !isFuture && isTracked && goalScore !== undefined ? (
                    // Score indicator dot - size based on score
                    <div className={cn(
                        "rounded-full transition-all",
                        goalScore >= 70 ? "w-3 h-3 bg-green-500/60" :
                            goalScore >= 40 ? "w-2.5 h-2.5 bg-amber-500/60" :
                                "w-2 h-2 bg-orange-500/60"
                    )} />
                ) : !isFuture ? (
                    // Untracked = small gray dot
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-400" />
                ) : null}
            </div>
        </button>
    )
}


