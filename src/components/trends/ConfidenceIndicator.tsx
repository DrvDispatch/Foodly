'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface ConfidenceIndicatorProps {
    loggedDays: number
    totalDays: number
    level: 'high' | 'medium' | 'low'
}

export function ConfidenceIndicator({ loggedDays, totalDays, level }: ConfidenceIndicatorProps) {
    const config = {
        high: {
            icon: CheckCircle2,
            bg: 'bg-green-50',
            text: 'text-green-700',
            iconColor: 'text-green-500',
            label: 'Reliable data'
        },
        medium: {
            icon: Info,
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            iconColor: 'text-amber-500',
            label: 'Moderate coverage'
        },
        low: {
            icon: AlertTriangle,
            bg: 'bg-red-50',
            text: 'text-red-700',
            iconColor: 'text-red-500',
            label: 'Sparse data'
        }
    }

    const { icon: Icon, bg, text, iconColor, label } = config[level]

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium",
            bg, text
        )}>
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
            <span>Based on {loggedDays} of {totalDays} days</span>
            {level === 'low' && (
                <span className="text-[10px] opacity-80">— interpret cautiously</span>
            )}
        </div>
    )
}
