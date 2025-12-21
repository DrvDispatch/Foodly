'use client'

import { useState, useEffect } from 'react'

/**
 * Theme-aware asset paths
 * Returns the correct asset path based on current theme
 */
const THEMED_ASSETS = {
    favicon: {
        light: '/favicon.png',
        dark: '/favicon-dark.png'
    },
    coachAvatar: {
        light: '/coach-avatar.png',
        dark: '/coach-avatar-dark.png'
    },
    flamePattern: {
        light: '/flame-pattern.svg',
        dark: '/flame-pattern-dark.svg'
    },
    icon192: {
        light: '/icon-192.png',
        dark: '/icon-192-dark.png'
    },
    icon512: {
        light: '/icon-512.png',
        dark: '/icon-512-dark.png'
    }
} as const

export type ThemedAssetKey = keyof typeof THEMED_ASSETS

/**
 * Hook to get theme-aware asset paths
 * Returns the correct asset based on current theme (dark/light)
 */
export function useThemedAsset(assetKey: ThemedAssetKey): string {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        // Check initial state
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'))
        }
        checkDark()

        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    checkDark()
                }
            })
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        return () => observer.disconnect()
    }, [])

    const asset = THEMED_ASSETS[assetKey]
    return isDark ? asset.dark : asset.light
}

/**
 * Hook to get all themed assets at once
 */
export function useThemedAssets() {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'))
        }
        checkDark()

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    checkDark()
                }
            })
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        return () => observer.disconnect()
    }, [])

    return {
        favicon: isDark ? THEMED_ASSETS.favicon.dark : THEMED_ASSETS.favicon.light,
        coachAvatar: isDark ? THEMED_ASSETS.coachAvatar.dark : THEMED_ASSETS.coachAvatar.light,
        flamePattern: isDark ? THEMED_ASSETS.flamePattern.dark : THEMED_ASSETS.flamePattern.light,
        icon192: isDark ? THEMED_ASSETS.icon192.dark : THEMED_ASSETS.icon192.light,
        icon512: isDark ? THEMED_ASSETS.icon512.dark : THEMED_ASSETS.icon512.light,
        isDark
    }
}

/**
 * Get themed asset synchronously (for server components or static usage)
 * Defaults to light mode
 */
export function getThemedAsset(assetKey: ThemedAssetKey, isDark: boolean = false): string {
    const asset = THEMED_ASSETS[assetKey]
    return isDark ? asset.dark : asset.light
}
