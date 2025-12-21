'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetricType } from './MetricTabs'
import type { TimeRange } from './TimeRangeSelector'

interface TrendStats {
    mean: number
    stdDev: number
    consistencyScore: number
    trend: 'up' | 'down' | 'stable'
}

interface ExplainResult {
    headline: string
    guidance: string
    technical: string
    confidence?: {
        loggedDays: number
        totalDays: number
    }
}

interface TrendExplainButtonProps {
    metric: MetricType
    range: TimeRange
    stats: TrendStats
    goal: number
    dataPoints: any[]
}

export function TrendExplainButton({ metric, range, stats, goal, dataPoints }: TrendExplainButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<ExplainResult | null>(null)
    const [showTechnical, setShowTechnical] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleExplain = async () => {
        if (isLoading) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/trends/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metric, range, stats, goal, dataPoints })
            })

            if (!response.ok) {
                throw new Error('Failed to explain')
            }

            const data = await response.json()
            setResult(data)
        } catch (err) {
            setError('Failed to generate explanation')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClear = () => {
        setResult(null)
        setShowTechnical(false)
        setError(null)
    }

    // Show layered explanation result
    if (result) {
        return (
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-4 w-full">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-xs font-semibold text-purple-700">What this trend means</span>
                    </div>
                    <button
                        onClick={handleClear}
                        className="p-1 text-purple-400 hover:text-purple-600 rounded-full hover:bg-purple-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Headline - Goal-aware, human-friendly */}
                <p className="text-sm font-medium text-purple-900 mb-2">
                    {result.headline}
                </p>

                {/* Guidance - Forward-looking, actionable */}
                {result.guidance && (
                    <p className="text-sm text-purple-800 leading-relaxed">
                        {result.guidance}
                    </p>
                )}

                {/* Technical details toggle */}
                {result.technical && (
                    <div className="mt-3 pt-3 border-t border-purple-100">
                        <button
                            onClick={() => setShowTechnical(!showTechnical)}
                            className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-700"
                        >
                            {showTechnical ? (
                                <>
                                    <ChevronUp className="w-3 h-3" />
                                    Hide details
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3 h-3" />
                                    View technical details
                                </>
                            )}
                        </button>

                        {/* Technical content */}
                        {showTechnical && (
                            <div className="mt-2 text-xs text-purple-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                                <p>{result.technical}</p>
                                {result.confidence && (
                                    <p className="mt-2 text-[10px] text-purple-400">
                                        Based on {result.confidence.loggedDays} of {result.confidence.totalDays} days logged
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Show error
    if (error) {
        return (
            <button
                onClick={handleExplain}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm hover:bg-red-100 transition-all"
            >
                <Sparkles className="w-4 h-4" />
                Try again
            </button>
        )
    }

    // Default button
    return (
        <button
            onClick={handleExplain}
            disabled={isLoading}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                isLoading
                    ? "bg-purple-100 text-purple-400"
                    : "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl active:scale-95"
            )}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                </>
            ) : (
                <>
                    <Sparkles className="w-4 h-4" />
                    What does this mean?
                </>
            )}
        </button>
    )
}

