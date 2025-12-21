'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Scale, Plus, TrendingUp, Target, X } from 'lucide-react'
import useSWR from 'swr'
import { format } from 'date-fns'

interface WeightData {
    entries: Array<{
        id: string
        weight: number
        date: string
        note?: string
    }>
    targetWeight?: number
    currentWeight?: number
    unitSystem: string
}

interface WeightTrackingSectionProps {
    onNavigateToTrends?: () => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function WeightTrackingSection({ onNavigateToTrends }: WeightTrackingSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [newWeight, setNewWeight] = useState('')
    const [newNote, setNewNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data, mutate } = useSWR<WeightData>('/api/weight?limit=5', fetcher)

    const isMetric = data?.unitSystem !== 'imperial'
    const latestWeight = data?.currentWeight || data?.entries?.[0]?.weight
    const targetWeight = data?.targetWeight

    const displayWeight = (w?: number) => {
        if (!w) return '—'
        if (isMetric) return `${w.toFixed(1)} kg`
        return `${(w * 2.205).toFixed(1)} lb`
    }

    const handleAddWeight = async () => {
        const weight = parseFloat(newWeight)
        if (isNaN(weight) || weight <= 0) return

        setIsSubmitting(true)
        try {
            // Convert from imperial if needed
            const weightKg = isMetric ? weight : weight / 2.205

            await fetch('/api/weight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weight: weightKg,
                    note: newNote || undefined
                })
            })

            mutate()
            setShowAddSheet(false)
            setNewWeight('')
            setNewNote('')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-surface-400" />
                    <span className="text-sm font-semibold text-surface-900">Weight Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-400">{displayWeight(latestWeight)}</span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-surface-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-surface-400" />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Current & Target */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Scale className="w-3 h-3 text-surface-400" />
                                <span className="text-[10px] text-surface-500 uppercase">Current</span>
                            </div>
                            <p className="text-base font-bold text-surface-900">{displayWeight(latestWeight)}</p>
                        </div>
                        <div className="bg-surface-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="w-3 h-3 text-surface-400" />
                                <span className="text-[10px] text-surface-500 uppercase">Target</span>
                            </div>
                            <p className="text-base font-bold text-surface-900">{displayWeight(targetWeight)}</p>
                        </div>
                    </div>

                    {/* Add Weight Button */}
                    <button
                        onClick={() => setShowAddSheet(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-primary-50 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Weight Entry
                    </button>

                    {/* Recent Entries */}
                    {data?.entries && data.entries.length > 0 && (
                        <div>
                            <p className="text-xs text-surface-500 mb-2">Recent</p>
                            <div className="space-y-2">
                                {data.entries.slice(0, 3).map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                        <div>
                                            <span className="text-sm font-medium text-surface-900">
                                                {displayWeight(entry.weight)}
                                            </span>
                                            {entry.note && (
                                                <span className="ml-2 text-[10px] text-surface-400">{entry.note}</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-surface-400">
                                            {format(new Date(entry.date), 'MMM d')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Link to Trends */}
                    <button
                        onClick={onNavigateToTrends}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-surface-500 hover:text-primary-600"
                    >
                        <TrendingUp className="w-3 h-3" />
                        View weight trends
                    </button>
                </div>
            )}

            {/* Add Weight Sheet */}
            {showAddSheet && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="w-full bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-surface-900">Add Weight</h3>
                            <button onClick={() => setShowAddSheet(false)} className="p-2 text-surface-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Weight Input */}
                        <div className="mb-4">
                            <label className="text-xs text-surface-500 mb-1 block">
                                Weight ({isMetric ? 'kg' : 'lb'})
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value)}
                                placeholder={isMetric ? "75.5" : "166.5"}
                                className="w-full px-4 py-3 text-lg rounded-xl border border-surface-200 focus:outline-none focus:border-primary-400"
                            />
                        </div>

                        {/* Note Input */}
                        <div className="mb-6">
                            <label className="text-xs text-surface-500 mb-1 block">
                                Note (optional)
                            </label>
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="e.g., morning, post-workout"
                                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-primary-400"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleAddWeight}
                            disabled={!newWeight || isSubmitting}
                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Weight'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
