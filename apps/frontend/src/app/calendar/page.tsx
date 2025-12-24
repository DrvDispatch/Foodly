'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'

import { cn } from '@/lib/utils'
import { BottomNav } from '@/components/bottom-nav'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { DayDetailSheet } from '@/components/calendar/DayDetailSheet'
import { FilterSheet } from '@/components/calendar/FilterSheet'
import { CalendarLoader } from '@/components/calendar/CalendarLoader'
import { MonthSummary } from '@/components/calendar/MonthSummary'
import { useCalendarMonth } from '@/hooks/useCalendarMonth'

export default function CalendarPage() {
    const router = useRouter()
    const [currentMonth, setCurrentMonth] = useState(() => new Date())
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // AI Filter state
    const [aiMatchingDays, setAiMatchingDays] = useState<string[]>([])
    const [aiInterpretation, setAiInterpretation] = useState<string>('')

    // Derived state
    const monthKey = format(currentMonth, 'yyyy-MM')

    // Fetch data
    const { data, isLoading, error, refresh } = useCalendarMonth(monthKey, null)

    // Handlers
    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))

    const handleDayClick = (dayKey: string) => {
        setSelectedDayKey(dayKey)
    }

    // Handle AI filter results
    const handleAIFilterResult = (matchingDays: string[], interpretation: string) => {
        setAiMatchingDays(matchingDays)
        setAiInterpretation(interpretation)
    }

    // Clear AI filter when changing month
    useEffect(() => {
        setAiMatchingDays([])
        setAiInterpretation('')
    }, [monthKey])

    // Build pattern highlights from AI results
    const patternHighlight: Record<string, string> = {}
    if (aiMatchingDays.length > 0) {
        aiMatchingDays.forEach(dayKey => {
            patternHighlight[dayKey] = 'training' // Purple highlight for AI matches
        })
    }

    // Determine if filter is active
    const hasActiveFilter = aiMatchingDays.length > 0

    return (
        <div className="min-h-screen pb-24 bg-gradient-to-b from-white to-surface-50">
            {/* Header Area */}
            <header className="px-5 pt-6 pb-3 bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-title text-surface-900 flex items-center gap-2">
                        Calendar
                        <CalendarIcon className="w-5 h-5 text-surface-400" />
                    </h1>

                    {/* AI Filter Button */}
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-semibold transition-all",
                            hasActiveFilter
                                ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-md"
                                : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        {hasActiveFilter ? 'AI Filtered' : 'Ask AI'}
                    </button>
                </div>

                <CalendarHeader
                    currentMonth={currentMonth}
                    onPrev={handlePrevMonth}
                    onNext={handleNextMonth}
                    stats={data?.stats}
                    isLoading={isLoading}
                />
            </header>

            {/* Main Content */}
            <main className="px-4 py-4 space-y-4">
                {isLoading && !data ? (
                    <CalendarLoader />
                ) : error ? (
                    <div className="p-8 text-center text-surface-500">
                        <p>Failed to load calendar.</p>
                        <button onClick={() => refresh()} className="mt-2 text-primary-600 underline">Retry</button>
                    </div>
                ) : (

                    <>
                        {/* Calendar Grid */}
                        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-3">
                            <CalendarGrid
                                currentMonth={currentMonth}
                                days={data?.days || {}}
                                contexts={data?.contexts || {}}
                                patternHighlight={patternHighlight}
                                onDayClick={handleDayClick}
                                selectedDayKey={selectedDayKey}
                            />
                        </div>

                        {/* Month Summary / Insights Section */}
                        <MonthSummary
                            stats={data?.stats}
                            aiInterpretation={aiInterpretation}
                            matchingDaysCount={aiMatchingDays.length}
                            isFiltered={hasActiveFilter}
                        />
                    </>
                )}
            </main>

            {/* Filter Sheet */}
            <FilterSheet
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                monthKey={monthKey}
                onAIFilterResult={handleAIFilterResult}
                onClearFilter={() => {
                    setAiMatchingDays([])
                    setAiInterpretation('')
                }}
            />

            {/* Day Detail Sheet */}
            <DayDetailSheet
                dayKey={selectedDayKey}
                onClose={() => {
                    setSelectedDayKey(null)
                    refresh()
                }}
            />

            <BottomNav />
        </div>
    )
}



