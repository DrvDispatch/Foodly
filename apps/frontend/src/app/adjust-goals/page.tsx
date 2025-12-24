'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
    ChevronLeft,
    ChevronRight,
    Target,
    TrendingUp,
    TrendingDown,
    Sparkles,
    Check,
    Scale,
    Flame,
    Dumbbell,
    ArrowRight,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface GoalRecommendation {
    journey: {
        startingWeight: number
        currentWeight: number
        targetWeight: number
        weightChange: number
        daysOnPlan: number
        originalGoal: string
    }
    recommendation: {
        shouldAdjust: boolean
        suggestedGoal: string
        reason: string
        newCalories: number
        newProtein: number
        newCarbs: number
        newFat: number
        estimatedWeeksToGoal: number
    }
    aiExplanation: string
}

const goalLabels: Record<string, string> = {
    lose: 'Fat Loss',
    fat_loss: 'Fat Loss',
    gain: 'Muscle Gain',
    muscle_gain: 'Muscle Gain',
    recomp: 'Body Recomp',
    maintain: 'Maintenance',
    maintenance: 'Maintenance',
    health: 'General Health',
}

const goalIcons: Record<string, React.ElementType> = {
    lose: TrendingDown,
    fat_loss: TrendingDown,
    gain: Dumbbell,
    muscle_gain: Dumbbell,
    recomp: Flame,
    maintain: Scale,
    maintenance: Scale,
    health: Target,
}

