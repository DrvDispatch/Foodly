'use client'

import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { DayCell } from './DayCell'
import { getDayKey } from '@/lib/calendar'

interface CalendarGridProps {
    currentMonth: Date
    days: Record<string, any>
    contexts: Record<string, any>
    patternHighlight: Record<string, string>
    onDayClick: (dayKey: string) => void
    selectedDayKey: string | null
}

export function CalendarGrid({
    currentMonth,
    days,
    contexts,
    patternHighlight,
    onDayClick,
    selectedDayKey
}: CalendarGridProps) {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Calculate padding days for start of month (0 = Sunday, 1 = Monday, etc.)
    // Let's assume week starts on Monday for standard feel, OR Sunday?
    // User didn't specify, but most modern apps use user locale or Mon/Sun.
    // Date-fns `getDay` returns 0 for Sunday.
    // Let's stick to standard Sunday start for simplicity unless requested otherwise.
    const startDay = getDay(monthStart)

    return (
        <div className="bg-white rounded-2xl p-1 shadow-sm">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-micro text-surface-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                {/* Empty padding cells */}
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {calendarDays.map((date) => {
                    // Use consistent dayKey generation
                    const dayKey = format(date, 'yyyy-MM-dd')
                    const dayData = days[dayKey]
                    const context = contexts[dayKey]
                    const highlight = patternHighlight[dayKey]
                    const isFuture = date > new Date()

                    return (
                        <DayCell
                            key={dayKey}
                            date={date}
                            dayStatus={dayData?.dayStatus}
                            goalScore={dayData?.goalScore}
                            contextIcon={context?.dominant}
                            patternHighlight={highlight}
                            isToday={isToday(date)}
                            isSelected={dayKey === selectedDayKey}
                            isFuture={isFuture}
                            onClick={() => onDayClick(dayKey)}
                        />
                    )
                })}
            </div>
        </div>
    )
}
