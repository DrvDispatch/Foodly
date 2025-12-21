'use client'

import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, CalendarDays, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarHeaderProps {
    currentMonth: Date
    onPrev: () => void
    onNext: () => void
    stats?: {
        activeDays: number
        totalDays: number
        missedDays: number
        currentStreak: number
        consistentWeeks: number
    }
    isLoading?: boolean
}

export function CalendarHeader({ currentMonth, onPrev, onNext, stats, isLoading }: CalendarHeaderProps) {
    const streak = stats?.currentStreak || 0
    const activeDays = stats?.activeDays || 0
    const totalDays = stats?.totalDays || 30
    const missedDays = stats?.missedDays || 0

    return (
        <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onPrev}
                    className="p-2 -ml-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <h2 className="text-heading font-bold text-surface-900">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>

                <button
                    onClick={onNext}
                    className="p-2 -mr-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-full transition-colors"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Stats Row - Premium Cards */}
            <div className={cn(
                "grid grid-cols-3 gap-2 transition-opacity duration-300",
                isLoading && "opacity-50"
            )}>
                {/* Streak Card */}
                <div className={cn(
                    "relative overflow-hidden rounded-xl p-3 text-center",
                    streak > 0
                        ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white"
                        : "bg-gradient-to-br from-surface-100 to-surface-200 text-surface-500"
                )}>
                    {streak > 0 && (
                        <div className="absolute inset-0 bg-[url('/flame-pattern.svg')] opacity-10" />
                    )}
                    <div className="relative">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Flame className={cn(
                                "w-4 h-4",
                                streak > 0 ? "text-white" : "text-surface-400"
                            )} />
                            <span className="text-xl font-bold">{streak}</span>
                        </div>
                        <p className={cn(
                            "text-[10px] uppercase tracking-wide",
                            streak > 0 ? "text-orange-100" : "text-surface-400"
                        )}>
                            Day Streak
                        </p>
                    </div>
                </div>

                {/* Active Days Card */}
                <div className="relative overflow-hidden rounded-xl p-3 text-center bg-gradient-to-br from-primary-400 to-primary-600 text-white">
                    <div className="relative">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                            <CalendarDays className="w-4 h-4" />
                            <span className="text-xl font-bold">{activeDays}</span>
                            <span className="text-xs font-normal text-primary-200">/{totalDays}</span>
                        </div>
                        <p className="text-[10px] uppercase tracking-wide text-primary-100">
                            Active Days
                        </p>
                    </div>
                </div>

                {/* Missed Days Card */}
                <div className={cn(
                    "relative overflow-hidden rounded-xl p-3 text-center",
                    missedDays > 5
                        ? "bg-gradient-to-br from-red-400 to-rose-500 text-white"
                        : "bg-gradient-to-br from-surface-100 to-surface-200 text-surface-600"
                )}>
                    <div className="relative">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                            <XCircle className={cn(
                                "w-4 h-4",
                                missedDays > 5 ? "text-white" : "text-surface-400"
                            )} />
                            <span className="text-xl font-bold">{missedDays}</span>
                        </div>
                        <p className={cn(
                            "text-[10px] uppercase tracking-wide",
                            missedDays > 5 ? "text-red-100" : "text-surface-400"
                        )}>
                            Missed
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

