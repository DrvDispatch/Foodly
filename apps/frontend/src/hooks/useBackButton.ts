'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseBackButtonOptions {
    onBack?: () => void  // Custom handler - called instead of navigation
    enabled?: boolean     // Whether to handle back button
}

/**
 * Hook for handling Android back button/gesture
 * Uses browser history popstate event
 */
export function useBackButton({ onBack, enabled = true }: UseBackButtonOptions = {}) {
    const router = useRouter()

    const handleBack = useCallback(() => {
        if (onBack) {
            onBack()
        } else {
            router.back()
        }
    }, [onBack, router])

    useEffect(() => {
        if (!enabled) return

        // Push a dummy state so we can detect back
        const handlePopState = (e: PopStateEvent) => {
            e.preventDefault()
            handleBack()
        }

        // Only add the handler, don't push state (causes navigation issues)
        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [enabled, handleBack])

    return { handleBack }
}

/**
 * Hook for closing modals on back button press
 * Pass the close function and it will be called on back press
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return

        // Push a state when modal opens
        window.history.pushState({ modal: true }, '')

        const handlePopState = (e: PopStateEvent) => {
            // If user pressed back while modal is open, close modal
            onClose()
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
            // Clean up the pushed state if modal closes normally (not via back)
        }
    }, [isOpen, onClose])
}
