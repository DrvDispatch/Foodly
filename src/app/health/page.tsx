'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp, Info, Utensils } from 'lucide-react'
import useSWR from 'swr'

import { cn } from '@/lib/utils'
import { apiFetcher } from '@/lib/api-client'
import { BottomNav } from '@/components/bottom-nav'

interface Nutrient {
    name: string
    estimatedDailyAvg: number
    unit: string
    percentOfRDA: number
    status?: 'deficient' | 'ok' | 'excessive'
}

interface HealthData {
    period: string
    daysWithData: number
    mealCount: number
    nutrients: Nutrient[]
    deficiencies: string[]
    excessive?: string[]
    foodSuggestions: Record<string, string[]>
    insight: string
    disclaimer: string
}

// Nutrient education content
const NUTRIENT_INFO: Record<string, { description: string; importance: string }> = {
    'Vitamin D': {
        description: 'The "sunshine vitamin" that supports bone and immune health',
        importance: 'Essential for calcium absorption and mood regulation'
    },
    'Vitamin B12': {
        description: 'Crucial for nerve function and red blood cell formation',
        importance: 'Important for energy and cognitive function'
    },
    'Iron': {
        description: 'Carries oxygen throughout your body',
        importance: 'Low iron can cause fatigue and weakness'
    },
    'Magnesium': {
        description: 'Supports muscle function, sleep, and stress response',
        importance: 'Involved in over 300 enzyme reactions'
    },
    'Zinc': {
        description: 'Supports immune function and wound healing',
        importance: 'Important for taste, smell, and skin health'
    },
    'Fiber': {
        description: 'Supports digestive health and blood sugar control',
        importance: 'Helps maintain healthy gut bacteria'
    }
}

