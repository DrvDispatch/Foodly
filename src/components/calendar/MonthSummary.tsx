'use client'

import { TrendingUp, TrendingDown, Flame, Target, AlertTriangle, Award, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DismissibleCard } from '@/components/DismissibleCard'

interface MonthSummaryProps {
    stats?: {
        activeDays: number
        totalDays: number
        missedDays: number
        currentStreak: number
        consistentWeeks: number
    }
    aiInterpretation?: string
    matchingDaysCount?: number
    isFiltered?: boolean
}

export function MonthSummary({
    stats,
    aiInterpretation,
    matchingDaysCount,
    isFiltered
}: MonthSummaryProps) {
    const activeDays = stats?.activeDays || 0
    const totalDays = stats?.totalDays || 30
    const missedDays = stats?.missedDays || 0
    const streak = stats?.currentStreak || 0

    // Calculate tracking rate
    const trackingRate = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0

    // Generate insights based on data
    const insights: { id: string; icon: React.ReactNode; text: string; type: 'success' | 'warning' | 'info' }[] = []

    if (streak >= 7) {
        insights.push({
            id: `streak-${streak}-amazing`,
            icon: <Flame className="w-4 h-4" />,
            text: `Amazing! ${streak}-day streak going strong 🔥`,
            type: 'success'
        })
    } else if (streak >= 3) {
        insights.push({
            id: `streak-${streak}-good`,
            icon: <Flame className="w-4 h-4" />,
            text: `${streak} day streak - keep it up!`,
            type: 'success'
        })
    } else if (streak === 0 && activeDays > 0) {
        insights.push({
            id: 'no-streak',
            icon: <Target className="w-4 h-4" />,
            text: `Log today's meals to start a new streak!`,
            type: 'info'
        })
    }

    if (trackingRate >= 80) {
        insights.push({
            id: `tracking-${trackingRate}-excellent`,
            icon: <Award className="w-4 h-4" />,
            text: `Excellent! ${trackingRate}% tracking rate this month`,
            type: 'success'
        })
    } else if (trackingRate >= 50) {
        insights.push({
            id: `tracking-${trackingRate}-good`,
            icon: <TrendingUp className="w-4 h-4" />,
            text: `${trackingRate}% tracking rate - good progress!`,
            type: 'info'
        })
    } else if (activeDays >= 1) {
        insights.push({
            id: `missed-${missedDays}`,
            icon: <AlertTriangle className="w-4 h-4" />,
            text: `${missedDays} days without logs. Try to log consistently!`,
            type: 'warning'
        })
    }

    if (insights.length === 0 && activeDays === 0) {
        insights.push({
            id: 'get-started',
            icon: <Zap className="w-4 h-4" />,
            text: 'Start logging meals to see your progress here!',
            type: 'info'
        })
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden">
            {/* AI Filter Results Banner */}
            {isFiltered && aiInterpretation && (
                <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Zap className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-purple-900">AI Filter Result</p>
                            <p className="text-sm text-purple-700 mt-0.5">{aiInterpretation}</p>
                            <p className="text-xs text-purple-500 mt-1">
                                {matchingDaysCount === 0
                                    ? 'No matching days found'
                                    : `${matchingDaysCount} day${matchingDaysCount === 1 ? '' : 's'} highlighted`
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Month Insights */}
            <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    {isFiltered ? 'Filter Active' : 'This Month'}
                </h3>

                {insights.map((insight) => (
                    <DismissibleCard
                        key={insight.id}
                        id={`calendar-insight-${insight.id}`}
                        className="group"
                    >
                        <div
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-xl",
                                insight.type === 'success' && "bg-gradient-to-r from-green-50 to-emerald-50",
                                insight.type === 'warning' && "bg-gradient-to-r from-amber-50 to-yellow-50",
                                insight.type === 'info' && "bg-gradient-to-r from-blue-50 to-sky-50"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-lg",
                                insight.type === 'success' && "bg-green-100 text-green-600",
                                insight.type === 'warning' && "bg-amber-100 text-amber-600",
                                insight.type === 'info' && "bg-blue-100 text-blue-600"
                            )}>
                                {insight.icon}
                            </div>
                            <p className={cn(
                                "text-sm flex-1",
                                insight.type === 'success' && "text-green-800",
                                insight.type === 'warning' && "text-amber-800",
                                insight.type === 'info' && "text-blue-800"
                            )}>
                                {insight.text}
                            </p>
                        </div>
                    </DismissibleCard>
                ))}

                {/* Quick Stats Grid */}
                {!isFiltered && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 bg-surface-50 rounded-xl">
                            <p className="text-lg font-bold text-primary-600">{activeDays}</p>
                            <p className="text-[10px] text-surface-500 uppercase">Days Logged</p>
                        </div>
                        <div className="text-center p-2 bg-surface-50 rounded-xl">
                            <p className="text-lg font-bold text-orange-500">{streak}</p>
                            <p className="text-[10px] text-surface-500 uppercase">Current Streak</p>
                        </div>
                        <div className="text-center p-2 bg-surface-50 rounded-xl">
                            <p className="text-lg font-bold text-surface-400">{missedDays}</p>
                            <p className="text-[10px] text-surface-500 uppercase">Missed</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 bg-surface-50 border-t border-surface-100">
                <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-2">Color Legend</p>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-surface-600">Excellent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-lime-400" />
                        <span className="text-[10px] text-surface-600">Good</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-[10px] text-surface-600">Off Target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                        <span className="text-[10px] text-surface-600">Poor</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-surface-300" />
                        <span className="text-[10px] text-surface-600">Untracked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="text-[10px] text-surface-600">AI Match</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
