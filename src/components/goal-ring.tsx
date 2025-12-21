'use client'

import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

interface GoalRingProps {
    current: number
    goal: number
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const sizes = {
    sm: { ring: 60, stroke: 6, textSize: 'text-sm' },
    md: { ring: 80, stroke: 7, textSize: 'text-base' },
    lg: { ring: 100, stroke: 8, textSize: 'text-lg' },
}

export function GoalRing({ current, goal, size = 'md', className }: GoalRingProps) {
    const { ring, stroke, textSize } = sizes[size]
    const radius = (ring - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const progress = Math.min(100, (current / goal) * 100)
    const offset = circumference - (progress / 100) * circumference

    return (
        <div className={cn("goal-ring", className)} style={{ width: ring, height: ring }}>
            <svg width={ring} height={ring} className="transform -rotate-90">
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="gradient-calories" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(24, 95%, 55%)" />
                        <stop offset="100%" stopColor="hsl(38, 95%, 55%)" />
                    </linearGradient>
                </defs>

                {/* Background Circle */}
                <circle
                    cx={ring / 2}
                    cy={ring / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    className="goal-ring-bg"
                />

                {/* Progress Circle */}
                <circle
                    cx={ring / 2}
                    cy={ring / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="goal-ring-progress"
                />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("font-bold text-surface-900", textSize)}>
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    )
}
