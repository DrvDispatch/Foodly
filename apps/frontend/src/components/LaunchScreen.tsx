'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/app-store'
import { cn } from '@/lib/utils'

/**
 * Launch Screen - Shows while app is bootstrapping and pre-warming pages
 * 
 * Features:
 * - Foodly logo with subtle animation
 * - Calm loading text
 * - Minimum display time (1.5s) to allow page pre-warming
 * - Smooth fade-out transition
 */
export function LaunchScreen() {
    const { isBootstrapped, isLoading, error } = useApp()
    const [showScreen, setShowScreen] = useState(true)
    const [fadeOut, setFadeOut] = useState(false)
    const [minTimePassed, setMinTimePassed] = useState(false)
    const [loadingText, setLoadingText] = useState('Preparing your experience…')

    // Minimum display time to allow page pre-warming
    useEffect(() => {
        // Cycle through loading messages
        const messages = [
            'Preparing your experience…',
            'Loading your nutrition data…',
            'Pre-loading pages…',
            'Almost ready…'
        ]
        let index = 0
        const textTimer = setInterval(() => {
            index = (index + 1) % messages.length
            setLoadingText(messages[index])
        }, 500)

        // Minimum 1.5 seconds for pre-warming
        const timer = setTimeout(() => {
            setMinTimePassed(true)
        }, 1500)

        return () => {
            clearTimeout(timer)
            clearInterval(textTimer)
        }
    }, [])

    // Fade out when ready
    useEffect(() => {
        if (isBootstrapped && minTimePassed) {
            setFadeOut(true)
            const timer = setTimeout(() => {
                setShowScreen(false)
            }, 300) // Match transition duration
            return () => clearTimeout(timer)
        }
    }, [isBootstrapped, minTimePassed])

    if (!showScreen) return null

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center justify-center",
                "bg-gradient-to-b from-primary-50 via-white to-primary-50",
                "transition-opacity duration-300",
                fadeOut && "opacity-0 pointer-events-none"
            )}
        >
            {/* Logo */}
            <div className="relative mb-8">
                <div className={cn(
                    "w-24 h-24 rounded-3xl shadow-2xl",
                    "bg-gradient-to-br from-primary-400 to-primary-600",
                    "flex items-center justify-center",
                    "animate-pulse"
                )}>
                    <span className="text-5xl">🍽️</span>
                </div>

                {/* Subtle glow effect */}
                <div className={cn(
                    "absolute inset-0 rounded-3xl",
                    "bg-gradient-to-br from-primary-300 to-primary-500",
                    "blur-xl opacity-40 -z-10 scale-110"
                )} />
            </div>

            {/* App Name */}
            <h1 className="text-3xl font-bold text-surface-900 mb-2">
                Foodly
            </h1>

            {/* Loading State */}
            <div className="flex flex-col items-center gap-4 mt-4">
                {error ? (
                    <p className="text-sm text-danger-600">{error}</p>
                ) : (
                    <>
                        {/* Loading Dots */}
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>

                        {/* Calm text */}
                        <p className="text-sm text-surface-500 transition-all duration-200">
                            {loadingText}
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
