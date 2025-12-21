'use client'

import { useMemo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea,
    Dot
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { MetricType } from './MetricTabs'

interface DataPoint {
    date: string
    calories: number
    protein: number
    carbs: number
    fat: number
    weight?: number
    mealCount: number
}

interface TrendChartProps {
    data: DataPoint[]
    metric: MetricType
    goal: number
    range: string
    showTrajectory?: boolean // Toggle for trajectory band
}

// Metric-specific styling
const METRIC_CONFIG: Record<MetricType, {
    color: string
    gradient: { start: string; end: string }
    trajectoryColor: string
    label: string
    unit: string
}> = {
    calories: {
        color: '#f97316', // orange-500
        gradient: { start: '#fdba74', end: '#f97316' },
        trajectoryColor: '#fed7aa', // orange-200
        label: 'Calories',
        unit: 'kcal'
    },
    protein: {
        color: '#3b82f6', // blue-500
        gradient: { start: '#93c5fd', end: '#3b82f6' },
        trajectoryColor: '#bfdbfe', // blue-200
        label: 'Protein',
        unit: 'g'
    },
    carbs: {
        color: '#f59e0b', // amber-500
        gradient: { start: '#fcd34d', end: '#f59e0b' },
        trajectoryColor: '#fde68a', // amber-200
        label: 'Carbs',
        unit: 'g'
    },
    fat: {
        color: '#ec4899', // pink-500
        gradient: { start: '#f9a8d4', end: '#ec4899' },
        trajectoryColor: '#fbcfe8', // pink-200
        label: 'Fat',
        unit: 'g'
    },
    weight: {
        color: '#8b5cf6', // violet-500
        gradient: { start: '#c4b5fd', end: '#8b5cf6' },
        trajectoryColor: '#ddd6fe', // violet-200
        label: 'Weight',
        unit: 'kg'
    }
}

// Custom Tooltip
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    const value = payload[0].value
    const metric = payload[0].dataKey as MetricType
    const config = METRIC_CONFIG[metric]

    // Check if spike or dip
    const isSpike = data.isSpike
    const isDip = data.isDip

    return (
        <div className="bg-white rounded-xl shadow-lg border border-surface-100 p-3 min-w-[140px]">
            <p className="text-xs text-surface-500 mb-1">
                {format(parseISO(data.date), 'EEE, MMM d')}
            </p>
            <p className="text-lg font-bold" style={{ color: config.color }}>
                {value.toLocaleString()} <span className="text-sm font-normal">{config.unit}</span>
            </p>
            {isSpike && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">⬆️ Spike detected</p>
            )}
            {isDip && (
                <p className="text-[10px] text-amber-500 mt-1 font-medium">⬇️ Dip detected</p>
            )}
            {data.mealCount > 0 && !isSpike && !isDip && (
                <p className="text-[10px] text-surface-400 mt-1">
                    {data.mealCount} meal{data.mealCount !== 1 ? 's' : ''} logged
                </p>
            )}
            {data.mealCount === 0 && (
                <p className="text-[10px] text-surface-400 mt-1">No meals logged</p>
            )}
        </div>
    )
}

// Custom dot for spikes/dips
function SpikeDipDot(props: any) {
    const { cx, cy, payload, metric } = props
    if (!payload.isSpike && !payload.isDip) return null

    const color = payload.isSpike ? '#ef4444' : '#f59e0b' // red for spike, amber for dip

    return (
        <Dot
            cx={cx}
            cy={cy}
            r={6}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
        />
    )
}

export function TrendChart({ data, metric, goal, range, showTrajectory = false }: TrendChartProps) {
    const config = METRIC_CONFIG[metric]

    // Calculate trajectory band bounds (goal ±10%)
    const trajectoryBounds = useMemo(() => ({
        lower: Math.round(goal * 0.9),
        upper: Math.round(goal * 1.1)
    }), [goal])

    // Detect spikes and dips (values > 1.5 stdDev from mean)
    const processedData = useMemo(() => {
        const values = data.map(d => d[metric] ?? 0).filter(v => v > 0)
        if (values.length < 3) return data.map(d => ({ ...d, isSpike: false, isDip: false }))

        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(
            values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
        )
        const threshold = stdDev * 1.5

        return data.map(d => {
            const value = d[metric] ?? 0
            if (value === 0) return { ...d, isSpike: false, isDip: false }

            return {
                ...d,
                isSpike: value > mean + threshold,
                isDip: value < mean - threshold && value > 0
            }
        })
    }, [data, metric])

    // Format X-axis labels based on range
    const formatXAxis = (dateStr: string) => {
        const date = parseISO(dateStr)
        if (range === '7d') return format(date, 'EEE')
        if (range === '30d') return format(date, 'd')
        return format(date, 'MMM d')
    }

    // Calculate Y-axis domain with padding
    const yDomain = useMemo(() => {
        const values = data.map(d => d[metric] ?? 0).filter(v => v > 0)
        if (values.length === 0) return [0, goal * 1.3]

        const maxValue = Math.max(...values, goal * 1.1)
        const minValue = Math.min(...values.filter(v => v > 0), goal * 0.9)

        const padding = (maxValue - minValue) * 0.1 || maxValue * 0.1
        return [
            Math.max(0, Math.floor((minValue - padding) / 10) * 10),
            Math.ceil((maxValue + padding) / 10) * 10
        ]
    }, [data, metric, goal])

    // Check if we have any data
    const hasData = data.some(d => d.mealCount > 0)

    if (!hasData) {
        return (
            <div className="h-64 flex items-center justify-center bg-surface-50 rounded-2xl">
                <p className="text-surface-400 text-sm">No data for this period</p>
            </div>
        )
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={processedData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                    {/* Gradient definitions */}
                    <defs>
                        <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={config.gradient.start} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={config.gradient.end} stopOpacity={0.1} />
                        </linearGradient>
                    </defs>

                    {/* Trajectory Band (Goal Zone) - rendered first so it's behind */}
                    {showTrajectory && (
                        <ReferenceArea
                            y1={trajectoryBounds.lower}
                            y2={trajectoryBounds.upper}
                            fill={config.trajectoryColor}
                            fillOpacity={0.4}
                            stroke="none"
                        />
                    )}

                    {/* Grid */}
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e7e5e4"
                        vertical={false}
                    />

                    {/* Axes */}
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxis}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#a8a29e' }}
                        interval={range === '7d' ? 0 : 'preserveStartEnd'}
                    />
                    <YAxis
                        domain={yDomain}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#a8a29e' }}
                        width={45}
                    />

                    {/* Goal Reference Line */}
                    <ReferenceLine
                        y={goal}
                        stroke={config.color}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        strokeOpacity={0.6}
                    />

                    {/* Tooltip */}
                    <Tooltip content={<CustomTooltip />} />

                    {/* Main Area */}
                    <Area
                        type="monotone"
                        dataKey={metric}
                        stroke={config.color}
                        strokeWidth={2.5}
                        fill={`url(#gradient-${metric})`}
                        dot={<SpikeDipDot metric={metric} />}
                        activeDot={{ r: 6, fill: config.color, stroke: '#fff', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

