'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Leaf, AlertTriangle, X, Plus, Check } from 'lucide-react'

interface DietarySectionProps {
    profile: {
        dietaryPrefs?: string[]
        allergies?: string[]
    }
    onUpdate?: (field: string, value: any) => void
}

// Dietary pattern options
const DIETARY_PATTERNS = [
    { value: 'omnivore', label: 'No restrictions' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'pescatarian', label: 'Pescatarian' },
    { value: 'keto', label: 'Keto' },
    { value: 'paleo', label: 'Paleo' },
    { value: 'halal', label: 'Halal' },
    { value: 'kosher', label: 'Kosher' }
]

// Common allergies
const COMMON_ALLERGIES = [
    'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat',
    'Soy', 'Fish', 'Shellfish', 'Sesame'
]

export function DietarySection({ profile, onUpdate }: DietarySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showAllergyInput, setShowAllergyInput] = useState(false)
    const [newAllergy, setNewAllergy] = useState('')

    const dietaryPrefs = profile.dietaryPrefs || []
    const allergies = profile.allergies || []

    // Get current dietary pattern
    const currentPattern = DIETARY_PATTERNS.find(p => dietaryPrefs.includes(p.value))?.label || 'No restrictions'

    const togglePreference = (pref: string) => {
        const updated = dietaryPrefs.includes(pref)
            ? dietaryPrefs.filter(p => p !== pref)
            : [...dietaryPrefs, pref]
        onUpdate?.('dietaryPrefs', updated)
    }

    const addAllergy = (allergy: string) => {
        if (!allergy.trim() || allergies.includes(allergy.trim())) return
        onUpdate?.('allergies', [...allergies, allergy.trim()])
        setNewAllergy('')
        setShowAllergyInput(false)
    }

    const removeAllergy = (allergy: string) => {
        onUpdate?.('allergies', allergies.filter(a => a !== allergy))
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-surface-400" />
                    <span className="text-sm font-semibold text-surface-900">Dietary Preferences</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-400">{currentPattern}</span>
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
                    {/* Dietary Patterns */}
                    <div>
                        <p className="text-xs text-surface-500 mb-2">Dietary Pattern</p>
                        <div className="flex flex-wrap gap-2">
                            {DIETARY_PATTERNS.map(pattern => (
                                <button
                                    key={pattern.value}
                                    onClick={() => togglePreference(pattern.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                        dietaryPrefs.includes(pattern.value)
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : "bg-surface-50 text-surface-600 border border-surface-200 hover:border-surface-300"
                                    )}
                                >
                                    {pattern.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Allergies */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <p className="text-xs text-surface-500">Allergies</p>
                            </div>
                        </div>

                        {/* Current Allergies */}
                        {allergies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {allergies.map(allergy => (
                                    <span
                                        key={allergy}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium"
                                    >
                                        {allergy}
                                        <button
                                            onClick={() => removeAllergy(allergy)}
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Quick Add Common Allergies */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {COMMON_ALLERGIES.filter(a => !allergies.includes(a)).slice(0, 5).map(allergy => (
                                <button
                                    key={allergy}
                                    onClick={() => addAllergy(allergy)}
                                    className="px-2 py-1 text-[10px] bg-surface-50 text-surface-500 rounded-full hover:bg-surface-100"
                                >
                                    + {allergy}
                                </button>
                            ))}
                        </div>

                        {/* Custom Allergy Input */}
                        {showAllergyInput ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newAllergy}
                                    onChange={(e) => setNewAllergy(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addAllergy(newAllergy)}
                                    placeholder="Enter allergy..."
                                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-surface-200 focus:outline-none focus:border-primary-400"
                                    autoFocus
                                />
                                <button
                                    onClick={() => addAllergy(newAllergy)}
                                    className="p-2 bg-primary-600 text-white rounded-lg"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { setShowAllergyInput(false); setNewAllergy('') }}
                                    className="p-2 text-surface-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAllergyInput(true)}
                                className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700"
                            >
                                <Plus className="w-3 h-3" />
                                Add custom allergy
                            </button>
                        )}
                    </div>

                    {/* Note about constraints */}
                    <p className="text-[10px] text-surface-400 text-center">
                        These are constraints, not goals. They help AI understand your dietary needs.
                    </p>
                </div>
            )}
        </div>
    )
}
