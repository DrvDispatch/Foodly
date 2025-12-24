'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Target, TrendingUp, TrendingDown, Flame, Zap,
    Check, ChevronRight, Sparkles, Calendar, Heart,
    Dumbbell, Scale, RefreshCw, Activity
} from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { apiFetcher } from '@/lib/api-client'

// Types
interface GoalDashboardProps {
    summary: { calories: number; protein: number; carbs: number; fat: number }
    goals: { calories: number; protein: number; carbs: number; fat: number }
    profile?: {
        goalType?: string
        secondaryFocus?: string[]
        targetWeight?: number
        currentWeight?: number
    }
    className?: string
}

interface WeeklyData {
    daysInDeficit?: number
    daysHitProtein?: number
    daysLogged?: number
    averageCalories?: number
    streak?: number
}

interface WeightData {
    entries?: { weight: number; date: string }[]
    trend?: { weeklyChange?: number }
    startingWeight?: number
}

// Goal type configurations
const GOAL_CONFIG: Record<string, {
    label: string;
    icon: any;
    color: string;
    bg: string;
    metrics: string[]
}> = {
    fat_loss: {
        label: 'Fat Loss',
        icon: Flame,
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950',
        metrics: ['deficit', 'protein', 'consistency']
    },
    muscle_gain: {
        label: 'Muscle Gain',
        icon: Dumbbell,
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950',
        metrics: ['surplus', 'protein', 'consistency']
    },
    maintenance: {
        label: 'Maintenance',
        icon: Scale,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950',
        metrics: ['balance', 'protein', 'consistency']
    },
    recomp: {
        label: 'Recomposition',
        icon: RefreshCw,
        color: 'text-teal-500',
        bg: 'bg-teal-50 dark:bg-teal-950',
        metrics: ['protein', 'balance', 'consistency']
    },
    strength: {
        label: 'Strength',
        icon: Zap,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950',
        metrics: ['protein', 'calories', 'consistency']
    },
    health: {
        label: 'General Health',
        icon: Heart,
        color: 'text-pink-500',
        bg: 'bg-pink-50 dark:bg-pink-950',
        metrics: ['balance', 'variety', 'consistency']
    }
}

// Secondary focus labels
const FOCUS_LABELS: Record<string, { label: string; emoji: string }> = {
    vegan: { label: 'Plant-Based', emoji: '🌱' },
    vegetarian: { label: 'Vegetarian', emoji: '🥗' },
    strength_lifting: { label: 'Strength', emoji: '🏋️' },
    endurance: { label: 'Endurance', emoji: '🏃' },
    longevity: { label: 'Longevity', emoji: '🧬' },
    satiety: { label: 'Satiety', emoji: '😌' },
    aesthetic: { label: 'Aesthetic', emoji: '💪' },
    metabolic_health: { label: 'Metabolic', emoji: '❤️' }
}

