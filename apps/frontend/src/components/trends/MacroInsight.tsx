'use client'

import { useMemo } from 'react'
import {
    Flame,
    Dumbbell,
    Wheat,
    Droplet,
    TrendingUp,
    TrendingDown,
    Minus,
    Zap,
    Moon,
    Sun,
    Target,
    Award,
    AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendDataPoint {
    date: string
    calories: number
    protein: number
    carbs: number
    fat: number
    mealCount: number
}

interface MacroInsightProps {
    metric: 'calories' | 'protein' | 'carbs' | 'fat'
    stats: {
        mean: number
        stdDev: number
        consistencyScore: number
        trend: 'up' | 'down' | 'stable'
    }
    goal: number
    dataPoints: TrendDataPoint[]
}

// Unique insights per macro
export function MacroInsight({ metric, stats, goal, dataPoints }: MacroInsightProps) {
    const insights = useMemo(() => {
        // Get values for the specific metric
        const getValue = (p: TrendDataPoint) => p[metric]
        const validPoints = dataPoints.filter(p => getValue(p) > 0)
        if (validPoints.length < 3) return null

        // Common calculations
        const weekdayPoints = validPoints.filter(p => {
            const day = new Date(p.date).getDay()
            return day !== 0 && day !== 6
        })
        const weekendPoints = validPoints.filter(p => {
            const day = new Date(p.date).getDay()
            return day === 0 || day === 6
        })

        const weekdayAvg = weekdayPoints.length > 0
            ? weekdayPoints.reduce((sum, p) => sum + getValue(p), 0) / weekdayPoints.length
            : 0
        const weekendAvg = weekendPoints.length > 0
            ? weekendPoints.reduce((sum, p) => sum + getValue(p), 0) / weekendPoints.length
            : 0

        // Days hit goal
        const daysOnTarget = validPoints.filter(p => {
            const val = getValue(p)
            if (metric === 'calories') {
                return Math.abs(val - goal) <= goal * 0.1 // Within 10%
            }
            return val >= goal * 0.9 // Hit 90%+ of target
        }).length
        const hitRate = Math.round((daysOnTarget / validPoints.length) * 100)

        // Best and worst days
        const sortedPoints = [...validPoints].sort((a, b) => getValue(b) - getValue(a))
        const bestDay = sortedPoints[0]
        const worstDay = sortedPoints[sortedPoints.length - 1]

        // Trend analysis
        const recentHalf = validPoints.slice(-Math.ceil(validPoints.length / 2))
        const olderHalf = validPoints.slice(0, Math.floor(validPoints.length / 2))
        const recentAvg = recentHalf.reduce((sum, p) => sum + getValue(p), 0) / recentHalf.length
        const olderAvg = olderHalf.length > 0
            ? olderHalf.reduce((sum, p) => sum + getValue(p), 0) / olderHalf.length
            : recentAvg

        const trendChange = recentAvg - olderAvg
        const trendPercent = olderAvg > 0 ? Math.round((trendChange / olderAvg) * 100) : 0

        return {
            weekdayAvg,
            weekendAvg,
            hitRate,
            daysOnTarget,
            totalDays: validPoints.length,
            bestDay,
            worstDay,
            recentAvg,
            trendChange,
            trendPercent,
            mean: stats.mean,
            goal,
        }
    }, [metric, stats, goal, dataPoints])

    if (!insights) {
        return (
            <div className="bg-surface-50 rounded-2xl p-4 text-center text-surface-500">
                <p className="text-sm">Need more data for insights</p>
            </div>
        )
    }

    // Render different insights based on metric
    switch (metric) {
        case 'calories':
            return <CalorieInsight {...insights} />
        case 'protein':
            return <ProteinInsight {...insights} />
        case 'carbs':
            return <CarbInsight {...insights} />
        case 'fat':
            return <FatInsight {...insights} />
        default:
            return null
    }
}

// 🔥 CALORIES: Energy balance focus
function CalorieInsight(props: ReturnType<typeof useMemo> & Record<string, any>) {
    const { hitRate, mean, goal, weekdayAvg, weekendAvg, trendPercent } = props
    const diff = mean - goal
    const isDeficit = diff < 0
    const weekendDiff = weekendAvg - weekdayAvg

    return (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100">
            <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-surface-900">Energy Balance</h3>
            </div>

            {/* Main Story */}
            <p className="text-surface-700 leading-relaxed mb-4">
                You&apos;re averaging <span className="font-semibold text-orange-600">{Math.round(mean).toLocaleString()} kcal</span> daily,
                which is <span className={cn("font-semibold", isDeficit ? "text-emerald-600" : "text-amber-600")}>
                    {Math.abs(Math.round(diff)).toLocaleString()} kcal {isDeficit ? 'below' : 'above'}
                </span> your {goal.toLocaleString()} target.
                {hitRate >= 70
                    ? " You&apos;re hitting your target most days—great consistency!"
                    : hitRate >= 40
                        ? " Some room to improve consistency."
                        : " Focus on more consistent daily intake."}
            </p>

            {/* Weekend Pattern */}
            <div className="flex items-center gap-4 p-3 bg-white/60 rounded-xl">
                <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-surface-500">Weekdays</span>
                    <span className="text-sm font-semibold">{Math.round(weekdayAvg).toLocaleString()}</span>
                </div>
                <div className="flex-1 h-px bg-surface-200" />
                <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs text-surface-500">Weekends</span>
                    <span className="text-sm font-semibold">{Math.round(weekendAvg).toLocaleString()}</span>
                </div>
            </div>
            {Math.abs(weekendDiff) > 200 && (
                <p className="text-xs text-surface-500 mt-2 text-center">
                    {weekendDiff > 0
                        ? `📈 Weekends run ${Math.round(weekendDiff)} kcal higher`
                        : `📉 Weekends run ${Math.abs(Math.round(weekendDiff))} kcal lower`}
                </p>
            )}
        </div>
    )
}

// 💪 PROTEIN: Muscle preservation focus
function ProteinInsight(props: ReturnType<typeof useMemo> & Record<string, any>) {
    const { hitRate, mean, goal, daysOnTarget, totalDays, trendPercent } = props
    const proteinPerMeal = mean / 4 // Assuming 4 meals
    const isHitting = mean >= goal * 0.9

    // Calculate streak
    const streakText = hitRate >= 80
        ? "You're crushing it! Muscle fuel on point."
        : hitRate >= 50
            ? "Good effort, aim for more protein-rich meals."
            : "Protein is key for results—let's boost this!"

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-surface-900">Muscle Fuel Score</h3>
            </div>

            {/* Main Story */}
            <p className="text-surface-700 leading-relaxed mb-4">
                Averaging <span className="font-semibold text-blue-600">{Math.round(mean)}g</span> protein daily—that&apos;s
                <span className={cn("font-semibold", isHitting ? "text-emerald-600" : "text-amber-600")}>
                    {isHitting ? " on target " : ` ${Math.round(goal - mean)}g short `}
                </span>
                of your {goal}g goal. {streakText}
            </p>

            {/* Visual Score */}
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                <div className="flex-1">
                    <div className="flex justify-between text-xs text-surface-500 mb-1">
                        <span>Target Hit Rate</span>
                        <span className="font-semibold text-surface-700">{hitRate}%</span>
                    </div>
                    <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                hitRate >= 70 ? "bg-emerald-500" : hitRate >= 40 ? "bg-amber-500" : "bg-red-400"
                            )}
                            style={{ width: `${Math.min(hitRate, 100)}%` }}
                        />
                    </div>
                </div>
                <Award className={cn(
                    "w-8 h-8",
                    hitRate >= 70 ? "text-emerald-500" : hitRate >= 40 ? "text-amber-500" : "text-surface-300"
                )} />
            </div>

            <p className="text-xs text-surface-500 mt-3 text-center">
                💡 Aim for ~{Math.round(proteinPerMeal)}g per meal to stay on track
            </p>
        </div>
    )
}

