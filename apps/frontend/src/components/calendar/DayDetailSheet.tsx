'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { X, ChevronRight, Plus } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { MealCard } from '@/components/meal-card'
import { GoalRing } from '@/components/goal-ring'

// Icons for the context editor
const CONTEXT_TAGS = [
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'training', label: 'Training', icon: '🏋️' },
    { id: 'social', label: 'Social', icon: '🎉' },
    { id: 'rest', label: 'Rest', icon: '🌙' },
    { id: 'low_intake', label: 'Low Intake', icon: '📉' },
    { id: 'unusual', label: 'Unusual', icon: '⏰' },
]

interface DayDetailSheetProps {
    dayKey: string | null
    onClose: () => void
}

export function DayDetailSheet({ dayKey, onClose }: DayDetailSheetProps) {
    const [isClosing, setIsClosing] = useState(false)

    // Fetch day details
    const { data, mutate } = useSWR(
        dayKey ? `/api/calendar/day?dayKey=${dayKey}` : null,
        (url) => fetch(url).then(res => res.json())
    )

    // Context editing state
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // Sync tags when data loads
    useEffect(() => {
        if (data?.context?.tags) {
            setSelectedTags(data.context.tags)
        } else {
            setSelectedTags([])
        }
    }, [data])

    // Calculate totals on the fly from meals (more reliable for "today" than potentially stale summary)
    const totals = data?.meals?.reduce((acc: any, meal: any) => {
        const snap = meal.activeSnapshot || {}
        return {
            calories: acc.calories + (snap.calories || 0),
            protein: acc.protein + (snap.protein || 0),
            carbs: acc.carbs + (snap.carbs || 0),
            fat: acc.fat + (snap.fat || 0)
        }
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 }) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            setIsClosing(false)
            onClose()
        }, 300)
    }

    const toggleTag = async (tagId: string) => {
        const newTags = selectedTags.includes(tagId)
            ? selectedTags.filter(t => t !== tagId)
            : [...selectedTags, tagId]

        setSelectedTags(newTags)

        // Optimistic / Fire-and-forget update
        try {
            await fetch('/api/calendar/context', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayKey,
                    tags: newTags
                })
            })
            mutate() // Revalidate to be sure
        } catch (e) {
            console.error("Failed to save context", e)
        }
    }

    if (!dayKey) return null

    // Date formatting
    const dateObj = new Date(dayKey)
    // NOTE: This processes specific dayKey as UTC string -> Local Date?
    // Since dayKey is YYYY-MM-DD, `new Date(dayKey)` creates UTC midnight.
    // `format` will use local timezone if not careful.
    // However, since we want to display the DATE part matching the key,
    // we should treat it as "noon" to avoid timezone rollover issues visually?
    // Or just parse manually.
    const [y, m, d] = dayKey.split('-').map(Number)
    const displayDate = new Date(y, m - 1, d)

    return (
        <>
            {/* Scrim / Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 z-40 transition-opacity",
                    isClosing ? "opacity-0" : "animate-fade-in"
                )}
                onClick={handleClose}
            />

            {/* Bottom Sheet */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto pb-8 transition-transform duration-300",
                    isClosing ? "translate-y-full" : "animate-slide-up"
                )}
            >
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-1" onClick={handleClose}>
                    <div className="w-12 h-1.5 bg-surface-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-4 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-heading font-bold text-surface-900">
                            {format(displayDate, 'EEEE, MMM d')}
                        </h2>
                        <p className="text-caption text-surface-500">
                            {data?.summary?.mealCount || 0} meals logged
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 bg-surface-100 rounded-full text-surface-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 pt-4 space-y-6">

                    {/* Summary Card */}
                    {data && (
                        <div className="card p-4 flex items-center gap-4 bg-surface-50">
                            <GoalRing
                                current={totals.calories}
                                goal={2000}
                                size="md"
                            />
                            <div className="flex-1 space-y-3">
                                <div className="flex justify-between text-caption font-semibold">
                                    <span>{Math.round(totals.calories)} kcal</span>
                                    <span className="text-surface-400">Target: 2000</span>
                                </div>
                                {/* Macro Bars */}
                                <div className="space-y-2">
                                    {/* Protein */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-micro text-surface-500">
                                            <span>Protein</span>
                                            <span>{Math.round(totals.protein)}g</span>
                                        </div>
                                        <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${Math.min((totals.protein / 150) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Carbs */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-micro text-surface-500">
                                            <span>Carbs</span>
                                            <span>{Math.round(totals.carbs)}g</span>
                                        </div>
                                        <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-400 rounded-full"
                                                style={{ width: `${Math.min((totals.carbs / 200) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Fat */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-micro text-surface-500">
                                            <span>Fat</span>
                                            <span>{Math.round(totals.fat)}g</span>
                                        </div>
                                        <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400 rounded-full"
                                                style={{ width: `${Math.min((totals.fat / 70) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Context Editor */}
                    <div>
                        <h3 className="text-caption font-bold text-surface-900 mb-3 uppercase tracking-wide">
                            Day Context
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {CONTEXT_TAGS.map(tag => {
                                const isSelected = selectedTags.includes(tag.id)
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all border",
                                            isSelected
                                                ? "bg-surface-900 text-white border-surface-900 shadow-md"
                                                : "bg-white text-surface-600 border-surface-200 hover:border-surface-300"
                                        )}
                                    >
                                        <span>{tag.icon}</span>
                                        <span>{tag.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-micro text-surface-400 mt-2">
                            Tags help memory and prevent AI judgement.
                        </p>
                    </div>

                    {/* Meals List */}
                    <div>
                        <h3 className="text-caption font-bold text-surface-900 mb-3 uppercase tracking-wide">
                            Meals
                        </h3>
                        {data?.meals && data.meals.length > 0 ? (
                            <div className="space-y-3">
                                {data.meals.map((meal: any) => (
                                    <MealCard key={meal.id} meal={meal} onClick={() => { }} />
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-surface-400 bg-surface-50 rounded-xl border border-dashed border-surface-200">
                                No meals logged for this day.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    )
}
