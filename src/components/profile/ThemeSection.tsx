'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeSection() {
    const [theme, setTheme] = useState<Theme>('system')
    const [isExpanded, setIsExpanded] = useState(false)

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme | null
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setTheme(saved)
        }
    }, [])

    // Apply theme changes
    useEffect(() => {
        const root = document.documentElement

        if (theme === 'system') {
            // Listen to system preference
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const applySystemTheme = () => {
                if (mediaQuery.matches) {
                    root.classList.add('dark')
                } else {
                    root.classList.remove('dark')
                }
            }
            applySystemTheme()
            mediaQuery.addEventListener('change', applySystemTheme)
            localStorage.setItem('theme', 'system')
            return () => mediaQuery.removeEventListener('change', applySystemTheme)
        } else {
            if (theme === 'dark') {
                root.classList.add('dark')
            } else {
                root.classList.remove('dark')
            }
            localStorage.setItem('theme', theme)
        }
    }, [theme])

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme)
    }

    const currentTheme = themes.find(t => t.value === theme)
    const CurrentIcon = currentTheme?.icon || Monitor

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-surface-100/50">
            {/* Header - Clickable to expand */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-100 to-surface-200 flex items-center justify-center">
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
                <div className="px-5 pb-5 pt-2 border-t border-surface-100">
                    <div className="grid grid-cols-3 gap-3">
                        {themes.map((t) => {
                            const Icon = t.icon
                            const isSelected = theme === t.value
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => handleThemeChange(t.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                        isSelected
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-surface-200 bg-surface-50 hover:border-surface-300"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-6 h-6",
                                        isSelected ? "text-primary-600" : "text-surface-500"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isSelected ? "text-primary-700" : "text-surface-600"
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
