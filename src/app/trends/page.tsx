'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

import { BottomNav } from '@/components/bottom-nav'
import { TimeRangeSelector, type TimeRange } from '@/components/trends/TimeRangeSelector'
import { MetricTabs, type MetricType } from '@/components/trends/MetricTabs'
import { TrendChart } from '@/components/trends/TrendChart'
import { TrendStatsCard } from '@/components/trends/TrendStatsCard'
import { ConfidenceIndicator } from '@/components/trends/ConfidenceIndicator'
import { ConsistencyCard } from '@/components/trends/ConsistencyCard'
import { PeriodComparison } from '@/components/trends/PeriodComparison'
import { TrendExplainButton } from '@/components/trends/TrendExplainButton'
import { TrendQueryInput } from '@/components/trends/TrendQueryInput'
import { WeightChart } from '@/components/trends/WeightChart'
import { useTrendData } from '@/hooks/useTrendData'
import { useWeightTrend } from '@/hooks/useWeightTrend'
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

export default function TrendsPage() {
    const [range, setRange] = useState<TimeRange>('30d')
    const [metric, setMetric] = useState<MetricType>('calories')
    const [showAnalysis, setShowAnalysis] = useState(false) // Progressive disclosure
    const [showTrajectory, setShowTrajectory] = useState(false)

    // NL Filter state
    const [filteredData, setFilteredData] = useState<any[] | null>(null)
    const [filterInterpretation, setFilterInterpretation] = useState<string | null>(null)

    const { data, isLoading, error, refresh } = useTrendData(range)

    // Weight data (only fetched when weight metric is selected)
    const weightData = useWeightTrend(range)

    // Stats and goals only apply to nutrition metrics, not weight
    const nutritionMetric = metric === 'weight' ? 'calories' : metric
    const currentStats = data?.stats[nutritionMetric]
    const currentGoal = data?.goals[nutritionMetric] || 0

    // Use filtered data if available, otherwise use full data
    const chartData = filteredData || data?.dataPoints || []

    // Human-friendly context sentence (only for nutrition metrics)
    const contextSentence = useMemo(() => {
        if (metric === 'weight' || !currentStats) return null
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
                        {/* Chart Card - Different view for weight */}
                        {metric === 'weight' ? (
                            <WeightChart
                                entries={weightData.entries}
                                targetWeight={weightData.targetWeight}
                                unitSystem={weightData.unitSystem}
                                goalType={weightData.goalType}
                                weeklyPace={weightData.weeklyPace}
                                dateRange={range}
                            />
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-4">
                                <TrendChart
                                    data={chartData}
                                    metric={metric}
                                    goal={currentGoal}
                                    range={range}
                                    showTrajectory={showTrajectory}
                                />
                            </div>
                        )}

                        {/* Context Sentence - The ONE answer (nutrition only) */}
                        {contextSentence && (
                            <p className="text-center text-sm text-surface-600 px-4 leading-relaxed">
                                {contextSentence}
                            </p>
                        )}

                        {/* ============ NUTRITION ANALYSIS (Hidden for Weight) ============ */}
                        {metric !== 'weight' && (
                            <>
                                {/* View Analysis Toggle */}
                                <button
                                    onClick={() => setShowAnalysis(!showAnalysis)}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-surface-500 hover:text-surface-700 transition-colors"
                                >
                                    {showAnalysis ? (
                                        <>
                                            <ChevronUp className="w-4 h-4" />
                                            Hide analysis
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4" />
                                            View analysis
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

                                        {/* Behavior Quality - Human labels */}
                                        <ConsistencyCard
                                            stats={data.stats}
                                            goals={data.goals}
                                        />

                                        {/* NL Query Input */}
                                        <TrendQueryInput
                                            dataPoints={data.dataPoints}
                                            goals={data.goals}
                                            onFilteredData={handleFilteredData}
                                            onClear={handleClearFilter}
                                        />

                                        {/* Period Comparison */}
                                        <PeriodComparison />
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    )
}



