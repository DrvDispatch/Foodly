'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const activityLevels = [
    {
        id: 'sedentary',
        title: 'Sedentary',
        description: 'Little or no exercise, desk job',
        emoji: '🪑',
    },
    {
        id: 'light',
        title: 'Lightly Active',
        description: 'Light exercise 1-3 days/week',
        emoji: '🚶',
    },
    {
        id: 'moderate',
        title: 'Moderately Active',
        description: 'Moderate exercise 3-5 days/week',
        emoji: '🏃',
    },
    {
        id: 'active',
        title: 'Very Active',
        description: 'Hard exercise 6-7 days/week',
        emoji: '💪',
    },
    {
        id: 'athlete',
        title: 'Athlete',
        description: 'Very hard exercise, physical job',
        emoji: '🏋️',
    },
]

export default function ActivityPage() {
    const router = useRouter()
    const [selectedLevel, setSelectedLevel] = useState<string>('')

    const handleContinue = () => {
        if (!selectedLevel) return
        sessionStorage.setItem('onboarding_activity', selectedLevel)
        router.push('/onboarding/preview')
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
                            step <= 4 ? "w-8 bg-primary-500" : "w-2 bg-surface-200"
                        )}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-2">
                    <Activity className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">Activity level</h1>
                <p className="text-surface-500">How active are you on a typical week?</p>
            </div>

            {/* Activity Options */}
            <div className="space-y-2">
                {activityLevels.map((level) => {
                    const isSelected = selectedLevel === level.id

                    return (
                        <button
                            key={level.id}
                            onClick={() => setSelectedLevel(level.id)}
                            className={cn(
                                "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4",
                                "hover:shadow-soft",
                                isSelected
                                    ? "border-primary-500 bg-primary-50 shadow-soft"
                                    : "border-surface-200 bg-white"
                            )}
                        >
                            <span className="text-2xl">{level.emoji}</span>
                            <div className="flex-1">
                                <h3 className="font-medium text-surface-900">{level.title}</h3>
                                <p className="text-sm text-surface-500">{level.description}</p>
                            </div>
                            <div
                                className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    isSelected
                                        ? "border-primary-500 bg-primary-500"
                                        : "border-surface-300"
                                )}
                            >
                                {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    )
                })}
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
                    disabled={!selectedLevel}
                    className={cn(
                        "btn-primary flex-1",
                        !selectedLevel && "opacity-50 cursor-not-allowed"
                    )}
                >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    )
}
