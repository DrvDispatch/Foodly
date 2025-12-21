'use client'

import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
    selectedDate: Date
    onDateChange: (date: Date) => void
}

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const todayRef = useRef<HTMLButtonElement>(null)

    // Generate dates: 30 days back + 7 days forward
    const dates = generateDateRange(-30, 7)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Scroll to selected date on mount
    useEffect(() => {
        if (todayRef.current && scrollRef.current) {
            const container = scrollRef.current
            const button = todayRef.current
            const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2
            container.scrollTo({ left: scrollLeft, behavior: 'auto' })
        }
    }, [])

    const scrollByAmount = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = direction === 'left' ? -200 : 200
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
        }
    }

    const isToday = (date: Date) => {
        return date.toDateString() === today.toDateString()
    }

    const isSelected = (date: Date) => {
        return date.toDateString() === selectedDate.toDateString()
    }

    const formatDay = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short' })
    }

    const formatDayNumber = (date: Date) => {
        return date.getDate()
    }

    return (
        <div className="relative">
            {/* Left Arrow */}
            <button
                onClick={() => scrollByAmount('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center text-surface-600 hover:bg-white"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Scrollable Dates */}
            <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-10 py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {dates.map((date, index) => {
                    const selected = isSelected(date)
                    const todayDate = isToday(date)

                    return (
                        <button
                            key={index}
                            ref={todayDate ? todayRef : null}
                            onClick={() => onDateChange(date)}
                            className={cn(
                                "flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all",
                                selected
                                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                                    : todayDate
                                        ? "bg-primary-50 text-primary-600 border-2 border-primary-200"
                                        : "bg-surface-50 text-surface-600 hover:bg-surface-100"
                            )}
                        >
                            <span className={cn(
                                "text-micro font-medium uppercase",
                                selected ? "text-white/80" : "text-surface-400"
                            )}>
                                {todayDate ? 'Today' : formatDay(date)}
                            </span>
                            <span className={cn(
                                "text-lg font-bold",
                                selected ? "text-white" : ""
                            )}>
                                {formatDayNumber(date)}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Right Arrow */}
            <button
                onClick={() => scrollByAmount('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center text-surface-600 hover:bg-white"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    )
}

function generateDateRange(daysBack: number, daysForward: number): Date[] {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = daysBack; i <= daysForward; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        dates.push(date)
    }

    return dates
}
