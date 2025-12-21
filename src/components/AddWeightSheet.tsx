'use client'

import { useState } from 'react'
import { X, Scale, Loader2 } from 'lucide-react'
import { useSWRConfig } from 'swr'

interface AddWeightSheetProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function AddWeightSheet({ isOpen, onClose, onSuccess }: AddWeightSheetProps) {
    const { mutate } = useSWRConfig()
    const [weight, setWeight] = useState('')
    const [note, setNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')

    const handleSubmit = async () => {
        const weightValue = parseFloat(weight)
        if (isNaN(weightValue) || weightValue <= 0) return

        setIsSubmitting(true)
        try {
            // Convert from imperial if needed
            const weightKg = unitSystem === 'metric' ? weightValue : weightValue / 2.205

            const res = await fetch('/api/weight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weight: weightKg,
                    note: note || undefined
                })
            })

            if (res.ok) {
                setWeight('')
                setNote('')
                // Revalidate all weight-related SWR caches
                mutate((key) => typeof key === 'string' && key.startsWith('/api/weight'))
                onSuccess?.()
                onClose()
            }
        } catch (error) {
            console.error('Failed to add weight:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    const isMetric = unitSystem === 'metric'

    return (
        <div className="fixed inset-0 z-50 flex items-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative w-full bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="w-12 h-1.5 bg-surface-200 rounded-full mx-auto mb-6" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <Scale className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-surface-900">Add Weight</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-surface-400 hover:text-surface-600 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Unit Toggle */}
                <div className="flex justify-center mb-4">
                    <div className="flex bg-surface-100 p-1 rounded-xl">
                        <button
                            onClick={() => setUnitSystem('metric')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isMetric ? 'bg-white shadow text-surface-900' : 'text-surface-500'
                                }`}
                        >
                            kg
                        </button>
                        <button
                            onClick={() => setUnitSystem('imperial')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${!isMetric ? 'bg-white shadow text-surface-900' : 'text-surface-500'
                                }`}
                        >
                            lb
                        </button>
                    </div>
                </div>

                {/* Weight Input */}
                <div className="mb-4">
                    <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder={isMetric ? "75.5" : "166.5"}
                        className="w-full px-4 py-4 text-2xl font-semibold text-center rounded-2xl border border-surface-200 focus:outline-none focus:border-blue-400"
                        autoFocus
                    />
                    <p className="text-center text-xs text-surface-400 mt-2">
                        {isMetric ? 'kilograms' : 'pounds'}
                    </p>
                </div>

                {/* Note Input */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-blue-400 text-sm"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!weight || isSubmitting}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'Save Weight'
                    )}
                </button>
            </div>
        </div>
    )
}
