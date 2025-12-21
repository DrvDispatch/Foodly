'use client'

import { cn, getConfidenceLevel } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface ConfidenceChipProps {
    confidence: number
    onClick?: () => void
    className?: string
    as?: 'button' | 'span'
    compact?: boolean
}

export function ConfidenceChip({
    confidence,
    onClick,
    className,
    as = 'button',
    compact = false
}: ConfidenceChipProps) {
    const level = getConfidenceLevel(confidence)
    const percentage = Math.round(confidence * 100)

    const levelStyles = {
        high: 'confidence-high',
        medium: 'confidence-medium',
        low: 'confidence-low',
    }

    const content = (
        <>
            <Sparkles className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            <span className="font-semibold">{percentage}%</span>
        </>
    )

    const baseStyles = cn(
        "pill",
        levelStyles[level],
        compact && "py-1 px-2",
        onClick && as === 'button' && "cursor-pointer",
        className
    )

    if (as === 'span') {
        return <span className={baseStyles}>{content}</span>
    }

    return (
        <button onClick={onClick} className={baseStyles}>
            {content}
        </button>
    )
}
