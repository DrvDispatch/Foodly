'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, MessageCircle, ChevronLeft, ChevronRight, Loader2, Utensils } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import useSWR from 'swr'
import NextImage from 'next/image'

import { cn } from '@/lib/utils'
import { apiFetcher } from '@/lib/api-client'
import { BottomNav } from '@/components/bottom-nav'

interface TimelineMeal {
    id: string
    time: string
    type: string
    photoUrl?: string
    description: string
    calories: number
    protein: number
    carbs: number
    fat: number
    macroBias: string
    runningTotal: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    isFirst: boolean
    isLast: boolean
}

interface TimelineData {
    date: string
    meals: TimelineMeal[]
    totals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    targets: {
        calories: number
        protein: number
    }
    aiReflection: string
    mealCount: number
}

// Macro bar component - defined outside to prevent recreation on every render
const MacroBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const pct = Math.min((value / max) * 100, 100)
    return (
        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden flex-1">
            <div
                className={cn("h-full rounded-full transition-all duration-300", color)}
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

export default function TimelinePage() {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState(() => new Date())

    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const { data, isLoading, error } = useSWR<TimelineData>(
        `/timeline/${dateKey}`,
        apiFetcher,
        { revalidateOnFocus: false }
    )

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

    const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1))
    const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1))

    return (
        <div className="min-h-screen pb-24 bg-gradient-to-b from-white to-surface-50">
            {/* Header */}
            <header className="px-5 pt-6 pb-3 bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-title text-surface-900 flex items-center gap-2">
                        Timeline
                        <Clock className="w-5 h-5 text-surface-400" />
                    </h1>
                </div>

                {/* Date Selector */}
                <div className="flex items-center justify-between bg-surface-50 rounded-xl p-2">
                    <button
                        onClick={handlePrevDay}
                        className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-surface-600" />
                    </button>

                    <div className="text-center">
                        <p className="text-sm font-semibold text-surface-900">
                            {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                        </p>
                        <p className="text-xs text-surface-500">
                            {format(selectedDate, 'MMM d, yyyy')}
                        </p>
                    </div>

                    <button
                        onClick={handleNextDay}
                        disabled={isToday}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            isToday ? "opacity-30" : "hover:bg-surface-100"
                        )}
                    >
                        <ChevronRight className="w-5 h-5 text-surface-600" />
                    </button>
                </div>
            </header>

            <main className="px-5 py-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-surface-500">Failed to load timeline</p>
                    </div>
                ) : !data?.meals?.length ? (
                    <div className="text-center py-20">
                        <Utensils className="w-12 h-12 text-surface-200 mx-auto mb-4" />
                        <p className="text-surface-600 font-medium">No meals logged</p>
                        <p className="text-sm text-surface-400 mt-1">
                            {isToday ? "Add your first meal to see the timeline" : "No meals were logged on this day"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {/* Timeline */}
                        {data.meals.map((meal, index) => (
                            <div key={meal.id} className="relative">
                                {/* Connector Line */}
                                {!meal.isLast && (
                                    <div className="absolute left-[23px] top-14 bottom-0 w-0.5 bg-gradient-to-b from-primary-300 to-primary-100" />
                                )}

                                {/* Meal Node */}
                                <div className="flex gap-4 pb-6">
                                    {/* Time + Dot */}
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 relative overflow-hidden",
                                            meal.type === 'breakfast' ? "bg-amber-50 border-amber-300" :
                                                meal.type === 'lunch' ? "bg-emerald-50 border-emerald-300" :
                                                    meal.type === 'dinner' ? "bg-blue-50 border-blue-300" :
                                                        "bg-violet-50 border-violet-300"
                                        )}>
                                            {meal.photoUrl ? (
                                                <NextImage
                                                    src={meal.photoUrl}
                                                    alt={meal.type}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <Utensils className="w-5 h-5 text-surface-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pt-1">
                                        <div className="flex items-baseline justify-between">
                                            <div>
                                                <span className="text-xs text-surface-400 uppercase tracking-wide">
                                                    {meal.time}
                                                </span>
                                                <h3 className="text-sm font-semibold text-surface-900 capitalize">
                                                    {meal.type}
                                                </h3>
                                            </div>
                                            <span className="text-lg font-bold text-surface-800">
                                                +{meal.calories}
                                            </span>
                                        </div>

                                        {meal.description && (
                                            <p className="text-xs text-surface-500 mt-1 line-clamp-1">
                                                {meal.description}
                                            </p>
                                        )}

                                        {/* Macro Bars */}
                                        <div className="flex gap-2 mt-2">
                                            <div className="flex items-center gap-1 flex-1">
                                                <span className="text-[9px] text-surface-400 w-2">P</span>
                                                <MacroBar value={meal.protein} max={50} color="bg-blue-400" />
                                            </div>
                                            <div className="flex items-center gap-1 flex-1">
                                                <span className="text-[9px] text-surface-400 w-2">C</span>
                                                <MacroBar value={meal.carbs} max={100} color="bg-amber-400" />
                                            </div>
                                            <div className="flex items-center gap-1 flex-1">
                                                <span className="text-[9px] text-surface-400 w-2">F</span>
                                                <MacroBar value={meal.fat} max={40} color="bg-rose-400" />
                                            </div>
                                        </div>

                                        {/* Macro bias tag */}
                                        {meal.macroBias !== 'balanced' && (
                                            <span className={cn(
                                                "inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                                meal.macroBias === 'protein-rich' ? "bg-blue-100 text-blue-700" :
                                                    meal.macroBias === 'carb-heavy' ? "bg-amber-100 text-amber-700" :
                                                        "bg-rose-100 text-rose-700"
                                            )}>
                                                {meal.macroBias}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Running Total (between meals) */}
                                {!meal.isLast && (
                                    <div className="ml-[47px] pl-4 pb-4 border-l-2 border-dashed border-surface-200">
                                        <div className="bg-surface-50 rounded-lg px-3 py-2 inline-block">
                                            <p className="text-xs text-surface-500">
                                                Running total: <span className="font-semibold text-surface-700">{Math.round(meal.runningTotal.calories)} kcal</span>
                                            </p>
                                            <p className="text-[10px] text-surface-400">
                                                P: {Math.round(meal.runningTotal.protein)}g • C: {Math.round(meal.runningTotal.carbs)}g • F: {Math.round(meal.runningTotal.fat)}g
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Day Summary */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100 mt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-surface-900">Day Summary</h3>
                                <span className={cn(
                                    "text-sm font-bold",
                                    data.totals.calories > data.targets.calories ? "text-amber-600" : "text-emerald-600"
                                )}>
                                    {data.totals.calories} / {data.targets.calories} kcal
                                </span>
                            </div>

                            {/* Macro totals */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-blue-600">{Math.round(data.totals.protein)}g</p>
                                    <p className="text-[10px] text-surface-400 uppercase">Protein</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-amber-600">{Math.round(data.totals.carbs)}g</p>
                                    <p className="text-[10px] text-surface-400 uppercase">Carbs</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-rose-600">{Math.round(data.totals.fat)}g</p>
                                    <p className="text-[10px] text-surface-400 uppercase">Fat</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-2 bg-surface-100 rounded-full overflow-hidden mb-4">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        data.totals.calories > data.targets.calories
                                            ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                            : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                    )}
                                    style={{ width: `${Math.min((data.totals.calories / data.targets.calories) * 100, 100)}%` }}
                                />
                            </div>

                            {/* AI Reflection */}
                            {data.aiReflection && (
                                <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                                    <p className="text-xs text-blue-700">
                                        {data.aiReflection}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Ask Coach Button */}
                        <button
                            onClick={() => router.push(`/coach?context=timeline&date=${dateKey}`)}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm font-medium text-surface-600 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Ask Coach about this day
                        </button>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    )
}
