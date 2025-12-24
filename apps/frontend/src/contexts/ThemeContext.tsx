'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system')
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
    const [mounted, setMounted] = useState(false)

    // Load saved theme on mount
    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('theme') as Theme | null
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setThemeState(saved)
        }
    }, [])

    // Apply theme changes and track resolved theme
    useEffect(() => {
        if (!mounted) return

        const root = document.documentElement

        const applyTheme = (isDark: boolean) => {
            if (isDark) {
                root.classList.add('dark')
                setResolvedTheme('dark')
            } else {
                root.classList.remove('dark')
                setResolvedTheme('light')
            }
        }

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            applyTheme(mediaQuery.matches)

            const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
            mediaQuery.addEventListener('change', handler)
            return () => mediaQuery.removeEventListener('change', handler)
        } else {
            applyTheme(theme === 'dark')
        }
    }, [theme, mounted])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem('theme', newTheme)
    }

    // Prevent flash by not rendering until mounted
    // The inline script in layout.tsx handles initial theme
    const value = {
        theme,
        setTheme,
        resolvedTheme,
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