export default function HealthPage() {
    const router = useRouter()
    const [expandedNutrient, setExpandedNutrient] = useState<string | null>(null)

    const { data, isLoading, error } = useSWR<HealthData>(
        '/health/weekly',
        apiFetcher,
        { revalidateOnFocus: false }
    )

    // Progress bar color based on percentage
    const getBarColor = (pct: number, status?: string) => {
        if (status === 'excessive') return 'bg-amber-500' // Darker amber for excessive
        if (pct >= 80) return 'bg-emerald-400'
        if (pct >= 60) return 'bg-amber-400'
        return 'bg-rose-400'
    }

    // Status text
    const getStatusText = (pct: number) => {
        if (pct >= 100) return 'excellent'
        if (pct >= 80) return 'good'
        if (pct >= 60) return 'moderate'
        if (pct >= 40) return 'low'
        return 'very low'
    }

    return (
        <div className="min-h-screen pb-24 bg-gradient-to-b from-white to-surface-50">
            {/* Header */}
            <header className="px-5 pt-6 pb-4 bg-white sticky top-0 z-20 shadow-sm">
                <h1 className="text-title text-surface-900 flex items-center gap-2">
                    Health
                    <Heart className="w-5 h-5 text-rose-400" />
                </h1>
                <p className="text-sm text-surface-500 mt-1">Micronutrient insights from your meals</p>
            </header>

            <main className="px-5 py-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-surface-500">Failed to load health data</p>
                    </div>
                ) : !data ? (
                    <div className="text-center py-20">
                        <p className="text-surface-500">No data available</p>
                    </div>
                ) : data.daysWithData === 0 ? (
                    <div className="text-center py-20">
                        <Utensils className="w-12 h-12 text-surface-200 mx-auto mb-4" />
                        <p className="text-surface-600 font-medium">No meals logged this week</p>
                        <p className="text-sm text-surface-400 mt-1">
                            Log meals to see micronutrient insights
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Disclaimer */}
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
                            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700">{data.disclaimer}</p>
                        </div>

                        {/* Weekly Summary */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <h2 className="text-sm font-semibold text-surface-900 mb-1">
                                {data.period}
                            </h2>
                            <p className="text-xs text-surface-500 mb-4">
                                Based on {data.mealCount} meals over {data.daysWithData} days
                            </p>

                            {/* AI Insight */}
                            {data.insight && (
                                <div className="bg-blue-50 rounded-lg px-3 py-2 mb-4">
                                    <p className="text-xs text-blue-700">{data.insight}</p>
                                </div>
                            )}
                        </div>

                        {/* Deficiency Alert */}
                        {data.deficiencies.length > 0 && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                    <h2 className="text-sm font-semibold text-rose-800">
                                        Weekly Deficiency Alert
                                    </h2>
                                </div>

                                <p className="text-xs text-rose-700 mb-3">
                                    {data.deficiencies.join(' and ')} {data.deficiencies.length === 1 ? 'was' : 'were'} below recommended levels this week.
                                </p>

                                {/* Food Suggestions */}
                                <div className="space-y-2">
                                    {data.deficiencies.map(deficiency => (
                                        data.foodSuggestions[deficiency] && (
                                            <div key={deficiency} className="bg-white rounded-lg p-3">
                                                <p className="text-xs font-medium text-surface-700 mb-1">
                                                    Foods rich in {deficiency}:
                                                </p>
                                                <p className="text-xs text-surface-500">
                                                    {data.foodSuggestions[deficiency].join(', ')}
                                                </p>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Nutrient Radar */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <h2 className="text-sm font-semibold text-surface-900 mb-4">
                                Nutrient Overview
                            </h2>

                            <div className="space-y-3">
                                {data.nutrients.map(nutrient => (
                                    <div key={nutrient.name}>
                                        <button
                                            onClick={() => setExpandedNutrient(
                                                expandedNutrient === nutrient.name ? null : nutrient.name
                                            )}
                                            className="w-full"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-surface-700">{nutrient.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-xs font-medium",
                                                        nutrient.percentOfRDA >= 80 && nutrient.status !== 'excessive' ? "text-emerald-600" :
                                                            nutrient.status === 'excessive' ? "text-amber-600" :
                                                                nutrient.percentOfRDA >= 60 ? "text-amber-600" : "text-rose-600"
                                                    )}>
                                                        {Math.round(nutrient.percentOfRDA)}%
                                                    </span>
                                                    {nutrient.status === 'excessive' && (
                                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                    )}
                                                    {expandedNutrient === nutrient.name ? (
                                                        <ChevronUp className="w-4 h-4 text-surface-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-surface-400" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", getBarColor(nutrient.percentOfRDA, nutrient.status))}
                                                    style={{ width: `${Math.min(nutrient.percentOfRDA, 100)}%` }}
                                                />
                                            </div>
                                        </button>

                                        {/* Expanded Info */}
                                        {expandedNutrient === nutrient.name && NUTRIENT_INFO[nutrient.name] && (
                                            <div className="mt-2 pl-3 border-l-2 border-surface-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <p className="text-xs text-surface-600 mb-1">
                                                    {NUTRIENT_INFO[nutrient.name].description}
                                                </p>
                                                <p className="text-[10px] text-surface-400">
                                                    {NUTRIENT_INFO[nutrient.name].importance}
                                                </p>
                                                <p className="text-[10px] text-surface-500 mt-1">
                                                    Avg: {nutrient.estimatedDailyAvg.toFixed(1)} {nutrient.unit}/day • Status: {getStatusText(nutrient.percentOfRDA)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {data.nutrients.length === 0 && (
                                <p className="text-xs text-surface-400 text-center py-4">
                                    Not enough data to estimate micronutrients
                                </p>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 text-[10px] text-surface-400">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-2 rounded-sm bg-emerald-400" />
                                <span>80%+ (Good)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-2 rounded-sm bg-amber-400" />
                                <span>60-80%</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-2 rounded-sm bg-rose-400" />
                                <span>&lt;60% (Low)</span>
                            </div>
                        </div>

                        {/* Ask Coach Button */}
                        <button
                            onClick={() => router.push('/coach?context=health')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm font-medium text-surface-600 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Ask about my nutrition
                        </button>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    )
}
