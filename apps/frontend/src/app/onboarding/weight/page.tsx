'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Scale, ArrowRight, ArrowLeft, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const paceOptions = [
    { value: 0.25, label: 'Relaxed', description: '0.25 kg/week' },
    { value: 0.5, label: 'Moderate', description: '0.5 kg/week' },
    { value: 0.75, label: 'Aggressive', description: '0.75 kg/week' },
]

export default function WeightPage() {
    const router = useRouter()
    const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
    const [currentWeight, setCurrentWeight] = useState<string>('')
    const [targetWeight, setTargetWeight] = useState<string>('')
    const [weeklyPace, setWeeklyPace] = useState<number>(0.5)
    const [goalType, setGoalType] = useState<string>('')

    useEffect(() => {
        // Get stored values
        const storedUnits = sessionStorage.getItem('onboarding_units')
        const storedGoal = sessionStorage.getItem('onboarding_goal')

        if (storedUnits) setUnitSystem(storedUnits as 'metric' | 'imperial')
        if (storedGoal) setGoalType(storedGoal)
    }, [])

    // Show target weight for weight-change goals (not maintenance or general health)
    const showTargetWeight = goalType !== '' && goalType !== 'maintenance' && goalType !== 'health'
    const isValid = currentWeight && (!showTargetWeight || targetWeight)

    const handleContinue = () => {
        if (!isValid) return

        // Convert to kg if imperial
        let weightKg = parseFloat(currentWeight)
        let targetKg = targetWeight ? parseFloat(targetWeight) : weightKg

        if (unitSystem === 'imperial') {
            weightKg = weightKg * 0.453592
            targetKg = targetKg * 0.453592
        }

        sessionStorage.setItem('onboarding_weight', weightKg.toString())
        sessionStorage.setItem('onboarding_target_weight', targetKg.toString())
        sessionStorage.setItem('onboarding_pace', weeklyPace.toString())

        router.push('/onboarding/activity')
    }

    return (
        <div className="w-full max-w-md space-y-8 animate-fade-in">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            step <= 3 ? "w-8 bg-primary-500" : "w-2 bg-surface-200"
                        )}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-2">
                    <Scale className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">Your weight</h1>
                <p className="text-surface-500">Tell us where you are and where you want to be</p>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Current Weight */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-700">Current weight</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="30"
                            max="300"
                            step="0.1"
                            value={currentWeight}
                            onChange={(e) => setCurrentWeight(e.target.value)}
                            className="input text-center text-lg pr-12"
                            placeholder={unitSystem === 'metric' ? '75' : '165'}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">
                            {unitSystem === 'metric' ? 'kg' : 'lb'}
                        </span>
                    </div>
                </div>

                {/* Target Weight (if applicable) */}
                {showTargetWeight && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-surface-700">Target weight</label>
                            <div className="relative">
                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    type="number"
                                    min="30"
                                    max="300"
                                    step="0.1"
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    className="input text-center text-lg pl-12 pr-12"
                                    placeholder={unitSystem === 'metric' ? '70' : '155'}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">
                                    {unitSystem === 'metric' ? 'kg' : 'lb'}
                                </span>
                            </div>
                        </div>

                        {/* Pace Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-surface-700">Weekly pace</label>
                            <div className="grid grid-cols-3 gap-2">
                                {paceOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setWeeklyPace(option.value)}
                                        className={cn(
                                            "p-3 rounded-xl border-2 text-center transition-all duration-200",
                                            weeklyPace === option.value
                                                ? "border-primary-500 bg-primary-50"
                                                : "border-surface-200 bg-white hover:border-surface-300"
                                        )}
                                    >
                                        <span className="text-sm font-semibold text-surface-900 block">{option.label}</span>
                                        <span className="text-xs text-surface-500">{option.description}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-surface-400 text-center">
                                Slower pace is more sustainable and preserves muscle
                            </p>
                        </div>
                    </>
                )}

                {goalType === 'maintenance' && (
                    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 text-center">
                        <p className="text-sm text-primary-700 dark:text-primary-300">
                            Great choice! Maintaining weight is about consistency and balance. We&apos;ll set your calories to match your energy expenditure.
                        </p>
                    </div>
                )}

                {goalType === 'health' && (
                    <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center">
                        <p className="text-sm text-pink-700 dark:text-pink-300">
                            Focusing on overall health! We&apos;ll help you build balanced eating habits without strict weight goals.
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => router.back()}
                    className="btn-secondary flex-shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={handleContinue}
                    disabled={!isValid}
                    className={cn(
                        "btn-primary flex-1",
                        !isValid && "opacity-50 cursor-not-allowed"
                    )}
                >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    )
}
