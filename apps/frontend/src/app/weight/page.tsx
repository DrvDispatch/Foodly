'use client'

import { useState, useMemo } from 'react'
import { Scale, Plus, Trash2, Edit2, TrendingUp, TrendingDown, Minus, X, Check, Target, ChevronRight, Sparkles } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { BottomNav } from '@/components/bottom-nav'
import { WeightPageSkeleton } from '@/components/ui/skeletons'
import { WeightChart } from '@/components/trends/WeightChart'
import { useWeightEntries, type WeightEntry } from '@/hooks/useWeightEntries'
import { useWeightTrend } from '@/hooks/useWeightTrend'

export default function WeightJourneyPage() {
    const { entries, isLoading, error, mutate } = useWeightEntries()
    const weightTrend = useWeightTrend('90d') // 90 days for good context

    // Add/Edit form state
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formWeight, setFormWeight] = useState('')
    const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [formNote, setFormNote] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)

    // Goal progress calculation
    const goalProgress = useMemo(() => {
        if (!weightTrend.startingWeight || !weightTrend.targetWeight || entries.length === 0) {
            return null
        }

        const currentWeight = entries[0]?.weight || weightTrend.startingWeight
        const totalChange = Math.abs(weightTrend.targetWeight - weightTrend.startingWeight)
        const progressMade = Math.abs(currentWeight - weightTrend.startingWeight)

        // Ensure progress is in the right direction
        const isLosingGoal = weightTrend.targetWeight < weightTrend.startingWeight
        const isGainingGoal = weightTrend.targetWeight > weightTrend.startingWeight

        let progressPercentage = 0
        if (totalChange > 0) {
            if (isLosingGoal && currentWeight <= weightTrend.startingWeight) {
                progressPercentage = Math.min((progressMade / totalChange) * 100, 100)
            } else if (isGainingGoal && currentWeight >= weightTrend.startingWeight) {
                progressPercentage = Math.min((progressMade / totalChange) * 100, 100)
            }
        }

        const weightRemaining = Math.abs(weightTrend.targetWeight - currentWeight)
        const weeklyPace = weightTrend.weeklyPace || 0.5
        const weeksToGo = weightRemaining / weeklyPace

        return {
            currentWeight,
            targetWeight: weightTrend.targetWeight,
            startingWeight: weightTrend.startingWeight,
            progressPercentage: Math.round(progressPercentage),
            weightRemaining: weightRemaining.toFixed(1),
            weeksToGo: Math.ceil(weeksToGo),
            isLosingGoal,
            isGainingGoal,
            isAtGoal: Math.abs(currentWeight - weightTrend.targetWeight) < 0.5
        }
    }, [entries, weightTrend])

    const handleSave = async () => {
        if (!formWeight) return
        setIsSaving(true)

        try {
            if (editingId) {
                await apiClient.put(`/weight/${editingId}`, {
                    weight: parseFloat(formWeight),
                    date: formDate,
                    note: formNote || null
                })
            } else {
                await apiClient.post('/weight', {
                    weight: parseFloat(formWeight),
                    date: formDate,
                    note: formNote || null
                })
            }

            await mutate()
            resetForm()
        } catch (err) {
            setLocalError('Failed to save entry')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this weight entry?')) return

        try {
            await apiClient.delete(`/weight/${id}`)
            await mutate()
        } catch (err) {
            setLocalError('Failed to delete entry')
        }
    }

    const handleEdit = (entry: WeightEntry) => {
        setEditingId(entry.id)
        setFormWeight(entry.weight.toString())
        setFormDate(entry.date.split('T')[0])
        setFormNote(entry.note || '')
        setShowAddForm(true)
    }

    const resetForm = () => {
        setShowAddForm(false)
        setEditingId(null)
        setFormWeight('')
        setFormDate(format(new Date(), 'yyyy-MM-dd'))
        setFormNote('')
    }

    const recentEntries = entries.slice(0, 5)

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-lg border-b border-surface-100 dark:border-surface-800">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Scale className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-surface-900 dark:text-white">Weight Journey</h1>
                                <p className="text-xs text-surface-500 dark:text-surface-400">Track your progress</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Log
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-4 py-6 space-y-6">
                {/* Loading */}
                {isLoading && <WeightPageSkeleton />}

                {/* Error */}
                {(error || localError) && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl p-4">
                        {error?.message || localError}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && entries.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                            <Scale className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Start Your Journey</h3>
                        <p className="text-surface-500 dark:text-surface-400 mt-1 mb-6">Log your first weight to begin tracking progress</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Log Your First Weight
                        </button>
                    </div>
                )}

                {/* Goal Progress Hero Card */}
                {goalProgress && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-5 text-white shadow-lg">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <div className="relative z-10">
                            {/* Progress Ring */}
                            <div className="flex items-center gap-5 mb-4">
                                <div className="relative w-24 h-24">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            fill="none"
                                            stroke="rgba(255,255,255,0.2)"
                                            strokeWidth="8"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 40}
                                            strokeDashoffset={2 * Math.PI * 40 * (1 - goalProgress.progressPercentage / 100)}
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold">{goalProgress.progressPercentage}%</span>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <p className="text-white/80 text-sm mb-1">
                                        {goalProgress.isAtGoal ? '🎉 Goal reached!' : goalProgress.isLosingGoal ? 'Weight to lose' : 'Weight to gain'}
                                    </p>
                                    <p className="text-3xl font-bold mb-1">
                                        {goalProgress.isAtGoal ? 'Maintaining' : `${goalProgress.weightRemaining} kg`}
                                    </p>
                                    {!goalProgress.isAtGoal && (
                                        <p className="text-white/70 text-sm">
                                            ~{goalProgress.weeksToGo} weeks to go
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Weight Bar */}
                            <div className="bg-white/10 rounded-full p-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="text-center">
                                        <p className="text-white/60 text-xs">Start</p>
                                        <p className="font-semibold">{goalProgress.startingWeight.toFixed(1)} kg</p>
                                    </div>
                                    <div className="flex-1 mx-4 relative">
                                        <div className="h-2 bg-white/20 rounded-full">
                                            <div
                                                className="h-full bg-white rounded-full transition-all duration-1000"
                                                style={{ width: `${goalProgress.progressPercentage}%` }}
                                            />
                                        </div>
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-indigo-500 transition-all duration-1000"
                                            style={{ left: `calc(${goalProgress.progressPercentage}% - 8px)` }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white/60 text-xs">Goal</p>
                                        <p className="font-semibold">{goalProgress.targetWeight.toFixed(1)} kg</p>
                                    </div>
                                </div>
                            </div>

                            {/* Current Weight Badge */}
                            <div className="mt-4 flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    <span className="font-medium">Now: {goalProgress.currentWeight.toFixed(1)} kg</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Goal Set - Prompt */}
                {entries.length > 0 && !goalProgress && (
                    <Link
                        href="/settings/goals"
                        className="block p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-amber-900 dark:text-amber-100">Set a target weight</p>
                                <p className="text-sm text-amber-700 dark:text-amber-300">Track your progress toward a goal</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-amber-400" />
                        </div>
                    </Link>
                )}

                {/* Weight Chart */}
                {entries.length > 0 && (
                    <section>
                        <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-3">
                            Your Trend
                        </h2>
                        <WeightChart
                            entries={weightTrend.entries}
                            targetWeight={weightTrend.targetWeight}
                            startingWeight={weightTrend.startingWeight}
                            unitSystem={weightTrend.unitSystem}
                            goalType={weightTrend.goalType}
                            weeklyPace={weightTrend.weeklyPace}
                            dateRange="90d"
                        />
                    </section>
                )}

                {/* Recent History */}
                {entries.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                                Recent Entries
                            </h2>
                            {entries.length > 5 && (
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="text-sm text-primary-600 dark:text-primary-400 font-medium"
                                >
                                    {showHistory ? 'Show less' : `View all (${entries.length})`}
                                </button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm border border-surface-100 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-700">
                            {(showHistory ? entries : recentEntries).map((entry, idx) => {
                                const prevEntry = entries[idx + 1]
                                const diff = prevEntry ? entry.weight - prevEntry.weight : 0
                                const date = parseISO(entry.date)

                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-4 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex flex-col items-center justify-center">
                                                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                                                    {isValid(date) ? format(date, 'd') : '--'}
                                                </span>
                                                <span className="text-[10px] text-primary-400 dark:text-primary-500 uppercase">
                                                    {isValid(date) ? format(date, 'MMM') : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-surface-900 dark:text-white">
                                                    {entry.weight.toFixed(1)} kg
                                                </p>
                                                {diff !== 0 && (
                                                    <p className={cn(
                                                        "text-sm flex items-center gap-1",
                                                        diff > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                                                    )}>
                                                        {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                                                    </p>
                                                )}
                                                {entry.note && (
                                                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{entry.note}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                className="p-2 text-surface-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Coach Link */}
                {entries.length > 2 && (
                    <Link
                        href="/coach?context=weight"
                        className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-700/50"
                    >
                        <Sparkles className="w-5 h-5 text-teal-500" />
                        <span className="font-medium text-teal-700 dark:text-teal-300">Discuss your weight journey with AI Coach</span>
                    </Link>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
                    <div className="bg-white dark:bg-surface-800 w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                                {editingId ? 'Edit Entry' : 'Log Weight'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-white rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-surface-700 dark:text-surface-300 block mb-2">
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formWeight}
                                    onChange={(e) => setFormWeight(e.target.value)}
                                    className="input w-full text-2xl font-bold text-center"
                                    placeholder="75.0"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-surface-700 dark:text-surface-300 block mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-surface-700 dark:text-surface-300 block mb-2">
                                    Note (optional)
                                </label>
                                <input
                                    type="text"
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    className="input w-full"
                                    placeholder="After workout, morning weight..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={resetForm}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formWeight || isSaving}
                                className="btn btn-primary flex-1"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        {editingId ? 'Update' : 'Save'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    )
}
