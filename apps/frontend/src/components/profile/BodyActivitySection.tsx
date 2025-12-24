'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Ruler, Scale, Calendar, Activity, Settings2 } from 'lucide-react'

interface BodyActivitySectionProps {
    profile: {
        sex?: string
        age?: number
        heightCm?: number
        currentWeight?: number
        activityLevel?: string
        unitSystem?: string
    }
    onUpdate?: (field: string, value: any) => void
}

const ACTIVITY_OPTIONS = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
    { value: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
    { value: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
    { value: 'active', label: 'Active', desc: '6-7 days/week' },
    { value: 'athlete', label: 'Very Active', desc: 'Athlete or physical job' }
]

export function BodyActivitySection({ profile, onUpdate }: BodyActivitySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const isMetric = profile.unitSystem !== 'imperial'

    // Convert for display
    const displayHeight = () => {
        if (!profile.heightCm) return '—'
        if (isMetric) return `${profile.heightCm} cm`
        const inches = Math.round(profile.heightCm / 2.54)
        const feet = Math.floor(inches / 12)
        const remainingInches = inches % 12
        return `${feet}'${remainingInches}"`
    }

    const displayWeight = () => {
        if (!profile.currentWeight) return '—'
        if (isMetric) return `${profile.currentWeight} kg`
        return `${Math.round(profile.currentWeight * 2.205)} lb`
    }

    const activityLabel = ACTIVITY_OPTIONS.find(a => a.value === profile.activityLevel)?.label || 'Not set'

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-surface-400" />
                    <span className="text-sm font-semibold text-surface-900">Body & Activity</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-400">{displayWeight()}</span>
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
                    {/* Body Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Height */}
                        <div className="bg-surface-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Ruler className="w-3 h-3 text-surface-400" />
                                <span className="text-[10px] text-surface-500 uppercase">Height</span>
                            </div>
                            <p className="text-sm font-semibold text-surface-900">{displayHeight()}</p>
                        </div>

                        {/* Weight */}
                        <div className="bg-surface-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Scale className="w-3 h-3 text-surface-400" />
                                <span className="text-[10px] text-surface-500 uppercase">Weight</span>
                            </div>
                            <p className="text-sm font-semibold text-surface-900">{displayWeight()}</p>
                        </div>

                        {/* Age */}
                        <div className="bg-surface-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-3 h-3 text-surface-400" />
                                <span className="text-[10px] text-surface-500 uppercase">Age</span>
                            </div>
                            <p className="text-sm font-semibold text-surface-900">{profile.age || '—'}</p>
                        </div>

                        {/* Sex */}
                        <div className="bg-surface-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-surface-400">👤</span>
                                <span className="text-[10px] text-surface-500 uppercase">Sex</span>
                            </div>
                            <p className="text-sm font-semibold text-surface-900 capitalize">{profile.sex || '—'}</p>
                        </div>
                    </div>

                    {/* Activity Level */}
                    <div>
                        <p className="text-xs text-surface-500 mb-2">Activity Level</p>
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-xl">
                            <Activity className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-medium text-surface-900">{activityLabel}</span>
                        </div>
                    </div>

                    {/* Unit System */}
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-surface-400" />
                            <span className="text-xs text-surface-600">Units</span>
                        </div>
                        <div className="flex bg-surface-100 p-0.5 rounded-lg">
                            <button
                                className={cn(
                                    "px-3 py-1 text-[10px] font-semibold rounded-md transition-all",
                                    isMetric ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"
                                )}
                                onClick={() => onUpdate?.('unitSystem', 'metric')}
                            >
                                Metric
                            </button>
                            <button
                                className={cn(
                                    "px-3 py-1 text-[10px] font-semibold rounded-md transition-all",
                                    !isMetric ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"
                                )}
                                onClick={() => onUpdate?.('unitSystem', 'imperial')}
                            >
                                Imperial
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
