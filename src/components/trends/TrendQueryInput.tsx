'use client'

import { useState } from 'react'
import { Search, Loader2, X, Sparkles, Calendar, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { getDay, parseISO } from 'date-fns'

interface DataPoint {
    date: string
    calories: number
    protein: number
    carbs: number
    fat: number
    mealCount: number
}

interface FilterResult {
    filterType: 'day_of_week' | 'threshold' | 'range' | 'none'
    daysOfWeek?: number[]
    thresholdMetric?: 'calories' | 'protein' | 'carbs' | 'fat'
    thresholdOperator?: 'above' | 'below' | 'equals'
    thresholdValue?: number
    interpretation: string
}

interface TrendQueryInputProps {
    dataPoints: DataPoint[]
    goals: { calories: number; protein: number; carbs: number; fat: number }
    onFilteredData: (filtered: DataPoint[], interpretation: string) => void
    onClear: () => void
}

// Example queries
const EXAMPLE_QUERIES = [
    { text: 'Show weekends only', icon: Calendar },
    { text: 'Days under 1500 calories', icon: TrendingUp },
    { text: 'Show weekdays', icon: Calendar },
]

export function TrendQueryInput({ dataPoints, goals, onFilteredData, onClear }: TrendQueryInputProps) {
    const [query, setQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [activeFilter, setActiveFilter] = useState<string | null>(null)

    const handleQuery = async (queryText?: string) => {
        const searchQuery = queryText || query
        if (!searchQuery.trim() || isLoading) return

        setIsLoading(true)
        setQuery(searchQuery)

        try {
            const filter = await apiClient.post<FilterResult>('/trends/query', { query: searchQuery, goals })

            if (filter.filterType === 'none') {
                setActiveFilter(null)
                onClear()
                return
            }

            // Apply filter to data points
            let filtered = dataPoints

            if (filter.filterType === 'day_of_week' && filter.daysOfWeek?.length) {
                filtered = dataPoints.filter(d => {
                    const dayOfWeek = getDay(parseISO(d.date))
                    return filter.daysOfWeek!.includes(dayOfWeek)
                })
            }

            if (filter.filterType === 'threshold' && filter.thresholdMetric && filter.thresholdValue !== undefined) {
                filtered = dataPoints.filter(d => {
                    const value = d[filter.thresholdMetric!]
                    switch (filter.thresholdOperator) {
                        case 'above': return value > filter.thresholdValue!
                        case 'below': return value < filter.thresholdValue!
                        case 'equals': return value === filter.thresholdValue!
                        default: return true
                    }
                })
            }

            setActiveFilter(filter.interpretation)
            onFilteredData(filtered, filter.interpretation)

        } catch (error) {
            console.error('Query error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClear = () => {
        setQuery('')
        setActiveFilter(null)
        onClear()
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-surface-900">Ask About Trends</h3>
            </div>

            {/* Search Input */}
            <div className="p-4">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                        placeholder="Filter trends with natural language..."
                        className="w-full px-4 py-3 pr-12 text-sm rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:border-purple-400 placeholder:text-surface-400"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleQuery()}
                        disabled={!query.trim() || isLoading}
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                            query.trim() && !isLoading
                                ? "bg-purple-500 text-white"
                                : "bg-surface-200 text-surface-400"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Active Filter */}
                {activeFilter && (
                    <div className="mt-3 flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg">
                        <span className="text-xs text-purple-700">{activeFilter}</span>
                        <button onClick={handleClear} className="text-purple-400 hover:text-purple-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Example Queries */}
                {!activeFilter && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {EXAMPLE_QUERIES.map((example, i) => (
                            <button
                                key={i}
                                onClick={() => handleQuery(example.text)}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-full text-xs text-surface-600 hover:bg-surface-100 hover:border-purple-200 transition-all"
                            >
                                <example.icon className="w-3 h-3" />
                                {example.text}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
