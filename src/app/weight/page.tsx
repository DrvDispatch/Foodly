'use client'

import { useState, useEffect } from 'react'
import { Scale, Plus, Trash2, Edit2, ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, X, Check } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import { BottomNav } from '@/components/bottom-nav'

interface WeightEntry {
    id: string
    weight: number
    date: string
    note: string | null
}

export default function WeightPage() {
    const [entries, setEntries] = useState<WeightEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Add/Edit form state
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formWeight, setFormWeight] = useState('')
    const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [formNote, setFormNote] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Load entries
    useEffect(() => {
        fetchEntries()
    }, [])

    const fetchEntries = async () => {
        try {
            const res = await fetch('/api/weight/history')
            if (!res.ok) throw new Error('Failed to load')
            const data = await res.json()
            setEntries(data.entries || [])
        } catch (err) {
            setError('Failed to load weight history')
        } finally {
            setIsLoading(false)
        }
    }

    // Calculate stats
    const stats = (() => {
        if (entries.length === 0) return null
        const latestWeight = entries[0]?.weight || 0
        // Change from PREVIOUS entry (second entry), not first (oldest)
        const previousWeight = entries[1]?.weight || latestWeight
        const change = latestWeight - previousWeight
        const avgWeight = entries.reduce((sum, e) => sum + e.weight, 0) / entries.length
        const minWeight = Math.min(...entries.map(e => e.weight))
        const maxWeight = Math.max(...entries.map(e => e.weight))
        return { latestWeight, change, avgWeight, minWeight, maxWeight, total: entries.length }
    })()

    const handleSave = async () => {
        if (!formWeight) return
        setIsSaving(true)

        try {
            const method = editingId ? 'PUT' : 'POST'
            const url = editingId ? `/api/weight/${editingId}` : '/api/weight'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weight: parseFloat(formWeight),
                    date: formDate,
                    note: formNote || null
                })
            })

            if (!res.ok) throw new Error('Failed to save')

            await fetchEntries()
            resetForm()
        } catch (err) {
            setError('Failed to save entry')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this weight entry?')) return

        try {
            const res = await fetch(`/api/weight/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setEntries(prev => prev.filter(e => e.id !== id))
        } catch (err) {
            setError('Failed to delete entry')
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

    const getTrendIcon = () => {
        if (!stats || stats.change === 0) return <Minus className="w-4 h-4" />
        return stats.change > 0
            ? <TrendingUp className="w-4 h-4 text-amber-500" />
            : <TrendingDown className="w-4 h-4 text-green-500" />
    }

    return (
        <div className="min-h-screen bg-surface-50 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-surface-50/95 backdrop-blur-lg border-b border-surface-100">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Scale className="w-6 h-6 text-primary-500" />
                            <h1 className="text-2xl font-bold text-surface-900">Weight</h1>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Log Weight
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-4 py-6 space-y-6">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <p className="text-xs text-surface-400 uppercase tracking-wider">Current</p>
                            <p className="text-2xl font-bold text-surface-900">{stats.latestWeight.toFixed(1)} kg</p>
                            <div className="flex items-center gap-1 mt-1">
                                {getTrendIcon()}
                                <span className={cn(
                                    "text-sm font-medium",
                                    stats.change > 0 ? "text-amber-600" : stats.change < 0 ? "text-green-600" : "text-surface-400"
                                )}>
                                    {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} kg
                                </span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                            <p className="text-xs text-surface-400 uppercase tracking-wider">Range</p>
                            <p className="text-lg font-bold text-surface-900">
                                {stats.minWeight.toFixed(1)} - {stats.maxWeight.toFixed(1)}
                            </p>
                            <p className="text-sm text-surface-500 mt-1">{stats.total} entries</p>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-danger-light text-danger-dark rounded-xl p-4">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && entries.length === 0 && (
                    <div className="text-center py-12">
                        <Scale className="w-16 h-16 text-surface-200 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700">No weight entries yet</h3>
                        <p className="text-surface-500 mt-1">Start tracking your weight progress</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary mt-4"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Log Your First Weight
                        </button>
                    </div>
                )}

                {/* Entries List */}
                {entries.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wider">
                            History
                        </h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 divide-y divide-surface-100">
                            {entries.map((entry, idx) => {
                                const prevEntry = entries[idx + 1]
                                const diff = prevEntry ? entry.weight - prevEntry.weight : 0
                                const date = parseISO(entry.date)

                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-4 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary-50 flex flex-col items-center justify-center">
                                                <span className="text-sm font-bold text-primary-600">
                                                    {isValid(date) ? format(date, 'd') : '--'}
                                                </span>
                                                <span className="text-[10px] text-primary-400 uppercase">
                                                    {isValid(date) ? format(date, 'MMM') : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-surface-900">
                                                    {entry.weight.toFixed(1)} kg
                                                </p>
                                                {diff !== 0 && (
                                                    <p className={cn(
                                                        "text-sm",
                                                        diff > 0 ? "text-amber-600" : "text-green-600"
                                                    )}>
                                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                                                    </p>
                                                )}
                                                {entry.note && (
                                                    <p className="text-sm text-surface-500 mt-0.5">{entry.note}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                className="p-2 text-surface-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-2 text-surface-400 hover:text-danger hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-surface-900">
                                {editingId ? 'Edit Entry' : 'Log Weight'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="p-2 text-surface-400 hover:text-surface-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-surface-700 block mb-2">
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
                                <label className="text-sm font-medium text-surface-700 block mb-2">
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
                                <label className="text-sm font-medium text-surface-700 block mb-2">
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
