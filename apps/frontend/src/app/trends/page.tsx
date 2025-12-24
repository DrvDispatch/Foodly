'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

import { BottomNav } from '@/components/bottom-nav'
import { TimeRangeSelector, type TimeRange } from '@/components/trends/TimeRangeSelector'
import { MetricTabs, type MetricType } from '@/components/trends/MetricTabs'
import { TrendChart } from '@/components/trends/TrendChart'
import { ConfidenceIndicator } from '@/components/trends/ConfidenceIndicator'
import { MacroSourceBreakdown } from '@/components/trends/MacroSourceBreakdown'
import { TrendExplainButton } from '@/components/trends/TrendExplainButton'
import { TrendQueryInput } from '@/components/trends/TrendQueryInput'
import { useTrendData } from '@/hooks/useTrendData'
import { useMealBreakdown } from '@/hooks/useMealBreakdown'
import { cn } from '@/lib/utils'

// Generate human-friendly context sentence
function getContextSentence(stats: { trend: string; consistencyScore: number; mean: number }, goal: number, metric: string, range: string): string {
    const rangeLabel = range === '7d' ? 'this week' : range === '30d' ? 'this month' : range === '90d' ? 'the last 3 months' : 'the last 6 months'

    const trendWord = stats.trend === 'up' ? 'increasing' : stats.trend === 'down' ? 'decreasing' : 'steady'
    const stabilityWord = stats.consistencyScore >= 80 ? 'very stable' : stats.consistencyScore >= 50 ? 'fairly consistent' : 'quite variable'

    const diffFromGoal = Math.round(((stats.mean - goal) / goal) * 100)
    const goalWord = Math.abs(diffFromGoal) <= 5 ? 'right on target' : diffFromGoal > 0 ? `${diffFromGoal}% above your goal` : `${Math.abs(diffFromGoal)}% below your goal`

    return `Your ${metric} has been ${stabilityWord} and ${trendWord} ${rangeLabel}, averaging ${goalWord}.`
}