// 🌾 CARBS: Energy timing focus
function CarbInsight(props: ReturnType<typeof useMemo> & Record<string, any>) {
    const { mean, goal, weekdayAvg, weekendAvg, trendPercent } = props
    const diff = mean - goal
    const isLow = diff < -20
    const isHigh = diff > 20

    return (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-4">
                <Wheat className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-surface-900">Energy Source</h3>
            </div>

            {/* Main Story */}
            <p className="text-surface-700 leading-relaxed mb-4">
                Your carb intake averages <span className="font-semibold text-amber-600">{Math.round(mean)}g</span> daily.
                {isLow
                    ? " Running a bit low—may affect energy and workout performance."
                    : isHigh
                        ? " Slightly above target—consider timing carbs around workouts."
                        : " Right in the sweet spot for sustained energy!"}
            </p>

            {/* Energy Tip */}
            <div className="p-3 bg-white/60 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-surface-700">Energy Tip</span>
                </div>
                <p className="text-xs text-surface-600">
                    {isLow
                        ? "Add complex carbs (oats, rice, sweet potato) around training for better energy."
                        : isHigh
                            ? "Focus carbs in the 2 hours before/after workouts for optimal use."
                            : "Great balance! Keep timing carbs around your most active times."}
                </p>
            </div>

            {trendPercent !== 0 && (
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-surface-500">
                    {trendPercent > 0 ? (
                        <TrendingUp className="w-3 h-3 text-amber-500" />
                    ) : (
                        <TrendingDown className="w-3 h-3 text-blue-500" />
                    )}
                    <span>Trending {Math.abs(trendPercent)}% {trendPercent > 0 ? 'up' : 'down'} recently</span>
                </div>
            )}
        </div>
    )
}

// 🥑 FAT: Hormones & satiety focus  
function FatInsight(props: ReturnType<typeof useMemo> & Record<string, any>) {
    const { mean, goal, hitRate, trendPercent } = props
    const diff = mean - goal
    const percentOfGoal = Math.round((mean / goal) * 100)
    const isLow = percentOfGoal < 70
    const isHigh = percentOfGoal > 130

    return (
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100">
            <div className="flex items-center gap-2 mb-4">
                <Droplet className="w-5 h-5 text-rose-500" />
                <h3 className="font-semibold text-surface-900">Healthy Fats</h3>
            </div>

            {/* Main Story */}
            <p className="text-surface-700 leading-relaxed mb-4">
                Averaging <span className="font-semibold text-rose-600">{Math.round(mean)}g</span> fat
                ({percentOfGoal}% of {goal}g target).
                {isLow
                    ? " Low fat can impact hormones and satiety—consider adding healthy fats."
                    : isHigh
                        ? " Running high—watch portions of oils, nuts, and fatty foods."
                        : " Great range for hormone balance and feeling full!"}
            </p>

            {/* Fat Quality Reminder */}
            <div className="p-3 bg-white/60 rounded-xl">
                <p className="text-xs text-surface-600 leading-relaxed">
                    <span className="font-semibold text-surface-700">Quality matters:</span> Focus on
                    {isLow
                        ? " avocado, olive oil, nuts, and fatty fish to boost intake healthily."
                        : " omega-3 sources (salmon, walnuts) over saturated fats."}
                </p>
            </div>

            {/* Warning if too low */}
            {isLow && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs text-amber-700">Very low fat affects vitamin absorption</p>
                </div>
            )}
        </div>
    )
}
