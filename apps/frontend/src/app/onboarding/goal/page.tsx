'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, TrendingDown, TrendingUp, Minus, ArrowRight, Zap, RefreshCw, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PrimaryGoal, PRIMARY_GOAL_LABELS } from '@/lib/insights'

// Extended goals with new primary goal types
const goals = [
    {
        id: 'fat_loss' as PrimaryGoal,
        title: 'Fat Loss',
        description: 'Lose body fat while preserving muscle',
        icon: TrendingDown,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-500',
        calorieAdjust: '-20%',
    },
    {
        id: 'maintenance' as PrimaryGoal,
        title: 'Maintenance',
        description: 'Maintain current weight and body composition',
        icon: Minus,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-500',
        calorieAdjust: '0%',
    },
    {
        id: 'muscle_gain' as PrimaryGoal,
        title: 'Muscle Gain',
        description: 'Build muscle with a calorie surplus',
        icon: TrendingUp,
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-500',
        calorieAdjust: '+15%',
    },
    {
        id: 'strength' as PrimaryGoal,
        title: 'Strength & Performance',
        description: 'Optimize for lifting and athletic output',
        icon: Zap,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-500',
        calorieAdjust: '+10%',
    },
    {
        id: 'recomp' as PrimaryGoal,
        title: 'Recomposition',
        description: 'Slowly lose fat while building muscle',
        icon: RefreshCw,
        color: 'text-teal-500',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        borderColor: 'border-teal-500',
        calorieAdjust: '-5%',
    },
    {
        id: 'health' as PrimaryGoal,
        title: 'General Health',
        description: 'Focus on overall wellness and nutrition quality',
        icon: Heart,
        color: 'text-pink-500',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        borderColor: 'border-pink-500',
        calorieAdjust: '0%',
    },
]

export default function GoalSelectionPage() {
    const router = useRouter()
    const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal | null>(null)

    const handleContinue = () => {
        if (selectedGoal) {
            // Store in sessionStorage for now, will save to DB at the end
            sessionStorage.setItem('onboarding_goal', selectedGoal)
            router.push('/onboarding/focus')
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 animate-fade-in">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 justify-center">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                    <div
                        key={step}
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            step === 1 ? "w-8 bg-primary-500" : "w-2 bg-surface-200"
                        )}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-2">
                    <Target className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">What&apos;s your primary goal?</h1>
                <p className="text-surface-500">This determines your calorie and macro targets</p>
            </div>

            {/* Goal Options */}
            <div className="space-y-3">
                {goals.map((goal) => {
                    const Icon = goal.icon
                    const isSelected = selectedGoal === goal.id

                    return (
                        <button
                            key={goal.id}
                            onClick={() => setSelectedGoal(goal.id)}
                            className={cn(
                                "w-full p-4 rounded-2xl border-2 text-left transition-all duration-200",
                                "hover:shadow-soft bg-white dark:bg-surface-800",
                                isSelected
                                    ? `${goal.borderColor} ring-2 ring-primary-400 ring-offset-2 ring-offset-surface-50 dark:ring-offset-surface-900`
                                    : "border-surface-200 dark:border-surface-700"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn("p-3 rounded-xl", goal.bg)}>
                                    <Icon className={cn("w-6 h-6", goal.color)} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-surface-900">{goal.title}</h3>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-medium",
                                            goal.calorieAdjust.startsWith('-')
                                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                : goal.calorieAdjust.startsWith('+')
                                                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                        )}>
                                            {goal.calorieAdjust} cal
                                        </span>
                                    </div>
                                    <p className="text-sm text-surface-500 mt-0.5">{goal.description}</p>
                                </div>
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        isSelected
                                            ? `${goal.borderColor} bg-primary-500`
                                            : "border-surface-300"
                                    )}
                                >
                                    {isSelected && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Continue Button */}
            <button
                onClick={handleContinue}
                disabled={!selectedGoal}
                className={cn(
                    "btn-primary w-full",
                    !selectedGoal && "opacity-50 cursor-not-allowed"
                )}
            >
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
            </button>
        </div>
    )
}
