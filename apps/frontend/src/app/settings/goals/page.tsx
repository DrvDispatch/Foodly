'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Minus, RefreshCw, Heart, Zap, TrendingUp as TrendingIcon, Check } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

type PrimaryGoal = 'fat_loss' | 'maintenance' | 'muscle_gain' | 'recomp' | 'health'

const primaryGoals = [
    {
        id: 'fat_loss' as PrimaryGoal,
        title: 'Fat Loss',
        description: 'Lose body fat while preserving muscle',
        icon: TrendingDown,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-500',
        calorieAdjust: '-20%'
    },
    {
        id: 'maintenance' as PrimaryGoal,
        title: 'Maintenance',
        description: 'Maintain current weight and body composition',
        icon: Minus,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-500',
        calorieAdjust: '0%'
    },
    {
        id: 'muscle_gain' as PrimaryGoal,
        title: 'Muscle Gain',
        description: 'Build muscle with a caloric surplus',
        icon: TrendingUp,
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-500',
        calorieAdjust: '+15%'
    },
    {
        id: 'recomp' as PrimaryGoal,
        title: 'Recomposition',
        description: 'Slowly lose fat while building muscle',
        icon: RefreshCw,
        color: 'text-teal-500',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        borderColor: 'border-teal-500',
        calorieAdjust: '-5%'
    },
    {
        id: 'health' as PrimaryGoal,
        title: 'General Health',
        description: 'Focus on overall wellness and nutrition quality',
        icon: Heart,
        color: 'text-pink-500',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        borderColor: 'border-pink-500',
        calorieAdjust: '0%'
    },
]

const secondaryFocuses = [
    { id: 'performance', label: 'Athletic Performance', emoji: '⚡' },
    { id: 'recovery', label: 'Recovery & Sleep', emoji: '😴' },
    { id: 'satiety', label: 'Satiety & Hunger Control', emoji: '😌' },
    { id: 'aesthetic', label: 'Get Lean / Aesthetic', emoji: '💪' },
    { id: 'metabolic_health', label: 'Metabolic Health', emoji: '❤️' },
]

