'use client'

import { useMemo, useState, useEffect } from 'react'
import { Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, ComposedChart, Tooltip } from 'recharts'
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, AlertCircle, Target, MessageCircle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'

interface WeightEntry {
    date: string
    weight: number
    note?: string
}

interface WeightChartProps {
    entries: WeightEntry[]
    targetWeight?: number
    startingWeight?: number  // Baseline from onboarding
    unitSystem?: 'metric' | 'imperial'
    dateRange: '7d' | '30d' | '90d' | '180d'
    goalType?: 'fat_loss' | 'maintenance' | 'muscle_gain' | 'strength' | 'recomp' | 'health'
    weeklyPace?: number
}

// Hook to fetch AI-generated normalcy message
function useNormalcyMessage(
    entries: WeightEntry[],
    direction: 'up' | 'down' | 'stable',
    goalType: string | undefined,
    targetWeight: number | undefined,
    currentWeight: number | null,
    weeklyPace: number | undefined,
    weeksToTarget: number | null
) {
    const [normalcy, setNormalcy] = useState<{ message: string; type: 'success' | 'info' | 'warning' }>({
        message: 'Analyzing your trend...',
        type: 'info'
    })
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (entries.length < 2 || !currentWeight) {
            setNormalcy({ message: 'Add more entries for insights', type: 'info' })
            return
        }

        const fetchNormalcy = async () => {
            setIsLoading(true)
            try {
                const data = await apiClient.post<{ message: string; type: string }>('/trends/weight-normalcy', {
                    entries: entries.slice(-10), // Last 10 entries for context
                    direction,
                    goalType,
                    targetWeight,
                    currentWeight,
                    weeklyPace,
                    weeksToTarget
                })

                setNormalcy({
                    message: data.message || 'Weight fluctuations are normal',
                    type: (data.type as 'success' | 'info' | 'warning') || 'info'
                })
            } catch {
                setNormalcy({ message: 'Weight fluctuations are completely normal', type: 'info' })
            } finally {
                setIsLoading(false)
            }
        }

        // Debounce the API call
        const timer = setTimeout(fetchNormalcy, 500)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries.length, direction, goalType, targetWeight, currentWeight, weeklyPace, weeksToTarget])

    return { normalcy, isLoading }
}

