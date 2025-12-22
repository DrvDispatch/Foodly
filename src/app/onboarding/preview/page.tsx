'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Sparkles, Flame, Beef, Wheat, Droplets, Loader2, CheckCircle, Edit2 } from 'lucide-react'
import { cn, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacroTargets, ACTIVITY_MULTIPLIERS, type ActivityLevel } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

export default function PreviewPage() {
    const router = useRouter()
    const { data: session, update } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Calculated values
    const [targets, setTargets] = useState({
        maintenanceCal: 0,
        targetCal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
    })

    // Editable values
    const [editedTargets, setEditedTargets] = useState(targets)

    useEffect(() => {
        // Get all stored values
        const goal = sessionStorage.getItem('onboarding_goal') as 'lose' | 'maintain' | 'gain'
        const sex = sessionStorage.getItem('onboarding_sex') as 'male' | 'female'
        const age = parseInt(sessionStorage.getItem('onboarding_age') || '30')
        const height = parseFloat(sessionStorage.getItem('onboarding_height') || '170')
        const weight = parseFloat(sessionStorage.getItem('onboarding_weight') || '70')
        const pace = parseFloat(sessionStorage.getItem('onboarding_pace') || '0.5')
        const activity = sessionStorage.getItem('onboarding_activity') as ActivityLevel || 'moderate'

        // Calculate
        const bmr = calculateBMR(weight, height, age, sex || 'male')
        const tdee = calculateTDEE(bmr, activity)
        const targetCal = calculateTargetCalories(tdee, goal || 'maintain', pace)
        const macros = calculateMacroTargets(targetCal, weight, goal || 'maintain')

        const calculated = {
            maintenanceCal: tdee,
            targetCal,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
        }

        setTargets(calculated)
        setEditedTargets(calculated)
    }, [])

    const handleComplete = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Get stored values
            const goal = sessionStorage.getItem('onboarding_goal')
            const sex = sessionStorage.getItem('onboarding_sex')
            const age = sessionStorage.getItem('onboarding_age')
            const height = sessionStorage.getItem('onboarding_height')
            const weight = sessionStorage.getItem('onboarding_weight')
            const targetWeight = sessionStorage.getItem('onboarding_target_weight')
            const pace = sessionStorage.getItem('onboarding_pace')
            const activity = sessionStorage.getItem('onboarding_activity')
            const units = sessionStorage.getItem('onboarding_units')

            // Save to database via NestJS backend
            await apiClient.post('/profile', {
                sex,
                age: parseInt(age || '30'),
                heightCm: parseFloat(height || '170'),
                currentWeight: parseFloat(weight || '70'),
                targetWeight: parseFloat(targetWeight || weight || '70'),
                weeklyPace: parseFloat(pace || '0.5'),
                activityLevel: activity,
                goalType: goal,
                unitSystem: units,
                maintenanceCal: isEditing ? editedTargets.maintenanceCal : targets.maintenanceCal,
                targetCal: isEditing ? editedTargets.targetCal : targets.targetCal,
                proteinTarget: isEditing ? editedTargets.protein : targets.protein,
                carbTarget: isEditing ? editedTargets.carbs : targets.carbs,
                fatTarget: isEditing ? editedTargets.fat : targets.fat,
                onboarded: true,
            })

            // Clear session storage
            sessionStorage.removeItem('onboarding_goal')
            sessionStorage.removeItem('onboarding_sex')
            sessionStorage.removeItem('onboarding_age')
            sessionStorage.removeItem('onboarding_height')
            sessionStorage.removeItem('onboarding_weight')
            sessionStorage.removeItem('onboarding_target_weight')
            sessionStorage.removeItem('onboarding_pace')
            sessionStorage.removeItem('onboarding_activity')
            sessionStorage.removeItem('onboarding_units')

            // Force session update to reflect onboarded status
            await update({ onboarded: true })

            // Navigate to main app using window.location to force full refresh
            window.location.href = '/'
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
            setIsLoading(false)
        }
    }

    const macroPercentages = {
        protein: Math.round((editedTargets.protein * 4 / editedTargets.targetCal) * 100),
        carbs: Math.round((editedTargets.carbs * 4 / editedTargets.targetCal) * 100),
        fat: Math.round((editedTargets.fat * 9 / editedTargets.targetCal) * 100),
    }

    return (
        <div className="w-full max-w-md space-y-8 animate-fade-in">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className="h-2 w-8 rounded-full bg-primary-500 transition-all duration-300"
                    />
                ))}
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-2">
                    <Sparkles className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">Your personalized plan</h1>
                <p className="text-surface-500">Based on your goals, here are your daily targets</p>
            </div>

            {/* Error message */}
            {error && (
                <div className="px-4 py-3 bg-danger-light text-danger-dark rounded-xl text-sm animate-scale-in">
                    {error}
                </div>
            )}

            {/* Targets Card */}
            <div className="card p-6 space-y-6">
                {/* Calories */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 mb-2">
                        <Flame className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-surface-500">Daily Calorie Target</p>
                    {isEditing ? (
                        <input
                            type="number"
                            value={editedTargets.targetCal}
                            onChange={(e) => setEditedTargets({ ...editedTargets, targetCal: parseInt(e.target.value) || 0 })}
                            className="input text-center text-3xl font-bold w-40 mx-auto"
                        />
                    ) : (
                        <p className="text-4xl font-bold text-gradient">{targets.targetCal.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-surface-400">
                        Maintenance: {targets.maintenanceCal.toLocaleString()} kcal
                    </p>
                </div>

                {/* Macro breakdown */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Protein */}
                    <div className="text-center p-3 rounded-xl bg-blue-50">
                        <Beef className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-surface-500 mb-1">Protein</p>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedTargets.protein}
                                onChange={(e) => setEditedTargets({ ...editedTargets, protein: parseInt(e.target.value) || 0 })}
                                className="input text-center text-lg font-semibold w-full p-1"
                            />
                        ) : (
                            <p className="text-xl font-semibold text-surface-900">{targets.protein}g</p>
                        )}
                        <p className="text-xs text-surface-400">{macroPercentages.protein}%</p>
                    </div>

                    {/* Carbs */}
                    <div className="text-center p-3 rounded-xl bg-amber-50">
                        <Wheat className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-xs text-surface-500 mb-1">Carbs</p>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedTargets.carbs}
                                onChange={(e) => setEditedTargets({ ...editedTargets, carbs: parseInt(e.target.value) || 0 })}
                                className="input text-center text-lg font-semibold w-full p-1"
                            />
                        ) : (
                            <p className="text-xl font-semibold text-surface-900">{targets.carbs}g</p>
                        )}
                        <p className="text-xs text-surface-400">{macroPercentages.carbs}%</p>
                    </div>

                    {/* Fat */}
                    <div className="text-center p-3 rounded-xl bg-pink-50">
                        <Droplets className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                        <p className="text-xs text-surface-500 mb-1">Fat</p>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedTargets.fat}
                                onChange={(e) => setEditedTargets({ ...editedTargets, fat: parseInt(e.target.value) || 0 })}
                                className="input text-center text-lg font-semibold w-full p-1"
                            />
                        ) : (
                            <p className="text-xl font-semibold text-surface-900">{targets.fat}g</p>
                        )}
                        <p className="text-xs text-surface-400">{macroPercentages.fat}%</p>
                    </div>
                </div>

                {/* Edit toggle */}
                <button
                    onClick={() => {
                        if (isEditing) {
                            setEditedTargets(targets) // Reset to calculated
                        }
                        setIsEditing(!isEditing)
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                >
                    <Edit2 className="w-4 h-4" />
                    {isEditing ? 'Reset to recommended' : 'Customize targets'}
                </button>
            </div>

            {/* Note */}
            <div className="bg-surface-100 rounded-xl p-4 text-center">
                <p className="text-sm text-surface-600">
                    These are starting points. You can always adjust them later based on how your body responds.
                </p>
            </div>

            {/* Complete Button */}
            <button
                onClick={handleComplete}
                disabled={isLoading}
                className={cn(
                    "btn-primary w-full",
                    isLoading && "opacity-70 cursor-not-allowed"
                )}
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Start my journey
                    </>
                )}
            </button>
        </div>
    )
}
