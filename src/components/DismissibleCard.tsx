'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DismissibleCardProps {
    /** Unique key for session-based dismissal tracking */
    id: string
    children: React.ReactNode
    className?: string
    /** If true, can be dismissed by swipe/button */
    dismissible?: boolean
    /** Called when card is dismissed */
    onDismiss?: () => void
}

// Session storage key prefix
const DISMISSED_KEY = 'foodly_dismissed_cards'

/**
 * DismissibleCard - A card that can be swiped or clicked away
 * Dismissals are stored in sessionStorage (reappear on next app launch)
 */
export function DismissibleCard({
    id,
    children,
    className,
    dismissible = true,
    onDismiss
}: DismissibleCardProps) {
    const [isDismissed, setIsDismissed] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [offsetX, setOffsetX] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const startXRef = useRef(0)
    const isDraggingRef = useRef(false)

    // Check if already dismissed this session
    useEffect(() => {
        try {
            const dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]')
            if (dismissed.includes(id)) {
                setIsDismissed(true)
            }
        } catch { }
    }, [id])

    const dismiss = () => {
        setIsAnimating(true)
        setTimeout(() => {
            setIsDismissed(true)
            // Store in session
            try {
                const dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]')
                if (!dismissed.includes(id)) {
                    dismissed.push(id)
                    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
                }
            } catch { }
            onDismiss?.()
        }, 200)
    }

    // Touch/swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!dismissible) return
        startXRef.current = e.touches[0].clientX
        isDraggingRef.current = true
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDraggingRef.current || !dismissible) return
        const currentX = e.touches[0].clientX
        const diff = currentX - startXRef.current
        // Only allow right swipe (positive)
        if (diff > 0) {
            setOffsetX(Math.min(diff, 200))
        }
    }

    const handleTouchEnd = () => {
        if (!isDraggingRef.current) return
        isDraggingRef.current = false

        // If swiped more than 100px, dismiss
        if (offsetX > 100) {
            dismiss()
        } else {
            setOffsetX(0)
        }
    }

    if (isDismissed) return null

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative overflow-hidden transition-all duration-200",
                isAnimating && "opacity-0 scale-95 translate-x-full",
                className
            )}
            style={{
                transform: offsetX > 0 ? `translateX(${offsetX}px)` : undefined,
                opacity: offsetX > 0 ? 1 - (offsetX / 250) : 1
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {children}

            {/* Dismiss button */}
            {dismissible && (
                <button
                    onClick={dismiss}
                    className={cn(
                        "absolute top-2 right-2 p-1.5 rounded-full",
                        "bg-surface-100/80 text-surface-400 hover:text-surface-600",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "focus:opacity-100"
                    )}
                    aria-label="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Swipe hint background */}
            {offsetX > 0 && (
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-surface-200/50 to-transparent -z-10" />
            )}
        </div>
    )
}

/**
 * Hook to clear all dismissed cards (call on app mount/refresh)
 */
export function useClearDismissedOnMount() {
    useEffect(() => {
        // This could be called to reset all dismissals
        // Currently we use sessionStorage which auto-clears
    }, [])
}