export function WeightChart({ entries, targetWeight, startingWeight, unitSystem = 'metric', dateRange, goalType, weeklyPace }: WeightChartProps) {
    const [showDetails, setShowDetails] = useState(false)
    const [showDrivers, setShowDrivers] = useState(false)
    const isMetric = unitSystem === 'metric'

    const convert = (kg: number) => isMetric ? kg : kg * 2.205
    const unitLabel = isMetric ? 'kg' : 'lb'

    const wantsToGainWeight = goalType === 'muscle_gain' || goalType === 'strength'
    const wantsToLoseWeight = goalType === 'fat_loss' || goalType === 'recomp'

    const getGradientId = () => {
        if (wantsToGainWeight) return 'gainGradient'
        if (wantsToLoseWeight) return 'lossGradient'
        return 'neutralGradient'
    }

    const getWeeklyPaceKg = (): number => {
        if (weeklyPace && weeklyPace > 0) return weeklyPace
        return wantsToGainWeight ? 0.25 : 0.5
    }

    const paceKgPerWeek = getWeeklyPaceKg()
    const paceKgPerDay = paceKgPerWeek / 7

    // Process data
    const { chartData, trajectory, stats, trendDrivers, lastLoggedDate } = useMemo(() => {
        if (!entries.length) {
            return { chartData: [], trajectory: null, stats: null, trendDrivers: [], lastLoggedDate: null }
        }

        const sorted = [...entries].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        const loggedPoints: {
            date: string
            fullDate: string
            logged: number
            projected?: number
            isNow?: boolean
        }[] = sorted.map((entry, i) => ({
            date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: entry.date.split('T')[0],
            logged: convert(entry.weight),
            isNow: i === sorted.length - 1
        }))

        const lastEntry = sorted[sorted.length - 1]
        const lastWeight = lastEntry.weight
        const lastDate = new Date(lastEntry.date)
        const lastDateStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        const projectionPoints: {
            date: string
            fullDate: string
            projected: number
            isFuture: boolean
        }[] = []

        if (targetWeight && targetWeight !== lastWeight) {
            const weightDiff = Math.abs(targetWeight - lastWeight)
            const daysToTarget = weightDiff / paceKgPerDay
            const cappedDays = Math.min(daysToTarget, 120)

            loggedPoints[loggedPoints.length - 1].projected = convert(lastWeight)

            const numPoints = Math.ceil(cappedDays / 7)
            for (let i = 1; i <= numPoints; i++) {
                const daysAhead = Math.min(i * 7, cappedDays)
                const futureDate = new Date(lastDate)
                futureDate.setDate(futureDate.getDate() + daysAhead)

                const progress = daysAhead / daysToTarget
                const projWeight = lastWeight + (targetWeight - lastWeight) * Math.min(progress, 1)

                projectionPoints.push({
                    date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    fullDate: futureDate.toISOString().split('T')[0],
                    projected: convert(projWeight),
                    isFuture: true
                })

                if (progress >= 1) break
            }
        }

        // Generate trend drivers
        const drivers: string[] = []
        const daysSinceFirst = Math.max(1, (lastDate.getTime() - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24))
        const avgGapDays = daysSinceFirst / Math.max(1, sorted.length - 1)

        drivers.push(`${sorted.length} weigh-ins over ${Math.round(daysSinceFirst)} days`)
        if (avgGapDays > 5) drivers.push(`Average ${Math.round(avgGapDays)} days between entries`)
        if (sorted.length < 5) drivers.push('More data points will improve accuracy')

        // Stats
        // Use startingWeight as baseline if available (from onboarding), otherwise use first logged entry
        const baselineWeight = startingWeight || sorted[0]?.weight
        const change = lastWeight && baselineWeight ? lastWeight - baselineWeight : 0

        let weeksToTarget: number | null = null
        if (targetWeight && targetWeight !== lastWeight) {
            const weightDiff = Math.abs(targetWeight - lastWeight)
            weeksToTarget = Math.ceil(weightDiff / paceKgPerWeek)
        }

        const direction: 'up' | 'down' | 'stable' =
            change < -0.1 ? 'down' : change > 0.1 ? 'up' : 'stable'

        const isOnTrack = targetWeight ? (
            (wantsToLoseWeight && lastWeight > targetWeight && direction === 'down') ||
            (wantsToGainWeight && lastWeight < targetWeight && direction === 'up')
        ) : null

        const combined = [...loggedPoints, ...projectionPoints]

        return {
            chartData: combined,
            trajectory: {
                direction,
                weeksToTarget,
                isOnTrack,
                targetDiff: targetWeight ? convert(targetWeight - lastWeight) : null
            },
            stats: {
                current: lastWeight ? convert(lastWeight) : null,
                change: convert(change),
                entries: sorted.length
            },
            trendDrivers: drivers,
            lastLoggedDate: lastDateStr
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, targetWeight, isMetric, wantsToGainWeight, wantsToLoseWeight, paceKgPerDay, paceKgPerWeek])

    const yDomain = useMemo(() => {
        const allWeights = chartData
            .filter((p: any) => p.logged || p.projected)
            .map((p: any) => p.logged || p.projected)

        if (targetWeight) allWeights.push(convert(targetWeight))
        if (!allWeights.length) return [60, 90]

        const min = Math.min(...allWeights)
        const max = Math.max(...allWeights)
        const padding = Math.max((max - min) * 0.15, 3)
        return [Math.floor(min - padding), Math.ceil(max + padding)]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartData, targetWeight])

    // AI-powered normalcy message
    const { normalcy, isLoading: normalcyLoading } = useNormalcyMessage(
        entries,
        trajectory?.direction || 'stable',
        goalType,
        targetWeight,
        stats?.current || null,
        weeklyPace,
        trajectory?.weeksToTarget || null
    )

    if (!entries.length) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-surface-700">No weight entries yet</p>
                <p className="text-xs text-surface-400 mt-1">Tap + to add your first weight entry</p>
            </div>
        )
    }

    const paceLabel = paceKgPerWeek === 0.25 ? 'light' : paceKgPerWeek === 0.5 ? 'moderate' : paceKgPerWeek >= 1 ? 'aggressive' : 'custom'

    return (
        <div className="space-y-3">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-2.5 shadow-sm border border-surface-100">
                    <p className="text-[9px] text-surface-500 uppercase tracking-wide">Current</p>
                    <p className="text-base font-bold text-surface-900">
                        {stats?.current?.toFixed(1) || '—'} <span className="text-[10px] font-normal">{unitLabel}</span>
                    </p>
                </div>
                <div className="bg-white rounded-xl p-2.5 shadow-sm border border-surface-100">
                    <p className="text-[9px] text-surface-500 uppercase tracking-wide">Change</p>
                    <p className={cn(
                        "text-base font-bold flex items-center gap-1",
                        trajectory?.isOnTrack ? "text-emerald-600" :
                            trajectory?.isOnTrack === false ? "text-amber-600" : "text-surface-600"
                    )}>
                        {stats?.change && stats.change > 0 ? '+' : ''}{stats?.change?.toFixed(1) || '0'}
                        {trajectory?.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                        {trajectory?.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-2.5 shadow-sm border border-surface-100">
                    <p className="text-[9px] text-surface-500 uppercase tracking-wide">Target</p>
                    <p className="text-base font-bold text-violet-600 flex items-center gap-1">
                        {targetWeight ? convert(targetWeight).toFixed(1) : '—'}
                        <Target className="w-3 h-3" />
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-surface-100 relative">
                {trajectory?.weeksToTarget && (
                    <div className={cn(
                        "absolute top-2 right-2 px-2 py-1 rounded-md text-white shadow z-10",
                        wantsToLoseWeight ? "bg-gradient-to-r from-orange-500 to-emerald-500" :
                            wantsToGainWeight ? "bg-gradient-to-r from-blue-500 to-emerald-500" :
                                "bg-gradient-to-r from-blue-500 to-indigo-500"
                    )}>
                        <p className="text-[8px] opacity-80">Best case</p>
                        <p className="text-sm font-semibold">~{trajectory.weeksToTarget}w</p>
                    </div>
                )}

                <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                            <defs>
                                <linearGradient id="lossGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#F97316" />
                                    <stop offset="100%" stopColor="#22C55E" />
                                </linearGradient>
                                <linearGradient id="gainGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#3B82F6" />
                                    <stop offset="100%" stopColor="#22C55E" />
                                </linearGradient>
                                <linearGradient id="neutralGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#6366F1" />
                                    <stop offset="100%" stopColor="#8B5CF6" />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 8, fill: '#9CA3AF' }}
                                axisLine={{ stroke: '#E5E7EB' }}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={yDomain}
                                tick={{ fontSize: 8, fill: '#9CA3AF' }}
                                axisLine={false}
                                tickLine={false}
                                width={28}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    padding: '4px 8px'
                                }}
                                formatter={(value: any, name: string) => [
                                    `${value?.toFixed(1)} ${unitLabel}`,
                                    name === 'logged' ? 'Logged' : 'Optimal'
                                ]}
                            />

                            {lastLoggedDate && (
                                <ReferenceLine
                                    x={lastLoggedDate}
                                    stroke="#9CA3AF"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    label={{ value: 'Now', position: 'top', fontSize: 8, fill: '#9CA3AF' }}
                                />
                            )}

                            {targetWeight && (
                                <ReferenceLine
                                    y={convert(targetWeight)}
                                    stroke="#8B5CF6"
                                    strokeDasharray="4 3"
                                    strokeWidth={1.5}
                                />
                            )}

                            <Line
                                type="linear"
                                dataKey="projected"
                                stroke={`url(#${getGradientId()})`}
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                connectNulls={true}
                            />

                            <Line
                                type="linear"
                                dataKey="logged"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', r: 3.5, strokeWidth: 1.5, stroke: '#fff' }}
                                activeDot={{ r: 5, fill: '#2563EB' }}
                                connectNulls={true}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-4 mt-1.5 text-[9px] text-surface-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Logged</span>
                    </div>
                    {targetWeight && (
                        <div className="flex items-center gap-1">
                            <div className={cn("w-4 h-0.5 rounded", wantsToLoseWeight ? "bg-gradient-to-r from-orange-500 to-emerald-500" : wantsToGainWeight ? "bg-gradient-to-r from-blue-500 to-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500")} />
                            <span>Optimal</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Consolidated Insight Panel - replaces 4 separate elements */}
            {trajectory && targetWeight && (
                <div className={cn(
                    "rounded-2xl overflow-hidden border dark:border-surface-700",
                    trajectory.isOnTrack
                        ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-800/50 border-surface-200"
                )}>
                    {/* Main Summary Row */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {wantsToGainWeight ? (
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                    </div>
                                ) : wantsToLoseWeight ? (
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                        <TrendingDown className="w-5 h-5 text-emerald-500" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                        <Target className="w-5 h-5 text-violet-500" />
                                    </div>
                                )}
                                <div>
                                    <p className={cn(
                                        "text-lg font-bold",
                                        wantsToGainWeight ? "text-blue-600 dark:text-blue-400" :
                                            wantsToLoseWeight ? "text-emerald-600 dark:text-emerald-400" :
                                                "text-surface-900 dark:text-white"
                                    )}>
                                        {trajectory.targetDiff && trajectory.targetDiff < 0
                                            ? `${Math.abs(trajectory.targetDiff).toFixed(1)} ${unitLabel} to lose`
                                            : `${trajectory.targetDiff?.toFixed(1)} ${unitLabel} to gain`}
                                    </p>
                                    <p className="text-sm text-surface-500 dark:text-surface-400">
                                        ~{trajectory.weeksToTarget} weeks at {paceKgPerWeek} {unitLabel}/week
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress indicator */}
                        {stats && (
                            <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    {stats.entries} {stats.entries === 1 ? 'entry' : 'entries'}
                                </span>
                                <span>•</span>
                                <span>
                                    {trajectory.isOnTrack ? '✓ On track' : 'Keep going!'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex border-t border-surface-200 dark:border-surface-700">
                        <Link
                            href="/adjust-goals"
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors border-r border-surface-200 dark:border-surface-700"
                        >
                            <Info className="w-4 h-4" />
                            Explain
                        </Link>
                        <Link
                            href={`/coach?context=weight_trend&direction=${trajectory.direction}&change=${stats?.change?.toFixed(1) || 0}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Reflect
                        </Link>
                    </div>
                </div>
            )}

            {/* If no target set, prompt to set one */}
            {!targetWeight && (
                <Link
                    href="/settings/goals"
                    className="flex items-center justify-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                    <Target className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Set a target weight for personalized insights</span>
                </Link>
            )}
        </div>
    )
}
