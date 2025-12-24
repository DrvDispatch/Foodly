'use client'

import { Sun, Moon, Monitor, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeSection() {
    const { theme, setTheme } = useTheme()
    const [isExpanded, setIsExpanded] = useState(false)

    const currentTheme = themes.find(t => t.value === theme)
    const CurrentIcon = currentTheme?.icon || Monitor

    return (
        <div className="bg-white dark:bg-surface-100 rounded-2xl overflow-hidden shadow-sm border border-surface-100 dark:border-surface-200">
            {/* Header - Clickable to expand */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-200 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-200 dark:to-surface-300 flex items-center justify-center">
                        <CurrentIcon className="w-5 h-5 text-surface-600" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-surface-900">Appearance</h3>
                        <p className="text-caption text-surface-500">{currentTheme?.label} mode</p>
                    </div>
                </div>
                <ChevronRight className={cn(
                    "w-5 h-5 text-surface-400 transition-transform duration-200",
                    isExpanded && "rotate-90"
                )} />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-surface-100 dark:border-surface-200">
                    <div className="grid grid-cols-3 gap-3">
                        {themes.map((t) => {
                            const Icon = t.icon
                            const isSelected = theme === t.value
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => setTheme(t.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                        isSelected
                                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                            : "border-surface-200 dark:border-surface-300 bg-surface-50 dark:bg-surface-200 hover:border-surface-300"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-6 h-6",
                                        isSelected ? "text-primary-600" : "text-surface-500"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isSelected ? "text-primary-700 dark:text-primary-400" : "text-surface-600"
                                    )}>
                                        {t.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <p className="mt-4 text-xs text-surface-400 text-center">
                        System uses your device&apos;s appearance settings
                    </p>
                </div>
            )}
        </div>
    )
}