// Inner component that uses useSearchParams
function TrendsContent() {
    const searchParams = useSearchParams()
    const [range, setRange] = useState<TimeRange>('30d')
    const [metric, setMetric] = useState<MetricType>('calories')
    const [showAnalysis, setShowAnalysis] = useState(false) // Progressive disclosure
    const [showTrajectory, setShowTrajectory] = useState(false)

    // Read initial tab from URL params
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'calories' || tab === 'protein' || tab === 'carbs' || tab === 'fat') {
            setMetric(tab as MetricType)
        }
    }, [searchParams])

    // NL Filter state
    const [filteredData, setFilteredData] = useState<any[] | null>(null)
    const [filterInterpretation, setFilterInterpretation] = useState<string | null>(null)

    const { data, isLoading, error, refresh } = useTrendData(range)

    // Meal breakdown data
    const mealBreakdown = useMealBreakdown(range)

    // Stats and goals for current metric
    const currentStats = data?.stats[metric]
    const currentGoal = data?.goals[metric] || 0

    // Use filtered data if available, otherwise use full data
    const chartData = filteredData || data?.dataPoints || []

    // Human-friendly context sentence
    const contextSentence = useMemo(() => {
        if (!currentStats) return null
        return getContextSentence(currentStats, currentGoal, metric, range)
    }, [currentStats, currentGoal, metric, range])


    const handleFilteredData = (filtered: any[], interpretation: string) => {
        setFilteredData(filtered)
        setFilterInterpretation(interpretation)
    }

    const handleClearFilter = () => {
        setFilteredData(null)
        setFilterInterpretation(null)
    }

    return (
        <div className="min-h-screen pb-24 bg-gradient-to-b from-white to-surface-50">
            {/* Header */}
            <header className="px-5 pt-6 pb-4 bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-title text-surface-900 flex items-center gap-2">
                        Trends
                        <TrendingUp className="w-5 h-5 text-surface-400" />
                    </h1>

                    <button
                        onClick={() => refresh()}
                        disabled={isLoading}
                        className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-full disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                    </button>
                </div>

                {/* Time Range Selector */}
                <TimeRangeSelector selected={range} onChange={setRange} />
            </header>

            {/* Main Content */}
            <main className="px-4 py-4 space-y-4">
                {/* Metric Tabs */}
                <MetricTabs selected={metric} onChange={setMetric} />

                {/* Loading State */}
                {isLoading && !data && (
                    <div className="space-y-4">
                        <div className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-8 text-center text-surface-500">
                        <p>Failed to load trends.</p>
                        <button onClick={() => refresh()} className="mt-2 text-primary-600 underline">
                            Retry
                        </button>
                    </div>
                )}

                {/* ============ DEFAULT VIEW (Simple) ============ */}
                {data && (
                    <>
                        {/* Chart Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-4">
                            <TrendChart
                                data={chartData}
                                metric={metric}
                                goal={currentGoal}
                                range={range}
                                showTrajectory={showTrajectory}
                            />
                        </div>

                        {/* Context Sentence */}
                        {contextSentence && (
                            <p className="text-center text-sm text-surface-600 px-4 leading-relaxed">
                                {contextSentence}
                            </p>
                        )}

                        {/* ============ NUTRITION ANALYSIS ============ */}
                        <>
                            {/* View Analysis Toggle */}
                            <button
                                onClick={() => setShowAnalysis(!showAnalysis)}
                                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {showAnalysis ? (
                                    <>
                                        <ChevronUp className="w-4 h-4 animate-bounce" />
                                        Hide Deep Dive
                                    </>
                                ) : (
                                    <>
                                        <span className="text-base">🔍</span>
                                        <span>Deep Dive</span>
                                        <ChevronDown className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            {/* Expanded Analysis (Power Features) */}
                            {showAnalysis && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Confidence Indicator */}
                                    <div className="flex justify-center">
                                        <ConfidenceIndicator
                                            loggedDays={data.confidence.loggedDays}
                                            totalDays={data.confidence.totalDays}
                                            level={data.confidence.level}
                                        />
                                    </div>

                                    {/* AI Explain Button */}
                                    {currentStats && (
                                        <div className="flex justify-center">
                                            <TrendExplainButton
                                                metric={metric}
                                                range={range}
                                                stats={currentStats}
                                                goal={currentGoal}
                                                dataPoints={data.dataPoints}
                                            />
                                        </div>
                                    )}

                                    {/* Macro Source Breakdown */}
                                    {mealBreakdown.data && (
                                        <MacroSourceBreakdown
                                            metric={metric as 'calories' | 'protein' | 'carbs' | 'fat'}
                                            breakdown={mealBreakdown.data.breakdown[metric as keyof typeof mealBreakdown.data.breakdown]}
                                            total={mealBreakdown.data.totals[metric as keyof typeof mealBreakdown.data.totals]}
                                            consistencyScore={mealBreakdown.data.consistencyScores[metric as keyof typeof mealBreakdown.data.consistencyScores]}
                                            goal={mealBreakdown.data.goals[metric as keyof typeof mealBreakdown.data.goals]}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    )
}

// Loading fallback for Suspense
function TrendsLoading() {
    return (
        <div className="min-h-screen pb-24 bg-gradient-to-b from-white to-surface-50">
            <header className="px-5 pt-6 pb-4 bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-title text-surface-900 flex items-center gap-2">
                        Trends
                        <TrendingUp className="w-5 h-5 text-surface-400" />
                    </h1>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 w-16 bg-surface-100 rounded-full animate-pulse" />
                    ))}
                </div>
            </header>
            <main className="px-4 py-4 space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 w-20 bg-surface-100 rounded-xl animate-pulse shrink-0" />
                    ))}
                </div>
                <div className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
            </main>
            <BottomNav />
        </div>
    )
}

// Main page component with Suspense boundary
export default function TrendsPage() {
    return (
        <Suspense fallback={<TrendsLoading />}>
            <TrendsContent />
        </Suspense>
    )
}



