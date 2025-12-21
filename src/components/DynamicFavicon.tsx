'use client'

import { useEffect } from 'react'

/**
 * DynamicFavicon - Updates the favicon based on the current theme
 * Watches for changes to the 'dark' class on the document element
 */
export function DynamicFavicon() {
    useEffect(() => {
        const updateFavicon = () => {
            const isDark = document.documentElement.classList.contains('dark')
            const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement

            if (faviconLink) {
                faviconLink.href = isDark ? '/favicon-dark.png' : '/favicon.png'
            }
        }

        // Initial update
        updateFavicon()

        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    updateFavicon()
                }
            })
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        return () => observer.disconnect()
    }, [])

    return null
}
