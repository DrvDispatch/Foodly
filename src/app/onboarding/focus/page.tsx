'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SecondaryFocus, SECONDARY_FOCUS_LABELS } from '@/lib/insights'

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

export default function SecondaryFocusPage() {
    const router = useRouter()
    const [selectedFocuses, setSelectedFocuses] = useState<SecondaryFocus[]>([])
    const maxFocuses = 2

    const toggleFocus = (focus: SecondaryFocus) => {
        if (selectedFocuses.includes(focus)) {
            setSelectedFocuses(prev => prev.filter(f => f !== focus))
        } else if (selectedFocuses.length < maxFocuses) {
            setSelectedFocuses(prev => [...prev, focus])
        }
    }

    const handleContinue = () => {
        // Store in sessionStorage, will save to DB at the end
        sessionStorage.setItem('onboarding_secondary_focus', JSON.stringify(selectedFocuses))
        router.push('/onboarding/body')
    }

    const handleSkip = () => {
        sessionStorage.setItem('onboarding_secondary_focus', '[]')
        router.push('/onboarding/body')
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
                            step <= 2 ? "w-8 bg-primary-500" : "w-2 bg-surface-200"
                        )}
                    />
                ))}
            </div>

            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-surface-500 text-sm hover:text-surface-700"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mb-2">
                    <Sparkles className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">Any secondary focuses?</h1>
                <p className="text-surface-500">
                    Optional — helps personalize your insights
                    <span className="text-surface-400"> (max {maxFocuses})</span>
                </p>
            </div>

            {/* Focus Options */}
            <div className="grid grid-cols-2 gap-3">
                {focusOptions.map((focus) => {
                    const isSelected = selectedFocuses.includes(focus.id)
                    const isDisabled = selectedFocuses.length >= maxFocuses && !isSelected

                    return (
                        <button
                            key={focus.id}
                            onClick={() => toggleFocus(focus.id)}
                            disabled={isDisabled}
                            className={cn(
                                "p-4 rounded-xl border-2 text-left transition-all duration-200",
                                isSelected
                                    ? "border-primary-500 bg-primary-50 shadow-soft"
                                    : isDisabled
                                        ? "border-surface-100 bg-surface-50 opacity-50 cursor-not-allowed"
                                        : "border-surface-200 bg-white hover:shadow-soft"
                            )}
                        >
                            <div className="text-2xl mb-2">{focus.emoji}</div>
                            <p className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-primary-700" : "text-surface-700"
                            )}>
                                {focus.label}
                            </p>
                        </button>
                    )
                })}
            </div>

            {/* Selected indicator */}
            {selectedFocuses.length > 0 && (
                <p className="text-center text-sm text-primary-600">
                    {selectedFocuses.length} of {maxFocuses} selected
                </p>
            )}

            {/* Buttons */}
            <div className="space-y-3">
                <button
                    onClick={handleContinue}
                    className="btn-primary w-full"
                >
                    {selectedFocuses.length > 0 ? 'Continue' : 'Skip for Now'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>

                {selectedFocuses.length > 0 && (
                    <button
                        onClick={handleSkip}
                        className="w-full text-center text-sm text-surface-500 hover:text-surface-700"
                    >
                        Skip this step
                    </button>
                )}
            </div>
        </div>
    )
}
