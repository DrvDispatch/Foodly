'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
    ArrowLeft, Clock, Sparkles, Beef, Wheat, Droplets, AlertCircle,
    RefreshCw, Flame, Pencil, Save, X, Trash2, RotateCcw
} from 'lucide-react'
import { ConfidenceChip } from '@/components/confidence-chip'
import { useDetailedMealInsight } from '@/hooks/useInsights'
import { UserContext, mapLegacyGoalType, parseSecondaryFocuses } from '@/lib/insights'
import { formatTime, getMealTypeLabel, cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import NextImage from 'next/image'
import { useProfile } from '@/contexts/ProfileContext'

interface MealItem {
    id: string
    name: string
    portionDesc: string
    gramsEst: number
    calories: number
    protein: number
    carbs: number
    fat: number
    confidence: number
}

interface NutritionSnapshot {
    id: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    confidence: number
    qualityScore?: number
    notes?: string
}

interface Meal {
    id: string
    type: string
    description: string | null
    photoUrl: string | null
    mealTime: string
    isAnalyzing: boolean
    items: MealItem[]
    activeSnapshot: NutritionSnapshot | null
}

export default function MealDetailPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const mealId = params.id as string
    const startInEditMode = searchParams.get('edit') === 'true'

    const [meal, setMeal] = useState<Meal | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(startInEditMode)
    const [isSaving, setIsSaving] = useState(false)
    const [isReanalyzing, setIsReanalyzing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showReanalyzeHint, setShowReanalyzeHint] = useState(false)

    // Use shared profile from context (no extra API call!)
    const { profile, isLoading: profileLoading } = useProfile()

    // Derive user context from profile
    const userContext = useMemo<UserContext | null>(() => {
        if (!profile) return null
        return {
            goalType: mapLegacyGoalType(profile.goalType || ''),
            secondaryFocuses: parseSecondaryFocuses(profile.secondaryFocus || ''),
            sex: profile.sex || undefined,
            age: profile.age || undefined,
            activityLevel: profile.activityLevel || undefined,
            targetCalories: profile.targetCal || 2000,
            targetProtein: profile.proteinTarget || 150,
            targetCarbs: profile.carbTarget || 200,
            targetFat: profile.fatTarget || 65,
        }
    }, [profile])

    // Edit state
    const [editDescription, setEditDescription] = useState('')
    const [editCalories, setEditCalories] = useState(0)
    const [editProtein, setEditProtein] = useState(0)
    const [editCarbs, setEditCarbs] = useState(0)
    const [editFat, setEditFat] = useState(0)

    // Track if description has changed (for reanalyze button)
    const descriptionChanged = meal ? editDescription.trim() !== (meal.description || '').trim() : false

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    useEffect(() => {
        async function fetchMeal() {
            if (!mealId || status !== 'authenticated') return

            try {
                const data = await apiClient.get<Meal>(`/meals/${mealId}`)
                setMeal(data)

                // Initialize edit state
                setEditDescription(data.description || '')
                if (data.activeSnapshot) {
                    setEditCalories(data.activeSnapshot.calories)
                    setEditProtein(data.activeSnapshot.protein)
                    setEditCarbs(data.activeSnapshot.carbs)
                    setEditFat(data.activeSnapshot.fat)
                }

                // If still analyzing, poll for updates
                if (data.isAnalyzing) {
                    const pollInterval = setInterval(async () => {
                        try {
                            const pollData = await apiClient.get<Meal>(`/meals/${mealId}`)
                            setMeal(pollData)
                            if (!pollData.isAnalyzing) {
                                // Update edit state with new values
                                if (pollData.activeSnapshot) {
                                    setEditCalories(pollData.activeSnapshot.calories)
                                    setEditProtein(pollData.activeSnapshot.protein)
                                    setEditCarbs(pollData.activeSnapshot.carbs)
                                    setEditFat(pollData.activeSnapshot.fat)
                                }
                                clearInterval(pollInterval)
                            }
                        } catch { /* ignore polling errors */ }
                    }, 2000)

                    return () => clearInterval(pollInterval)
                }
            } catch (err: any) {
                if (err.message?.includes('404')) {
                    setError('Meal not found')
                } else {
                    setError(err instanceof Error ? err.message : 'Something went wrong')
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchMeal()
    }, [mealId, status])


    // Get meal nutrition for insight hook
    const mealNutrition = meal?.activeSnapshot ? {
        calories: meal.activeSnapshot.calories,
        protein: meal.activeSnapshot.protein,
        carbs: meal.activeSnapshot.carbs,
        fat: meal.activeSnapshot.fat,
    } : null

    // Detailed AI insight (2-3 sentences)
    const { insight: aiInsight, isLoading: insightLoading } = useDetailedMealInsight(
        userContext,
        mealNutrition,
        !meal?.isAnalyzing && !!meal?.activeSnapshot
    )

    const handleSave = async () => {
        if (!meal) return
        setIsSaving(true)

        try {
            const updated = await apiClient.patch<Meal>(`/meals/${mealId}`, {
                description: editDescription.trim() || null,
                calories: editCalories,
                protein: editProtein,
                carbs: editCarbs,
                fat: editFat,
            })

            setMeal(updated)
            setIsEditing(false)
        } catch (err) {
            console.error('Save error:', err)
            alert('Failed to save changes')
        } finally {
            setIsSaving(false)
        }
    }

    const handleReanalyze = async () => {
        if (!meal) return
        setIsReanalyzing(true)

        try {
            await apiClient.post(`/meals/${mealId}/reanalyze`)

            // Update meal state to show analyzing
            setMeal(prev => prev ? { ...prev, isAnalyzing: true } : null)

            // Poll for updates
            const poll = async () => {
                try {
                    const pollData = await apiClient.get<Meal>(`/meals/${mealId}`)
                    setMeal(pollData)
                    if (pollData.activeSnapshot) {
                        setEditCalories(pollData.activeSnapshot.calories)
                        setEditProtein(pollData.activeSnapshot.protein)
                        setEditCarbs(pollData.activeSnapshot.carbs)
                        setEditFat(pollData.activeSnapshot.fat)
                    }
                    if (pollData.isAnalyzing) {
                        setTimeout(poll, 2000)
                    }
                } catch { /* ignore polling errors */ }
            }
            poll()
        } catch (err) {
            console.error('Reanalyze error:', err)
            alert('Failed to reanalyze meal')
        } finally {
            setIsReanalyzing(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Delete this meal? This cannot be undone.')) return
        setIsDeleting(true)

        try {
            await apiClient.delete(`/meals/${mealId}`)
            router.push('/')
        } catch (err) {
            console.error('Delete error:', err)
            alert('Failed to delete meal')
            setIsDeleting(false)
        }
    }

    const cancelEdit = () => {
        // Reset to original values
        if (meal) {
            setEditDescription(meal.description || '')
            if (meal.activeSnapshot) {
                setEditCalories(meal.activeSnapshot.calories)
                setEditProtein(meal.activeSnapshot.protein)
                setEditCarbs(meal.activeSnapshot.carbs)
                setEditFat(meal.activeSnapshot.fat)
            }
        }
        setIsEditing(false)
        setShowReanalyzeHint(false)
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen p-6 bg-surface-50">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-surface-600 mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>
                <div className="card p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h2 className="text-heading text-surface-900 mb-2">Error</h2>
                    <p className="text-body text-surface-500">{error}</p>
                </div>
            </div>
        )
    }

    if (!meal) return null

    const typeLabel = getMealTypeLabel(meal.type)
    const isAnalyzing = meal.isAnalyzing || meal.type === 'analyzing'
    const hasAnalysis = meal.activeSnapshot && !isAnalyzing
    const notes = meal.activeSnapshot?.notes ? JSON.parse(meal.activeSnapshot.notes) : []

    return (
        <div className="min-h-screen pb-8 bg-surface-50">
            {/* Header */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-surface-100 z-10">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-surface-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-body font-semibold text-surface-900">
                        {isAnalyzing ? 'Analyzing...' : typeLabel}
                    </h1>
                    {isEditing ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={cancelEdit}
                                disabled={isSaving}
                                className="p-2 text-surface-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-2 text-primary-600"
                            >
                                {isSaving ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 -mr-2 text-primary-600"
                            disabled={isAnalyzing}
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            {/* Photo */}
            {meal.photoUrl && (
                <div className="relative w-full h-56">
                    <NextImage
                        src={meal.photoUrl}
                        alt={meal.description || typeLabel}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="text-center text-white">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse-soft" />
                                <p className="text-body font-medium">Analyzing...</p>
                            </div>
                        </div>
                    )}
                    {hasAnalysis && !isEditing && (
                        <div className="absolute bottom-3 right-3">
                            <ConfidenceChip confidence={meal.activeSnapshot!.confidence} />
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-5">
                {/* Time & Description */}
                <div className="card p-4">
                    <div className="flex items-center gap-2 text-caption text-surface-500 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(meal.mealTime)}</span>
                        <span className="text-surface-300">•</span>
                        <span>{new Date(meal.mealTime).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                        })}</span>
                    </div>

                    {isEditing ? (
                        <div>
                            <label className="text-micro text-surface-500 block mb-1">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Describe your meal..."
                                rows={2}
                                className="input resize-none"
                            />
                        </div>
                    ) : (
                        meal.description && (
                            <p className="text-body text-surface-700">{meal.description}</p>
                        )
                    )}
                </div>

                {/* AI Insight - Detailed */}
                {!isEditing && (aiInsight || insightLoading) && hasAnalysis && (
                    <div className={cn(
                        "card p-4 bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200/50",
                        insightLoading && "opacity-60"
                    )}>
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-caption font-semibold text-primary-700 mb-1">AI Insight</h3>
                                <p className="text-body text-surface-700 leading-relaxed">
                                    {aiInsight || "Analyzing your meal..."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analysis State */}
                {isAnalyzing ? (
                    <div className="card p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
                        </div>
                        <h3 className="text-body font-semibold text-surface-900 mb-1">
                            AI is analyzing your meal
                        </h3>
                        <p className="text-caption text-surface-500">
                            This usually takes a few seconds
                        </p>
                    </div>
                ) : hasAnalysis ? (
                    <>
                        {/* Nutrition Summary */}
                        <div className="card p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-body font-semibold text-surface-900">Nutrition</h2>
                                {isEditing && (
                                    <span className="text-micro text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                        Editing
                                    </span>
                                )}
                            </div>

                            {/* Calories */}
                            {isEditing ? (
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4">
                                    <label className="text-micro text-surface-500 block mb-1">Calories</label>
                                    <input
                                        type="number"
                                        value={editCalories}
                                        onChange={(e) => setEditCalories(Number(e.target.value))}
                                        className="input text-center text-xl font-bold"
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Flame className="w-5 h-5 text-orange-500" />
                                        <span className="text-display text-calories">
                                            {meal.activeSnapshot!.calories}
                                        </span>
                                    </div>
                                    <p className="text-caption text-surface-500">calories</p>
                                </div>
                            )}

                            {/* Macros */}
                            {isEditing ? (
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-micro text-surface-500 block mb-1">Protein (g)</label>
                                        <input
                                            type="number"
                                            value={editProtein}
                                            onChange={(e) => setEditProtein(Number(e.target.value))}
                                            className="input text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-micro text-surface-500 block mb-1">Carbs (g)</label>
                                        <input
                                            type="number"
                                            value={editCarbs}
                                            onChange={(e) => setEditCarbs(Number(e.target.value))}
                                            className="input text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-micro text-surface-500 block mb-1">Fat (g)</label>
                                        <input
                                            type="number"
                                            value={editFat}
                                            onChange={(e) => setEditFat(Number(e.target.value))}
                                            className="input text-center"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    <MacroBlock
                                        label="Protein"
                                        value={meal.activeSnapshot!.protein}
                                        icon={Beef}
                                        color="text-blue-600 bg-blue-100"
                                    />
                                    <MacroBlock
                                        label="Carbs"
                                        value={meal.activeSnapshot!.carbs}
                                        icon={Wheat}
                                        color="text-amber-600 bg-amber-100"
                                    />
                                    <MacroBlock
                                        label="Fat"
                                        value={meal.activeSnapshot!.fat}
                                        icon={Droplets}
                                        color="text-pink-600 bg-pink-100"
                                    />
                                </div>
                            )}

                            {/* Quality Score */}
                            {!isEditing && meal.activeSnapshot!.qualityScore && (
                                <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                                    <span className="text-caption text-surface-600">Food Quality</span>
                                    <span className={cn(
                                        "text-body font-semibold",
                                        meal.activeSnapshot!.qualityScore >= 70 ? "text-green-600" :
                                            meal.activeSnapshot!.qualityScore >= 40 ? "text-amber-600" : "text-red-600"
                                    )}>
                                        {meal.activeSnapshot!.qualityScore}/100
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Food Items - only show when not editing */}
                        {!isEditing && meal.items.length > 0 && (
                            <div className="card p-5 space-y-3">
                                <h2 className="text-body font-semibold text-surface-900">Detected Foods</h2>
                                <div className="divide-y divide-surface-100">
                                    {meal.items.map((item) => (
                                        <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-body font-medium text-surface-900">{item.name}</p>
                                                    <p className="text-caption text-surface-500">{item.portionDesc}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-body font-semibold text-surface-900">{Math.round(item.calories)} kcal</p>
                                                    <div className="flex items-center gap-2 text-xs mt-0.5">
                                                        <span className="text-blue-600 font-medium">P {Math.round(item.protein)}g</span>
                                                        <span className="text-surface-300">•</span>
                                                        <span className="text-amber-600 font-medium">C {Math.round(item.carbs)}g</span>
                                                        <span className="text-surface-300">•</span>
                                                        <span className="text-rose-500 font-medium">F {Math.round(item.fat)}g</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Notes */}
                        {!isEditing && notes.length > 0 && (
                            <div className="card p-5 space-y-3">
                                <h2 className="text-body font-semibold text-surface-900 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary-500" />
                                    AI Notes
                                </h2>
                                <ul className="space-y-2">
                                    {notes.map((note: string, i: number) => (
                                        <li key={i} className="text-caption text-surface-600 flex items-start gap-2">
                                            <span className="text-primary-500 mt-0.5">•</span>
                                            {note}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="card p-6 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-surface-400" />
                        <h3 className="text-body font-medium text-surface-900 mb-1">No nutrition data</h3>
                        <p className="text-caption text-surface-500 mb-4">
                            Analysis may have failed.
                        </p>
                        <button
                            onClick={handleReanalyze}
                            disabled={isReanalyzing}
                            className="btn btn-primary"
                        >
                            {isReanalyzing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4" />
                                    Reanalyze
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Actions - only show when not editing */}
                {!isEditing && !isAnalyzing && (
                    <div className="space-y-3">
                        {/* Reanalyze Button */}
                        <div className="space-y-1">
                            <button
                                onClick={() => {
                                    handleReanalyze()
                                }}
                                disabled={isReanalyzing}
                                className={cn(
                                    "btn w-full",
                                    "btn w-full btn-primary"
                                )}
                            >
                                {isReanalyzing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Reanalyzing...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-4 h-4" />
                                        Reanalyze with AI
                                    </>
                                )}
                            </button>


                            {/* Delete Button */}
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="btn w-full bg-red-50 text-red-600 hover:bg-red-100"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Meal
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function MacroBlock({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string
    value: number
    icon: React.ElementType
    color: string
}) {
    const [textColor, bgColor] = color.split(' ')
    return (
        <div className="text-center">
            <div className={cn("w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center", bgColor)}>
                <Icon className={cn("w-5 h-5", textColor)} />
            </div>
            <p className="text-heading text-surface-900">{Math.round(value)}g</p>
            <p className="text-micro text-surface-500">{label}</p>
        </div>
    )
}
