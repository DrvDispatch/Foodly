'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, TrendingUp, TrendingDown, Minus, Activity, Heart, Scale, Utensils, Sparkles, ChevronLeft } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { ProgressMeter } from './ProgressMeter'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface DashboardCardsProps {
    selectedDate: Date
    summary: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    goals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    onNutritionClick: () => void
}

export function DashboardCards({ selectedDate, summary, goals, onNutritionClick }: DashboardCardsProps) {
    const router = useRouter()
    const [isFlipped, setIsFlipped] = useState(false)
    const touchStartX = useRef(0)

    // Fetch data
    const { data: healthData } = useSWR('/api/health/weekly', fetcher, { revalidateOnFocus: false })
    const { data: habitsData } = useSWR('/api/habits/summary', fetcher, { revalidateOnFocus: false })
    const { data: weightData } = useSWR('/api/weight', fetcher, { revalidateOnFocus: false })

    // Calculations - rounded properly
    const caloriePercent = Math.min(Math.round((summary.calories / goals.calories) * 100), 999)
    const remaining = Math.max(0, goals.calories - summary.calories)

    // Handle swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (Math.abs(diff) > 50) {
            setIsFlipped(diff > 0)
        }
    }

    // Weight data formatting
    const currentWeight = weightData?.entries?.[0]?.weight
    const weightTrend = weightData?.trend?.weeklyChange
    const daysLogged = weightData?.entries?.length || 0

    return (
        <div className="px-5 mb-4">
            {/* 🏆 PROGRESS - Foodly's Signature Progression System */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100 mb-4">
                <ProgressMeter />
            </div>

            <p className="text-[10px] text-surface-400 text-center mb-3 uppercase tracking-wide">
                Swipe card below to see more • Tap sections to explore
            </p>

            {/* Main Swipeable Card */}
            <div
                className="relative mb-3 perspective-1000"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className={cn(
                    "transition-transform duration-500 transform-style-preserve-3d",
                    isFlipped && "rotate-y-180"
                )}>
                    {/* FRONT: Nutrition + Weight */}
                    <div className={cn(
                        "bg-white rounded-2xl p-4 shadow-sm border border-surface-100 backface-hidden",
                        isFlipped && "hidden"
                    )}>
                        <div className="flex gap-4">
                            {/* Nutrition Section */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-primary-500" />
                                    <span className="text-sm font-semibold text-surface-900">Today&apos;s Nutrition</span>
                                </div>

                                {/* Calorie Display */}
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-2xl font-bold text-surface-900">
                                        {summary.calories.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-surface-400">
                                        / {goals.calories.toLocaleString()} kcal
                                    </span>
                                </div>

                                {/* Macro Bars */}
                                <div className="space-y-1.5 mb-3">
                                    <MacroBar label="Protein" value={Math.round(summary.protein)} max={goals.protein} color="bg-blue-500" />
                                    <MacroBar label="Carbs" value={Math.round(summary.carbs)} max={goals.carbs} color="bg-amber-500" />
                                    <MacroBar label="Fat" value={Math.round(summary.fat)} max={goals.fat} color="bg-rose-400" />
                                </div>

                                {/* View Breakdown Button */}
                                <button
                                    onClick={onNutritionClick}
                                    className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:underline"
                                >
                                    View nutrition breakdown
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="w-px bg-surface-100" />

                            {/* Weight Section */}
                            <button
                                onClick={() => router.push('/trends?metric=weight')}
                                className="w-28 text-left"
                            >
                                <div className="flex items-center gap-1 mb-2">
                                    <Scale className="w-3.5 h-3.5 text-primary-500" />
                                    <span className="text-xs font-semibold text-surface-700">Weight</span>
                                </div>

                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-xl font-bold text-surface-900">
                                        {currentWeight ? currentWeight.toFixed(1) : '--'}
                                    </span>
                                    <span className="text-xs text-surface-400">kg</span>
                                    {weightTrend !== undefined && weightTrend !== 0 && (
                                        weightTrend > 0 ? (
                                            <TrendingUp className="w-3.5 h-3.5 text-amber-500 ml-0.5" />
                                        ) : (
                                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
                                        )
                                    )}
                                </div>

                                {weightTrend !== undefined && weightTrend !== 0 ? (
                                    <p className="text-[10px] text-surface-500">
                                        {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg/week
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-surface-400">
                                        {daysLogged > 0 ? `${daysLogged} entries` : 'Log to track'}
                                    </p>
                                )}

                                <p className="text-[10px] text-primary-500 mt-1 flex items-center">
                                    View trends <ChevronRight className="w-3 h-3" />
                                </p>
                            </button>
                        </div>

                        {/* Flip Indicator */}
                        <div className="flex justify-center mt-3 gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                            <div className="w-1.5 h-1.5 rounded-full bg-surface-200" />
                        </div>
                    </div>

                    {/* BACK: Micronutrients + Habits */}
                    <div className={cn(
                        "bg-white rounded-2xl p-4 shadow-sm border border-surface-100 backface-hidden rotate-y-180",
                        !isFlipped && "hidden"
                    )}>
                        <div className="flex gap-4">
                            {/* Micronutrients Section */}
                            <button
                                onClick={() => router.push('/health')}
                                className="flex-1 text-left"
                            >
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Heart className="w-4 h-4 text-rose-400" />
                                    <span className="text-sm font-semibold text-surface-900">Micronutrients</span>
                                </div>

                                {/* Status dots */}
                                <div className="flex gap-1 mb-2">
                                    {healthData?.nutrients?.slice(0, 6).map((n: any, i: number) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-3 h-3 rounded-full",
                                                n.percentOfRDA >= 80 ? "bg-emerald-400" :
                                                    n.percentOfRDA >= 60 ? "bg-amber-400" : "bg-rose-400"
                                            )}
                                            title={n.name}
                                        />
                                    )) || Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="w-3 h-3 rounded-full bg-surface-200" />
                                    ))}
                                </div>

                                <p className="text-xs text-surface-600 mb-1">
                                    {healthData?.deficiencies?.length > 0
                                        ? `Low: ${healthData.deficiencies.slice(0, 2).join(', ')}`
                                        : 'Looking balanced'}
                                </p>

                                <p className="text-[10px] text-primary-500 flex items-center">
                                    View details <ChevronRight className="w-3 h-3" />
                                </p>
                            </button>

                            {/* Divider */}
                            <div className="w-px bg-surface-100" />

                            {/* Habits Section */}
                            <button
                                onClick={() => router.push('/habits')}
                                className="w-28 text-left"
                            >
                                <div className="flex items-center gap-1 mb-2">
                                    <Activity className="w-3.5 h-3.5 text-violet-500" />
                                    <span className="text-xs font-semibold text-surface-700">Habits</span>
                                </div>

                                {/* Weekly dots */}
                                <div className="flex gap-0.5 mb-2">
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                        const dayData = habitsData?.heatmap?.[habitsData.heatmap.length - 7 + i]
                                        return (
                                            <div key={i} className="flex flex-col items-center">
                                                <div className={cn(
                                                    "w-2.5 h-2.5 rounded-full mb-0.5",
                                                    dayData?.logged ? "bg-emerald-400" : "bg-surface-200"
                                                )} />
                                                <span className="text-[8px] text-surface-400">{day}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <p className="text-xs text-surface-600">
                                    {habitsData?.avgDaysPerWeek
                                        ? `${Math.round(habitsData.avgDaysPerWeek)} days/week`
                                        : 'Track consistency'}
                                </p>

                                <p className="text-[10px] text-primary-500 mt-1 flex items-center">
                                    View habits <ChevronRight className="w-3 h-3" />
                                </p>
                            </button>
                        </div>

                        {/* Flip Indicator */}
                        <div className="flex justify-center mt-3 gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-surface-200" />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Access Row */}
            <div className="flex gap-2">
                <button
                    onClick={() => router.push('/timeline')}
                    className="flex-1 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-surface-100 flex items-center gap-2 hover:bg-surface-50 transition-colors"
                >
                    <Utensils className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-surface-700">Timeline</span>
                    <ChevronRight className="w-3 h-3 text-surface-300 ml-auto" />
                </button>

                <button
                    onClick={() => router.push('/coach')}
                    className="flex-1 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-surface-100 flex items-center gap-2 hover:bg-surface-50 transition-colors"
                >
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    <span className="text-xs font-medium text-surface-700">Ask Coach</span>
                    <ChevronRight className="w-3 h-3 text-surface-300 ml-auto" />
                </button>
            </div>
        </div>
    )
}

// Clean macro bar component
function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100)
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 w-12">{label}</span>
            <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-surface-600 w-14 text-right">{value}/{max}g</span>
        </div>
    )
}