export default function AdjustGoalsPage() {
    const router = useRouter()
    const { status } = useSession()
    const [step, setStep] = useState(1)
    const [data, setData] = useState<GoalRecommendation | null>(null)
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (status === 'authenticated') {
            fetchRecommendation()
        }
    }, [status])

    const fetchRecommendation = async () => {
        try {
            const result = await apiClient.get<GoalRecommendation>('/goals/recommendation')
            setData(result)
        } catch (err) {
            setError('Failed to load recommendation')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = async () => {
        if (!data) return
        setApplying(true)
        try {
            await apiClient.post('/goals/apply', {
                newGoal: data.recommendation.suggestedGoal,
                newCalories: data.recommendation.newCalories,
                newProtein: data.recommendation.newProtein,
                newCarbs: data.recommendation.newCarbs,
                newFat: data.recommendation.newFat,
            })
            setStep(3)
        } catch (err) {
            setError('Failed to apply changes')
            console.error(err)
        } finally {
            setApplying(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-surface-900 via-surface-850 to-surface-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-surface-400">Loading your journey...</p>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-surface-900 via-surface-850 to-surface-900 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
                    <p className="text-surface-400 mb-6">{error || 'Unable to load recommendation'}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl bg-surface-700 text-white font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    const { journey, recommendation, aiExplanation } = data
    const OriginalIcon = goalIcons[journey.originalGoal] || Target
    const SuggestedIcon = goalIcons[recommendation.suggestedGoal] || Target

    return (
        <div className="min-h-screen bg-gradient-to-b from-surface-900 via-surface-850 to-surface-900">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-surface-900/80 backdrop-blur-xl border-b border-surface-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : router.back()}
                        className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm font-medium text-white">Goal Advisor</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Progress indicator */}
                <div className="flex gap-2 px-6 pb-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 h-1 rounded-full transition-colors",
                                i <= step ? "bg-emerald-500" : "bg-surface-700"
                            )}
                        />
                    ))}
                </div>
            </header>

            <main className="px-5 pb-32">
                {/* Step 1: Journey Summary */}
                {step === 1 && (
                    <div className="animate-fadeIn">
                        <div className="text-center pt-8 mb-8">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                <Scale className="w-10 h-10 text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Your Journey So Far</h1>
                            <p className="text-surface-400">Let&apos;s review your progress</p>
                        </div>

                        {/* Journey Stats */}
                        <div className="space-y-4 mb-8">
                            {/* Weight Progress Card */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-850 border border-surface-700">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-center flex-1">
                                        <p className="text-xs text-surface-400 mb-1">Started</p>
                                        <p className="text-2xl font-bold text-white">{journey.startingWeight}</p>
                                        <p className="text-xs text-surface-500">kg</p>
                                    </div>
                                    <div className="flex flex-col items-center px-4">
                                        <ArrowRight className="w-5 h-5 text-surface-500 mb-1" />
                                        <span className={cn(
                                            "text-xs font-medium px-2 py-0.5 rounded-full",
                                            journey.weightChange > 0
                                                ? "bg-amber-500/20 text-amber-400"
                                                : "bg-emerald-500/20 text-emerald-400"
                                        )}>
                                            {journey.weightChange > 0 ? '+' : ''}{journey.weightChange.toFixed(1)}kg
                                        </span>
                                    </div>
                                    <div className="text-center flex-1">
                                        <p className="text-xs text-surface-400 mb-1">Now</p>
                                        <p className="text-2xl font-bold text-white">{journey.currentWeight}</p>
                                        <p className="text-xs text-surface-500">kg</p>
                                    </div>
                                </div>

                                {/* Target Line */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/50">
                                    <Target className="w-5 h-5 text-emerald-400" />
                                    <div className="flex-1">
                                        <p className="text-sm text-white">Target: {journey.targetWeight}kg</p>
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium px-2 py-1 rounded-lg",
                                        Math.abs(journey.currentWeight - journey.targetWeight) < 1
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : journey.currentWeight > journey.targetWeight
                                                ? "bg-amber-500/20 text-amber-400"
                                                : "bg-blue-500/20 text-blue-400"
                                    )}>
                                        {Math.abs(journey.currentWeight - journey.targetWeight).toFixed(1)}kg {
                                            journey.currentWeight > journey.targetWeight ? 'over' : 'to go'
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Original Goal */}
                            <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <OriginalIcon className="w-6 h-6 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-surface-400">Your Goal</p>
                                    <p className="text-lg font-semibold text-white">
                                        {goalLabels[journey.originalGoal] || journey.originalGoal}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-surface-400">Duration</p>
                                    <p className="text-sm font-medium text-white">
                                        {journey.daysOnPlan} {journey.daysOnPlan === 1 ? 'day' : 'days'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Continue Button */}
                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                        >
                            See My Recommendation
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Step 2: Recommendation */}
                {step === 2 && (
                    <div className="animate-fadeIn">
                        <div className="text-center pt-8 mb-6">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">My Recommendation</h1>
                        </div>

                        {/* AI Explanation */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 mb-6">
                            <p className="text-surface-200 leading-relaxed">
                                {aiExplanation}
                            </p>
                        </div>

                        {recommendation.shouldAdjust ? (
                            <>
                                {/* Suggested Goal Change */}
                                <div className="p-5 rounded-2xl bg-surface-800 border border-surface-700 mb-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                            <SuggestedIcon className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-surface-400">Switch to</p>
                                            <p className="text-xl font-bold text-emerald-400">
                                                {goalLabels[recommendation.suggestedGoal] || recommendation.suggestedGoal}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-surface-400">Est. Time</p>
                                            <p className="text-lg font-semibold text-white">
                                                ~{recommendation.estimatedWeeksToGoal}w
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-surface-400">{recommendation.reason}</p>
                                </div>

                                {/* New Macros */}
                                <div className="p-5 rounded-2xl bg-surface-800 border border-surface-700 mb-8">
                                    <h3 className="text-sm font-semibold text-white mb-4">New Daily Targets</h3>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="text-center p-3 rounded-xl bg-surface-700/50">
                                            <p className="text-lg font-bold text-white">{recommendation.newCalories}</p>
                                            <p className="text-[10px] text-surface-400">CALORIES</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-surface-700/50">
                                            <p className="text-lg font-bold text-blue-400">{recommendation.newProtein}g</p>
                                            <p className="text-[10px] text-surface-400">PROTEIN</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-surface-700/50">
                                            <p className="text-lg font-bold text-amber-400">{recommendation.newCarbs}g</p>
                                            <p className="text-[10px] text-surface-400">CARBS</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-surface-700/50">
                                            <p className="text-lg font-bold text-rose-400">{recommendation.newFat}g</p>
                                            <p className="text-[10px] text-surface-400">FAT</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    <button
                                        onClick={handleApply}
                                        disabled={applying}
                                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                                    >
                                        {applying ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Accept Changes</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => router.push('/settings/edit')}
                                        className="w-full py-4 rounded-2xl bg-surface-800 border border-surface-700 text-surface-300 font-medium"
                                    >
                                        Customize Manually
                                    </button>
                                    <button
                                        onClick={() => router.back()}
                                        className="w-full py-3 text-surface-500 font-medium"
                                    >
                                        Keep Current Plan
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* On Track Message */}
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-8">
                                    <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-white mb-2">You&apos;re on Track!</h3>
                                    <p className="text-surface-400">No changes recommended. Keep doing what you&apos;re doing!</p>
                                </div>
                                <button
                                    onClick={() => router.back()}
                                    className="w-full py-4 rounded-2xl bg-surface-800 border border-surface-700 text-white font-medium"
                                >
                                    Back to Dashboard
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="animate-fadeIn text-center pt-16">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center mx-auto mb-6">
                            <Check className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3">Goals Updated!</h1>
                        <p className="text-surface-400 mb-8 max-w-xs mx-auto">
                            Your new targets are now active. Let&apos;s crush this next phase together! 💪
                        </p>

                        <div className="p-5 rounded-2xl bg-surface-800 border border-surface-700 mb-8 text-left">
                            <h3 className="text-sm font-semibold text-white mb-4">Your New Plan</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-400">Goal</span>
                                    <span className="font-medium text-emerald-400">
                                        {goalLabels[recommendation.suggestedGoal]}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-400">Daily Calories</span>
                                    <span className="font-medium text-white">{recommendation.newCalories} kcal</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-400">Protein</span>
                                    <span className="font-medium text-white">{recommendation.newProtein}g</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-400">Target Time</span>
                                    <span className="font-medium text-white">~{recommendation.estimatedWeeksToGoal} weeks</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
