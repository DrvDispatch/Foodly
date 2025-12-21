'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, MessageCircle, Loader2, TrendingUp, Utensils, Calendar } from 'lucide-react'
import useSWR from 'swr'

import { cn } from '@/lib/utils'
import { BottomNav } from '@/components/bottom-nav'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface HabitsData {
    activeDays: number
    totalDays: number
    avgDaysPerWeek: number
    mealConsistency: {
        breakfast: number
        lunch: number
        dinner: number
        snack: number
    }
    mostConsistentMeal: string | null
    bestWeekDays: number
    heatmap: { date: string; logged: boolean }[]
    aiInsight: string
    totalMeals: number
}

export default function HabitsPage() {
    const router = useRouter()
    const { data, isLoading, error } = useSWR<HabitsData>(
        '/api/habits/summary',
        fetcher,
        { revalidateOnFocus: false }
    )

    // Consistency bar component
    const ConsistencyBar = ({ label, value, color }: { label: string; value: number; color: string }) => {
        const pct = Math.round(value * 100)
        const description = pct >= 80 ? 'consistent' : pct >= 50 ? 'moderate' : pct >= 20 ? 'irregular' : 'often skipped'

        return (
            <div className="flex items-center gap-3">
                <span className="text-sm text-surface-600 w-20 capitalize">{label}</span>
                <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", color)}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <span className="text-xs text-surface-400 w-20 text-right">{description}</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-24 bg-gradient-to-b from-white to-surface-50">
            {/* Header */}
            <header className="px-5 pt-6 pb-4 bg-white sticky top-0 z-20 shadow-sm">
                <h1 className="text-title text-surface-900 flex items-center gap-2">
                    Habits
                    <Activity className="w-5 h-5 text-surface-400" />
                </h1>
                <p className="text-sm text-surface-500 mt-1">Your behavioral patterns over time</p>
            </header>

            <main className="px-5 py-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-surface-500">Failed to load habits</p>
                    </div>
                ) : !data ? (
                    <div className="text-center py-20">
                        <p className="text-surface-500">No data available</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* AI Insight Card */}
                        {data.aiInsight && (
                            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl px-4 py-4 border border-violet-100">
                                <p className="text-sm text-violet-800 font-medium text-center">
                                    &quot;{data.aiInsight}&quot;
                                </p>
                            </div>
                        )}

                        {/* Snapshot Card */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <h2 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-surface-400" />
                                Last 30 Days
                            </h2>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-primary-600">{data.activeDays}</p>
                                    <p className="text-[10px] text-surface-400 uppercase">Active Days</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-surface-700">{data.avgDaysPerWeek}</p>
                                    <p className="text-[10px] text-surface-400 uppercase">Days/Week</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-600">{data.totalMeals}</p>
                                    <p className="text-[10px] text-surface-400 uppercase">Meals</p>
                                </div>
                            </div>

                            {/* Non-shaming summary */}
                            <p className="text-xs text-surface-500 text-center">
                                You usually log meals <span className="font-medium text-surface-700">{data.avgDaysPerWeek} days per week</span>
                            </p>
                        </div>

                        {/* Heatmap */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <h2 className="text-sm font-semibold text-surface-900 mb-3">Activity Heatmap</h2>

                            <div className="flex flex-wrap gap-1">
                                {data.heatmap.map((day, i) => (
                                    <div
                                        key={day.date}
                                        className={cn(
                                            "w-[calc((100%-7*4px)/8)] aspect-square rounded-sm transition-colors",
                                            day.logged
                                                ? "bg-emerald-400"
                                                : "bg-surface-100"
                                        )}
                                        title={`${day.date}: ${day.logged ? 'Logged' : 'No entries'}`}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-surface-400">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-sm bg-surface-100" />
                                    <span>No entries</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                                    <span>Logged</span>
                                </div>
                            </div>
                        </div>

                        {/* Meal Rhythm */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <h2 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-surface-400" />
                                Meal Rhythm
                            </h2>

                            <div className="space-y-3">
                                <ConsistencyBar
                                    label="Breakfast"
                                    value={data.mealConsistency.breakfast}
                                    color="bg-amber-400"
                                />
                                <ConsistencyBar
                                    label="Lunch"
                                    value={data.mealConsistency.lunch}
                                    color="bg-emerald-400"
                                />
                                <ConsistencyBar
                                    label="Dinner"
                                    value={data.mealConsistency.dinner}
                                    color="bg-blue-400"
                                />
                            </div>

                            {data.mostConsistentMeal && (
                                <p className="text-xs text-surface-500 mt-4 text-center">
                                    <span className="capitalize font-medium text-surface-700">{data.mostConsistentMeal}</span> is your most consistent meal
                                </p>
                            )}
                        </div>

                        {/* Gentle Streaks */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <h2 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-surface-400" />
                                Consistency
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-surface-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-surface-800">{data.bestWeekDays}</p>
                                    <p className="text-[10px] text-surface-400">Best week (days)</p>
                                </div>
                                <div className="bg-surface-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-surface-800">
                                        {Math.round((data.activeDays / data.totalDays) * 100)}%
                                    </p>
                                    <p className="text-[10px] text-surface-400">Days logged</p>
                                </div>
                            </div>

                            <p className="text-[10px] text-surface-400 text-center mt-3 italic">
                                Consistency matters more than perfection
                            </p>
                        </div>

                        {/* Ask Coach Button */}
                        <button
                            onClick={() => router.push('/coach?context=habits')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm font-medium text-surface-600 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Ask about my habits
                        </button>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    )
}
