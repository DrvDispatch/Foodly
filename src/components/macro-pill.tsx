'use client'

import { cn } from '@/lib/utils'
import { Beef, Wheat, Droplets } from 'lucide-react'

interface MacroPillProps {
    type: 'protein' | 'carbs' | 'fat'
    value: number
    unit?: string
    showIcon?: boolean
    size?: 'sm' | 'md'
    className?: string
}

const macroConfig = {
    protein: {
        label: 'P',
        fullLabel: 'Protein',
        icon: Beef,
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-gradient-to-r from-blue-100 to-cyan-100',
        text: 'text-blue-700',
        iconColor: 'text-blue-500',
    },
    carbs: {
        label: 'C',
        fullLabel: 'Carbs',
        icon: Wheat,
        gradient: 'from-amber-500 to-orange-500',
        bg: 'bg-gradient-to-r from-amber-100 to-orange-100',
        text: 'text-amber-700',
        iconColor: 'text-amber-500',
    },
    fat: {
        label: 'F',
        fullLabel: 'Fat',
        icon: Droplets,
        gradient: 'from-pink-500 to-rose-500',
        bg: 'bg-gradient-to-r from-pink-100 to-rose-100',
        text: 'text-pink-700',
        iconColor: 'text-pink-500',
    },
}

export function MacroPill({
    type,
    value,
    unit = 'g',
    showIcon = false,
    size = 'sm',
    className,
}: MacroPillProps) {
    const config = macroConfig[type]
    const Icon = config.icon

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-lg font-medium",
                config.bg,
                config.text,
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
                className
            )}
        >
            {showIcon && <Icon className={cn("flex-shrink-0", size === 'sm' ? 'w-3 h-3' : 'w-4 h-4', config.iconColor)} />}
            <span className="font-bold">{Math.round(value)}</span>
            <span className="opacity-60">{unit}</span>
        </span>
    )
}

interface MacroStripProps {
    protein: number
    carbs: number
    fat: number
    showIcons?: boolean
    size?: 'sm' | 'md'
    className?: string
}

export function MacroStrip({ protein, carbs, fat, showIcons = false, size = 'sm', className }: MacroStripProps) {
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <MacroPill type="protein" value={protein} showIcon={showIcons} size={size} />
            <MacroPill type="carbs" value={carbs} showIcon={showIcons} size={size} />
            <MacroPill type="fat" value={fat} showIcon={showIcons} size={size} />
        </div>
    )
}

interface MacroBarProps {
    label: string
    current: number
    goal: number
    color: string
    icon: React.ElementType
}

export function MacroBar({ label, current, goal, color, icon: Icon }: MacroBarProps) {
    const progress = Math.min(100, (current / goal) * 100)
    const isOver = current > goal

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", color)}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-surface-700">{label}</span>
                </div>
                <span className={cn(
                    "text-sm font-semibold",
                    isOver ? "text-rose-600" : "text-surface-900"
                )}>
                    {Math.round(current)}<span className="text-surface-400 font-normal">/{goal}g</span>
                </span>
            </div>
            <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden shadow-inner">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        isOver ? "bg-gradient-to-r from-rose-400 to-rose-500" : color
                    )}
                    style={{ width: `${Math.min(100, progress)}%` }}
                />
            </div>
        </div>
    )
}
