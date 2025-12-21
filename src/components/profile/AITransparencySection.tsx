'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Sparkles, HelpCircle, Loader2 } from 'lucide-react'

interface AITransparencySectionProps {
    className?: string
}

export function AITransparencySection({ className }: AITransparencySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isExplaining, setIsExplaining] = useState(false)
    const [explanation, setExplanation] = useState<string | null>(null)

    const handleExplainTargets = async () => {
        setIsExplaining(true)
        try {
            const res = await fetch('/api/profile/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            setExplanation(data.explanation)
        } catch (error) {
            setExplanation('Unable to explain targets at this time.')
        } finally {
            setIsExplaining(false)
        }
    }

    return (
        <div className={cn("bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden", className)}>
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-surface-400" />
                    <span className="text-sm font-semibold text-surface-900">AI Settings</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-surface-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-surface-400" />
                )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Explain Targets */}
                    <div className="bg-purple-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">Explain My Targets</span>
                            </div>
                            <button
                                onClick={handleExplainTargets}
                                disabled={isExplaining}
                                className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200 disabled:opacity-50"
                            >
                                {isExplaining ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    'Explain'
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-purple-700">
                            Understand why your calorie and macro targets are set the way they are.
                        </p>
                        {explanation && (
                            <div className="mt-3 pt-3 border-t border-purple-200">
                                <p className="text-xs text-purple-800 leading-relaxed">{explanation}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

