'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, TrendingDown, TrendingUp, Minus, ArrowLeft, ArrowRight, Zap, RefreshCw, Heart, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { PrimaryGoal, SecondaryFocus } from '@/lib/insights'

// Secondary focus options
const focusOptions: { id: SecondaryFocus; label: string; emoji: string }[] = [
    { id: 'vegan', label: 'Plant-Based / Vegan', emoji: '🌱' },
    { id: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
    { id: 'strength_lifting', label: 'Strength Training', emoji: '🏋️' },
    { id: 'endurance', label: 'Endurance / Cardio', emoji: '🏃' },
    { id: 'longevity', label: 'Longevity & Micronutrients', emoji: '🧬' },
    { id: 'satiety', label: 'Satiety & Hunger Control', emoji: '😌' },
    { id: 'aesthetic', label: 'Get Lean / Aesthetic', emoji: '💪' },
    { id: 'metabolic_health', label: 'Metabolic Health', emoji: '❤️' },
]

const goals = [
    {
        id: 'fat_loss' as PrimaryGoal,
        title: 'Fat Loss',
        description: 'Lose body fat while preserving muscle',
        icon: TrendingDown,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        borderColor: 'border-blue-500',
    },
    {
        id: 'maintenance' as PrimaryGoal,
        title: 'Maintenance',
        description: 'Maintain current weight and body composition',
        icon: Minus,
        color: 'text-primary-500',
        bg: 'bg-primary-50',
        borderColor: 'border-primary-500',
    },
    {
        id: 'muscle_gain' as PrimaryGoal,
        title: 'Muscle Gain',
        description: 'Build muscle with a calorie surplus',
        icon: TrendingUp,
        color: 'text-purple-500',
        bg: 'bg-purple-50',
        borderColor: 'border-purple-500',
    },
    {
        id: 'strength' as PrimaryGoal,
        title: 'Strength & Performance',
        description: 'Optimize for lifting and athletic output',
        icon: Zap,
        color: 'text-orange-500',
        bg: 'bg-orange-50',
        borderColor: 'border-orange-500',
    },
    {
        id: 'recomp' as PrimaryGoal,
        title: 'Recomposition',
        description: 'Slowly lose fat while building muscle',
        icon: RefreshCw,
        color: 'text-teal-500',
        bg: 'bg-teal-50',
        borderColor: 'border-teal-500',
    },
    {
        id: 'health' as PrimaryGoal,
        title: 'General Health',
        description: 'Focus on overall wellness and nutrition quality',
        icon: Heart,
        color: 'text-pink-500',
        bg: 'bg-pink-50',
        borderColor: 'border-pink-500',
    },
]

const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
    { id: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
    { id: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
    { id: 'active', label: 'Active', desc: '6-7 days/week' },
    { id: 'athlete', label: 'Very Active', desc: 'Athlete or physical job' }
]

export default function EditProfilePage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Form state
    const [goalType, setGoalType] = useState<PrimaryGoal>('maintenance')
    const [secondaryFocus, setSecondaryFocus] = useState<SecondaryFocus[]>([])
    const [sex, setSex] = useState<string>('male')
    const [age, setAge] = useState<string>('')
    const [heightCm, setHeightCm] = useState<string>('')
    const [currentWeight, setCurrentWeight] = useState<string>('')
    const [targetWeight, setTargetWeight] = useState<string>('')
    const [activityLevel, setActivityLevel] = useState<string>('moderate')
    const [unitSystem, setUnitSystem] = useState<string>('metric')
    const maxFocuses = 2

    // Load current profile
    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await apiClient.get<any>('/profile')
                setGoalType(data.goalType || 'maintenance')
                setSecondaryFocus(data.secondaryFocus || [])
                setSex(data.sex || 'male')
                setAge(data.age?.toString() || '')
                setHeightCm(data.heightCm?.toString() || '')
                setCurrentWeight(data.currentWeight?.toString() || '')
                setTargetWeight(data.targetWeight?.toString() || '')
                setActivityLevel(data.activityLevel || 'moderate')
                setUnitSystem(data.unitSystem || 'metric')
            } catch (error) {
                console.error('Failed to load profile:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadProfile()
    }, [])

    // Calculate targets based on profile
    const calculateTargets = () => {
        const weight = parseFloat(currentWeight) || 70
        const height = parseFloat(heightCm) || 170
        const ageNum = parseInt(age) || 30

        // Mifflin-St Jeor BMR
        let bmr = sex === 'male'
            ? (10 * weight) + (6.25 * height) - (5 * ageNum) + 5
            : (10 * weight) + (6.25 * height) - (5 * ageNum) - 161

        // Activity multipliers
        const multipliers: Record<string, number> = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            athlete: 1.9
        }

        const maintenanceCal = Math.round(bmr * (multipliers[activityLevel] || 1.55))

        // Goal adjustments
        let targetCal = maintenanceCal
        if (goalType === 'fat_loss') targetCal = Math.round(maintenanceCal * 0.8)
        else if (goalType === 'muscle_gain') targetCal = Math.round(maintenanceCal * 1.1)
        else if (goalType === 'recomp') targetCal = Math.round(maintenanceCal * 0.95)

        // Protein: 1.6-2.2g per kg body weight
        const proteinMultiplier = goalType === 'muscle_gain' ? 2.2 : goalType === 'fat_loss' ? 2.0 : 1.6
        const proteinTarget = Math.round(weight * proteinMultiplier)

        // Fat: 25-30% of calories
        const fatTarget = Math.round((targetCal * 0.25) / 9)

        // Carbs: remaining calories
        const carbTarget = Math.round((targetCal - (proteinTarget * 4) - (fatTarget * 9)) / 4)

        return { maintenanceCal, targetCal, proteinTarget, carbTarget, fatTarget }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const targets = calculateTargets()

            await apiClient.post('/profile', {
                goalType,
                secondaryFocus,
                sex,
                age: parseInt(age) || null,
                heightCm: parseFloat(heightCm) || null,
                currentWeight: parseFloat(currentWeight) || null,
                targetWeight: parseFloat(targetWeight) || null,
                activityLevel,
                unitSystem,
                ...targets
            })

            router.push('/settings')
            router.refresh()
        } catch (error) {
            console.error('Failed to save:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        )
    }

    const isMetric = unitSystem === 'metric'

    return (
        <div className="min-h-screen bg-white dark:bg-surface-50 px-4 py-6">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : router.back()}
                        className="p-2 rounded-full hover:bg-surface-100"
                    >
                        <ArrowLeft className="w-5 h-5 text-surface-600" />
                    </button>
                    <h1 className="text-lg font-semibold text-surface-900">Edit Profile</h1>
                    <div className="w-9" />
                </div>

                {/* Progress */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={cn(
                                "h-1.5 flex-1 rounded-full transition-all",
                                s <= step ? "bg-primary-500" : "bg-surface-200"
                            )}
                        />
                    ))}
                </div>

                {/* Step 1: Goal */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="text-center mb-6">
                            <Target className="w-10 h-10 text-primary-600 mx-auto mb-2" />
                            <h2 className="text-xl font-bold text-surface-900">Primary Goal</h2>
                            <p className="text-sm text-surface-500">This determines your calorie targets</p>
                        </div>

                        <div className="space-y-3">
                            {goals.map((goal) => {
                                const Icon = goal.icon
                                const isSelected = goalType === goal.id
                                return (
                                    <button
                                        key={goal.id}
                                        type="button"
                                        onClick={() => setGoalType(goal.id)}
                                        className={cn(
                                            "w-full p-4 rounded-2xl border-2 text-left transition-all",
                                            "bg-white dark:bg-surface-800",
                                            isSelected
                                                ? `${goal.borderColor} ring-2 ring-primary-400 ring-offset-2 ring-offset-surface-50 dark:ring-offset-surface-900`
                                                : "border-surface-200 dark:border-surface-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-xl", goal.bg)}>
                                                <Icon className={cn("w-5 h-5", goal.color)} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-surface-900">{goal.title}</p>
                                                <p className="text-xs text-surface-500">{goal.description}</p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Step 2: Secondary Focus */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="text-center mb-6">
                            <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                            <h2 className="text-xl font-bold text-surface-900">Secondary Focus</h2>
                            <p className="text-sm text-surface-500">
                                Optional — helps personalize insights
                                <span className="text-surface-400"> (max {maxFocuses})</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {focusOptions.map((focus) => {
                                const isSelected = secondaryFocus.includes(focus.id)
                                const isDisabled = secondaryFocus.length >= maxFocuses && !isSelected

                                return (
                                    <button
                                        key={focus.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSecondaryFocus(prev => prev.filter(f => f !== focus.id))
                                            } else if (secondaryFocus.length < maxFocuses) {
                                                setSecondaryFocus(prev => [...prev, focus.id])
                                            }
                                        }}
                                        disabled={isDisabled}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-all duration-200",
                                            "bg-white dark:bg-surface-800",
                                            isSelected
                                                ? "border-primary-500 dark:border-primary-400 ring-2 ring-primary-400 ring-offset-2 ring-offset-surface-50 dark:ring-offset-surface-900"
                                                : isDisabled
                                                    ? "border-surface-100 dark:border-surface-700 opacity-50 cursor-not-allowed"
                                                    : "border-surface-200 dark:border-surface-700 hover:shadow-soft"
                                        )}
                                    >
                                        <div className="text-2xl mb-2">{focus.emoji}</div>
                                        <p className={cn(
                                            "text-sm font-medium",
                                            isSelected ? "text-primary-700 dark:text-primary-300" : "text-surface-700 dark:text-surface-300"
                                        )}>
                                            {focus.label}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>

                        {secondaryFocus.length > 0 && (
                            <p className="text-center text-sm text-primary-600">
                                {secondaryFocus.length} of {maxFocuses} selected
                            </p>
                        )}
                    </div>
                )}

                {/* Step 3: Body Stats */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-surface-900">Body Stats</h2>
                            <p className="text-sm text-surface-500">Used to calculate your targets</p>
                        </div>

                        {/* Unit Toggle */}
                        <div className="flex justify-center mb-4">
                            <div className="flex bg-surface-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setUnitSystem('metric')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                                        isMetric ? "bg-white shadow text-surface-900" : "text-surface-500"
                                    )}
                                >
                                    Metric
                                </button>
                                <button
                                    onClick={() => setUnitSystem('imperial')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                                        !isMetric ? "bg-white shadow text-surface-900" : "text-surface-500"
                                    )}
                                >
                                    Imperial
                                </button>
                            </div>
                        </div>

                        {/* Sex */}
                        <div>
                            <label className="text-sm text-surface-600 mb-2 block">Sex</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['male', 'female'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSex(s)}
                                        className={cn(
                                            "py-3 rounded-xl text-sm font-medium transition-all",
                                            sex === s
                                                ? "bg-primary-500 text-white"
                                                : "bg-surface-100 text-surface-600"
                                        )}
                                    >
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Age */}
                        <div>
                            <label className="text-sm text-surface-600 mb-2 block">Age</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="30"
                                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-primary-400"
                            />
                        </div>

                        {/* Height */}
                        <div>
                            <label className="text-sm text-surface-600 mb-2 block">
                                Height ({isMetric ? 'cm' : 'inches'})
                            </label>
                            <input
                                type="number"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                placeholder={isMetric ? "170" : "67"}
                                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-primary-400"
                            />
                        </div>

                        {/* Weight */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm text-surface-600 mb-2 block">
                                    Current ({isMetric ? 'kg' : 'lb'})
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={currentWeight}
                                    onChange={(e) => setCurrentWeight(e.target.value)}
                                    placeholder={isMetric ? "75" : "165"}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-primary-400"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-surface-600 mb-2 block">
                                    Target ({isMetric ? 'kg' : 'lb'})
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    placeholder={isMetric ? "70" : "154"}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-primary-400"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Activity */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-surface-900">Activity Level</h2>
                            <p className="text-sm text-surface-500">How active are you daily?</p>
                        </div>

                        <div className="space-y-3">
                            {activityLevels.map((level) => (
                                <button
                                    key={level.id}
                                    onClick={() => setActivityLevel(level.id)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border-2 text-left transition-all",
                                        activityLevel === level.id
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-surface-200 bg-white"
                                    )}
                                >
                                    <p className="font-medium text-surface-900">{level.label}</p>
                                    <p className="text-xs text-surface-500">{level.desc}</p>
                                </button>
                            ))}
                        </div>

                        {/* Preview calculated targets */}
                        <div className="bg-surface-50 rounded-2xl p-4 mt-6">
                            <p className="text-xs text-surface-500 mb-3">Your calculated targets:</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-surface-500">Calories</p>
                                    <p className="font-bold text-surface-900">{calculateTargets().targetCal}</p>
                                </div>
                                <div>
                                    <p className="text-surface-500">Protein</p>
                                    <p className="font-bold text-surface-900">{calculateTargets().proteinTarget}g</p>
                                </div>
                                <div>
                                    <p className="text-surface-500">Carbs</p>
                                    <p className="font-bold text-surface-900">{calculateTargets().carbTarget}g</p>
                                </div>
                                <div>
                                    <p className="text-surface-500">Fat</p>
                                    <p className="font-bold text-surface-900">{calculateTargets().fatTarget}g</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-8">
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                            Continue
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