export default function EditGoalsPage() {
    const router = useRouter()
    const { profile, updateProfile, refresh } = useProfile()

    // Step state
    const [step, setStep] = useState(1)

    // Form state
    const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('maintenance')
    const [selectedFocuses, setSelectedFocuses] = useState<string[]>([])

    // UI state
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [originalGoal, setOriginalGoal] = useState<PrimaryGoal | null>(null)
    const [originalFocuses, setOriginalFocuses] = useState<string[]>([])

    // Load profile data
    useEffect(() => {
        if (profile) {
            const goal = (profile.goalType as PrimaryGoal) || 'maintenance'
            const focuses = profile.secondaryFocus
                ? (typeof profile.secondaryFocus === 'string' ? JSON.parse(profile.secondaryFocus) : profile.secondaryFocus)
                : []
            setPrimaryGoal(goal)
            setSelectedFocuses(focuses)
            setOriginalGoal(goal)
            setOriginalFocuses(focuses)
        }
    }, [profile])

    // Track changes
    useEffect(() => {
        if (originalGoal) {
            const goalChanged = primaryGoal !== originalGoal
            const focusesChanged = JSON.stringify(selectedFocuses.sort()) !== JSON.stringify(originalFocuses.sort())
            setHasChanges(goalChanged || focusesChanged)
        }
    }, [primaryGoal, selectedFocuses, originalGoal, originalFocuses])

    const toggleFocus = (focusId: string) => {
        if (selectedFocuses.includes(focusId)) {
            setSelectedFocuses(selectedFocuses.filter(f => f !== focusId))
        } else if (selectedFocuses.length < 3) {
            setSelectedFocuses([...selectedFocuses, focusId])
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateProfile({
                goalType: primaryGoal,
                secondaryFocuses: selectedFocuses,
            })
            await refresh()
            router.back()
        } catch (err) {
            console.error('Failed to save goals:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const currentGoalData = primaryGoals.find(g => g.id === primaryGoal)

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-surface-50 dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => step === 1 ? router.back() : setStep(1)}
                        className="p-2 -ml-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-semibold text-surface-900">Edit Goals</h1>
                        <p className="text-xs text-surface-500">Step {step} of 2</p>
                    </div>
                    {step === 2 ? (
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                hasChanges
                                    ? "bg-primary-500 text-white hover:bg-primary-600"
                                    : "bg-surface-100 text-surface-400 dark:bg-surface-800"
                            )}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setStep(2)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center gap-1"
                        >
                            Next <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-surface-200 dark:bg-surface-700">
                    <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: step === 1 ? '50%' : '100%' }}
                    />
                </div>
            </header>

            {/* Step 1: Primary Goal */}
            {step === 1 && (
                <main className="p-4 space-y-4">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-surface-900 mb-2">What&apos;s your main goal?</h2>
                        <p className="text-sm text-surface-500">This determines your calorie target</p>
                    </div>

                    <div className="space-y-3">
                        {primaryGoals.map((goal) => {
                            const Icon = goal.icon
                            const isSelected = primaryGoal === goal.id
                            return (
                                <button
                                    key={goal.id}
                                    onClick={() => setPrimaryGoal(goal.id)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl text-left border-2 transition-all",
                                        isSelected
                                            ? `${goal.borderColor} ${goal.bg}`
                                            : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center",
                                            isSelected ? goal.bg : "bg-surface-100 dark:bg-surface-700"
                                        )}>
                                            <Icon className={cn("w-6 h-6", isSelected ? goal.color : "text-surface-400")} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className={cn(
                                                    "font-semibold",
                                                    isSelected ? "text-surface-900" : "text-surface-700 dark:text-surface-300"
                                                )}>
                                                    {goal.title}
                                                </p>
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full",
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
                                        {isSelected && (
                                            <Check className={cn("w-5 h-5", goal.color)} />
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </main>
            )}

            {/* Step 2: Secondary Focuses */}
            {step === 2 && (
                <main className="p-4 space-y-4">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-surface-900 mb-2">Any secondary focuses?</h2>
                        <p className="text-sm text-surface-500">Select up to 3 (optional)</p>
                    </div>

                    {/* Current goal summary */}
                    {currentGoalData && (
                        <div className={cn(
                            "p-4 rounded-xl border-2",
                            currentGoalData.borderColor, currentGoalData.bg
                        )}>
                            <div className="flex items-center gap-3">
                                <currentGoalData.icon className={cn("w-5 h-5", currentGoalData.color)} />
                                <div>
                                    <p className="text-sm font-medium text-surface-900">Primary Goal: {currentGoalData.title}</p>
                                    <p className="text-xs text-surface-500">{currentGoalData.calorieAdjust} calorie adjustment</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {secondaryFocuses.map((focus) => {
                            const isSelected = selectedFocuses.includes(focus.id)
                            return (
                                <button
                                    key={focus.id}
                                    onClick={() => toggleFocus(focus.id)}
                                    disabled={!isSelected && selectedFocuses.length >= 3}
                                    className={cn(
                                        "w-full p-4 rounded-xl text-left border-2 transition-all flex items-center justify-between",
                                        isSelected
                                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                            : selectedFocuses.length >= 3
                                                ? "border-surface-200 dark:border-surface-700 opacity-50"
                                                : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{focus.emoji}</span>
                                        <span className={cn(
                                            "font-medium",
                                            isSelected ? "text-primary-700 dark:text-primary-300" : "text-surface-700 dark:text-surface-300"
                                        )}>
                                            {focus.label}
                                        </span>
                                    </div>
                                    {isSelected && <Check className="w-5 h-5 text-primary-500" />}
                                </button>
                            )
                        })}
                    </div>

                    {selectedFocuses.length > 0 && (
                        <p className="text-xs text-center text-surface-400">
                            {selectedFocuses.length}/3 selected
                        </p>
                    )}
                </main>
            )}
        </div>
    )
}
