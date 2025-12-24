'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, Search, History, Clock, Lightbulb, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface FilterSheetProps {
    isOpen: boolean
    onClose: () => void
    monthKey: string
    onAIFilterResult?: (matchingDays: string[], interpretation: string) => void
    onClearFilter?: () => void
}

// AI Suggestion presets - these are example queries users can tap
const AI_SUGGESTIONS = [
    { text: "Days I went over calories", icon: "🔴" },
    { text: "Days I hit my protein goal", icon: "💪" },
    { text: "Weekends I didn't track", icon: "📅" },
    { text: "High calories, low protein", icon: "⚠️" },
    { text: "My best tracking days", icon: "🌟" },
    { text: "Days under 1500 calories", icon: "📉" },
]

// Storage key for query history
const HISTORY_KEY = 'calendar_ai_query_history'

export function FilterSheet({
    isOpen,
    onClose,
    monthKey,
    onAIFilterResult,
    onClearFilter
}: FilterSheetProps) {
    const [isClosing, setIsClosing] = useState(false)
    const [aiQuery, setAiQuery] = useState('')
    const [isAILoading, setIsAILoading] = useState(false)
    const [aiInterpretation, setAiInterpretation] = useState<string | null>(null)
    const [queryHistory, setQueryHistory] = useState<string[]>([])

    // Load query history from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(HISTORY_KEY)
            if (stored) {
                try {
                    setQueryHistory(JSON.parse(stored))
                } catch (e) {
                    console.error('Failed to parse query history:', e)
                }
            }
        }
    }, [])

    // Save query to history
    const saveToHistory = (query: string) => {
        const trimmed = query.trim()
        if (!trimmed) return

        setQueryHistory(prev => {
            // Remove duplicate if exists, add to front, limit to 5
            const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase())
            const updated = [trimmed, ...filtered].slice(0, 5)

            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
            return updated
        })
    }

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            setIsClosing(false)
            onClose()
        }, 200)
    }

    const handleAISearch = async (query?: string) => {
        const searchQuery = query || aiQuery
        if (!searchQuery.trim() || isAILoading) return

        setIsAILoading(true)
        setAiInterpretation(null)
        setAiQuery(searchQuery)

        try {
            const data = await apiClient.post<{ matchingDays: string[]; interpretation: string }>('/calendar/ai-filter', { query: searchQuery.trim(), month: monthKey })

            setAiInterpretation(data.interpretation)
            saveToHistory(searchQuery.trim())

            if (onAIFilterResult) {
                onAIFilterResult(data.matchingDays, data.interpretation)
            }

            // Auto-close after successful search
            setTimeout(() => handleClose(), 300)
        } catch (error) {
            console.error('AI filter error:', error)
            setAiInterpretation('Failed to process query. Try again.')
        } finally {
            setIsAILoading(false)
        }
    }

    const handleClear = () => {
        setAiQuery('')
        setAiInterpretation(null)
        if (onAIFilterResult) {
            onAIFilterResult([], '')
        }
        if (onClearFilter) {
            onClearFilter()
        }
    }

    const removeFromHistory = (query: string) => {
        setQueryHistory(prev => {
            const updated = prev.filter(q => q !== query)
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
            return updated
        })
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200",
                    isClosing ? "opacity-0" : "opacity-100"
                )}
                onClick={handleClose}
            />

            {/* Sheet */}
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-hidden transition-transform duration-300 ease-out",
                    isClosing ? "translate-y-full" : "translate-y-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-surface-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-body font-semibold text-surface-900">Ask AI</h3>
                            <p className="text-micro text-surface-500">Find patterns in your tracking</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 pb-6 space-y-5 max-h-[calc(85vh-100px)] overflow-y-auto">
                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                            placeholder="Ask anything about your tracking..."
                            className="w-full px-4 py-4 pr-14 text-sm rounded-2xl border-2 border-surface-200 bg-surface-50 focus:outline-none focus:ring-0 focus:border-purple-500 placeholder:text-surface-400 transition-colors"
                            disabled={isAILoading}
                            autoFocus
                        />
                        <button
                            onClick={() => handleAISearch()}
                            disabled={!aiQuery.trim() || isAILoading}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all",
                                aiQuery.trim() && !isAILoading
                                    ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl"
                                    : "bg-surface-200 text-surface-400"
                            )}
                        >
                            {isAILoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {/* AI Interpretation Result */}
                    {aiInterpretation && (
                        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <Zap className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-purple-800">{aiInterpretation}</p>
                                    <button
                                        onClick={handleClear}
                                        className="text-xs text-purple-600 hover:text-purple-800 mt-1 font-medium"
                                    >
                                        Clear filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                Try asking
                            </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {AI_SUGGESTIONS.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAISearch(suggestion.text)}
                                    disabled={isAILoading}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-full text-sm text-surface-700 transition-all hover:border-purple-300 hover:shadow-sm active:scale-95"
                                >
                                    <span>{suggestion.icon}</span>
                                    <span>{suggestion.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Query History */}
                    {queryHistory.length > 0 && (
                        <div className="pt-2 border-t border-surface-100">
                            <div className="flex items-center gap-2 mb-3">
                                <History className="w-4 h-4 text-surface-400" />
                                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Recent
                                </h4>
                            </div>
                            <div className="space-y-1">
                                {queryHistory.map((query, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between group"
                                    >
                                        <button
                                            onClick={() => handleAISearch(query)}
                                            disabled={isAILoading}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-lg transition-all flex-1 text-left"
                                        >
                                            <Clock className="w-3.5 h-3.5 text-surface-400" />
                                            <span className="truncate">{query}</span>
                                        </button>
                                        <button
                                            onClick={() => removeFromHistory(query)}
                                            className="p-1.5 text-surface-300 hover:text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Safe area padding for mobile */}
                <div className="h-8 bg-white" />
            </div>
        </>
    )
}