export function GoalDashboard({ summary, goals, profile, className }: GoalDashboardProps) {
    const router = useRouter()

    // Fetch weekly habits data for streak and weekly check-in
    const { data: habitsData } = useSWR<{
        activeDays?: number
        avgDaysPerWeek?: number
        heatmap?: { date: string; logged: boolean }[]
    }>('/habits/summary', apiFetcher, { revalidateOnFocus: false })

    // Fetch weight data for goal progress
    const { data: weightData } = useSWR<WeightData>('/weight', apiFetcher, { revalidateOnFocus: false })

    const goalType = profile?.goalType || 'maintenance'
    const goalConfig = GOAL_CONFIG[goalType] || GOAL_CONFIG.maintenance
    const GoalIcon = goalConfig.icon

    // Calculate daily progress
    const caloriesRemaining = Math.max(0, goals.calories - summary.calories)
    const proteinRemaining = Math.max(0, goals.protein - summary.protein)
    const caloriePercent = Math.min(Math.round((summary.calories / goals.calories) * 100), 150)
    const proteinPercent = Math.min(Math.round((summary.protein / goals.protein) * 100), 150)

    // Calculate streak from heatmap
    const streak = useMemo(() => {
        if (!habitsData?.heatmap) return 0
        let count = 0
        const sorted = [...habitsData.heatmap].reverse()
        for (const day of sorted) {
            if (day.logged) count++
            else break
        }
        return count
    }, [habitsData?.heatmap])

    // Calculate weekly stats
    const weeklyStats = useMemo(() => {
        if (!habitsData?.heatmap) return { daysLogged: 0, total: 7 }
        const last7 = habitsData.heatmap.slice(-7)
        const daysLogged = last7.filter(d => d.logged).length
        return { daysLogged, total: 7 }
    }, [habitsData?.heatmap])

    // Weight progress
    const weightProgress = useMemo(() => {
        if (!weightData?.entries?.length) return null
        const current = weightData.entries[0]?.weight
        const starting = weightData.startingWeight || weightData.entries[weightData.entries.length - 1]?.weight
        const target = profile?.targetWeight

        if (!current || !starting) return null

        const change = current - starting
        const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'stable'

        let progressPercent = 0
        if (target && starting !== target) {
            progressPercent = Math.min(100, Math.max(0,
                Math.abs(current - starting) / Math.abs(target - starting) * 100
            ))
        }

        return { current, starting, target, change, direction, progressPercent }
    }, [weightData, profile?.targetWeight])

    // Generate today's focus message
    const todaysFocus = useMemo(() => {
        const messages: string[] = []

        // All goals met
        if (caloriePercent >= 95 && proteinPercent >= 95) {
            return { message: "You've hit your targets today! Great work.", type: 'success' as const }
        }

        // Protein priority
        if (proteinPercent < 70 && caloriePercent > 50) {
            messages.push(`Protein is at ${Math.round(summary.protein)}g — prioritize protein in your next meal`)
        }

        // Calorie guidance based on goal
        if (goalType === 'fat_loss' && caloriesRemaining > 0) {
            messages.push(`${caloriesRemaining} cal remaining — on track for your deficit`)
        } else if (goalType === 'muscle_gain' && caloriePercent < 80) {
            messages.push(`${caloriesRemaining} cal to hit your surplus target`)
        }

        // Default message
        if (messages.length === 0) {
            if (caloriesRemaining > 500) {
                messages.push(`${caloriesRemaining} cal remaining for today`)
            } else {
                messages.push('Making good progress toward your daily targets')
            }
        }

        return { message: messages[0], type: 'info' as const }
    }, [summary, goalType, caloriePercent, proteinPercent, caloriesRemaining])

    // Secondary focus insight
    const secondaryInsight = useMemo(() => {
        const focuses = profile?.secondaryFocus || []
        if (focuses.length === 0) return null

        const focus = focuses[0]
        const focusConfig = FOCUS_LABELS[focus]
        if (!focusConfig) return null

        // Generate insight based on focus
        let insight = ''
        if (focus === 'strength_lifting' || focus === 'aesthetic') {
            insight = proteinPercent >= 90
                ? `${Math.round(summary.protein)}g protein — excellent for recovery`
                : `Focus on protein to support your training`
        } else if (focus === 'satiety') {
            insight = proteinPercent >= 80 && summary.calories < goals.calories * 0.9
                ? 'High protein ratio — good for feeling full'
                : 'Add fiber-rich foods for satiety'
        } else {
            insight = `Tracking toward your ${focusConfig.label.toLowerCase()} focus`
        }

        return { ...focusConfig, insight }
    }, [profile?.secondaryFocus, summary, goals, proteinPercent])

    // Today's priorities (replacing XP wins)
    const priorities = useMemo(() => {
        const items: { id: string; label: string; completed: boolean }[] = []

        // Log a meal
        items.push({
            id: 'log_meal',
            label: 'Log your meals',
            completed: summary.calories > 0
        })

        // Hit protein target
        items.push({
            id: 'protein',
            label: `Hit ${goals.protein}g protein`,
            completed: proteinPercent >= 95
        })

        // Stay on target (goal-specific)
        if (goalType === 'fat_loss') {
            items.push({
                id: 'deficit',
                label: 'Stay in calorie deficit',
                completed: summary.calories <= goals.calories && summary.calories > goals.calories * 0.7
            })
        } else if (goalType === 'muscle_gain') {
            items.push({
                id: 'surplus',
                label: 'Reach calorie target',
                completed: caloriePercent >= 95
            })
        } else {
            items.push({
                id: 'balance',
                label: 'Balance your macros',
                completed: caloriePercent >= 85 && caloriePercent <= 110 && proteinPercent >= 85
            })
        }

        return items
    }, [summary, goals, goalType, caloriePercent, proteinPercent])

    const completedCount = priorities.filter(p => p.completed).length

    return (
        <div className={cn("space-y-4", className)}>
            {/* 1. Goal Progress Widget */}
            <div className={cn(
                "rounded-2xl p-4 border",
                goalConfig.bg,
                "border-surface-200 dark:border-surface-700"
            )}>
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        "bg-white dark:bg-surface-800 shadow-sm"
                    )}>
                        <GoalIcon className={cn("w-5 h-5", goalConfig.color)} />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-surface-900">{goalConfig.label}</p>
                        <p className="text-xs text-surface-500">Your primary goal</p>
                    </div>
                    {streak > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-surface-800 rounded-full">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{streak}d</span>
                        </div>
                    )}
                </div>

                {/* Weight Progress (if tracking weight) */}
                {weightProgress && profile?.targetWeight && (
                    <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-surface-500">Progress to target</span>
                            <span className="font-medium text-surface-700 dark:text-surface-300">
                                {weightProgress.current?.toFixed(1)} → {profile.targetWeight}kg
                            </span>
                        </div>
                        <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all", goalConfig.color.replace('text-', 'bg-'))}
                                style={{ width: `${weightProgress.progressPercent}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-surface-400 mt-1">
                            {weightProgress.change > 0 ? '+' : ''}{weightProgress.change.toFixed(1)}kg from start
                        </p>
                    </div>
                )}
            </div>

            {/* 2. Today's Focus Card */}
            <div className={cn(
                "rounded-xl p-3 flex items-start gap-3",
                todaysFocus.type === 'success'
                    ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800"
                    : "bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
            )}>
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    todaysFocus.type === 'success'
                        ? "bg-emerald-100 dark:bg-emerald-900"
                        : "bg-primary-100 dark:bg-primary-900"
                )}>
                    {todaysFocus.type === 'success'
                        ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        : <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-0.5">
                        Today&apos;s Focus
                    </p>
                    <p className={cn(
                        "text-sm",
                        todaysFocus.type === 'success'
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-surface-700 dark:text-surface-300"
                    )}>
                        {todaysFocus.message}
                    </p>
                </div>
            </div>

            {/* 3. Weekly Goal Check-In */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-3 border border-surface-200 dark:border-surface-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                        This Week
                    </span>
                    <button
                        onClick={() => router.push('/habits')}
                        className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-0.5"
                    >
                        Details <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="flex gap-4">
                    {/* Days logged */}
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className="w-3.5 h-3.5 text-surface-400" />
                            <span className="text-xs text-surface-500">Logged</span>
                        </div>
                        <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
                            {weeklyStats.daysLogged}<span className="text-sm font-normal text-surface-400">/{weeklyStats.total}</span>
                        </p>
                    </div>

                    {/* Weekly dots */}
                    <div className="flex gap-1 items-center">
                        {habitsData?.heatmap?.slice(-7).map((day, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-3 h-3 rounded-full",
                                    day.logged
                                        ? "bg-emerald-400 dark:bg-emerald-500"
                                        : "bg-surface-200 dark:bg-surface-600"
                                )}
                            />
                        )) || Array(7).fill(0).map((_, i) => (
                            <div key={i} className="w-3 h-3 rounded-full bg-surface-200 dark:bg-surface-600" />
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Secondary Focus Spotlight (if user has secondary focuses) */}
            {secondaryInsight && (
                <div className="bg-white dark:bg-surface-800 rounded-xl p-3 border border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{secondaryInsight.emoji}</span>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                                {secondaryInsight.label} Focus
                            </p>
                            <p className="text-sm text-surface-700 dark:text-surface-300">
                                {secondaryInsight.insight}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Hybrid: Today's Priorities (replacing XP wins) */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-3 border border-surface-200 dark:border-surface-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                        Today&apos;s Priorities
                    </span>
                    <span className="text-xs text-surface-400">
                        {completedCount}/{priorities.length}
                    </span>
                </div>

                <div className="space-y-1.5">
                    {priorities.map(priority => (
                        <div
                            key={priority.id}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                                priority.completed
                                    ? "bg-emerald-50 dark:bg-emerald-950"
                                    : "bg-surface-50 dark:bg-surface-900"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center",
                                priority.completed
                                    ? "bg-emerald-500 text-white"
                                    : "border-2 border-surface-300 dark:border-surface-600"
                            )}>
                                {priority.completed && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className={cn(
                                "text-sm",
                                priority.completed
                                    ? "text-surface-700 dark:text-surface-300"
                                    : "text-surface-500 dark:text-surface-400"
                            )}>
                                {priority.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
