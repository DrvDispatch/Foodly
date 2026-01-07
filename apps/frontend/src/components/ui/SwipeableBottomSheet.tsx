'use client'

import { useRef, useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalBackButton } from '@/hooks/useBackButton'

interface SwipeableBottomSheetProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    title?: string
    className?: string
}

/**
 * Bottom sheet modal with swipe-to-close gesture support
 * Handles Android back button and touch gestures
 */
export function SwipeableBottomSheet({
    isOpen,
    onClose,
    children,
    title,
    className
}: SwipeableBottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null)
    const startY = useRef(0)
    const currentY = useRef(0)
    const isDragging = useRef(false)

    // Handle Android back button
    useModalBackButton(isOpen, onClose)

    // Touch gesture handlers
    useEffect(() => {
        if (!isOpen || !sheetRef.current) return

        const sheet = sheetRef.current
        let translateY = 0

        const handleTouchStart = (e: TouchEvent) => {
            // Only start drag from the handle area (top 60px)
            const touch = e.touches[0]
            const rect = sheet.getBoundingClientRect()
            const touchY = touch.clientY - rect.top

            if (touchY > 60) return // Only allow drag from top handle area

            startY.current = touch.clientY
            currentY.current = touch.clientY
            isDragging.current = true
            sheet.style.transition = 'none'
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging.current) return

            const touch = e.touches[0]
            currentY.current = touch.clientY
            translateY = Math.max(0, currentY.current - startY.current)

            sheet.style.transform = `translateY(${translateY}px)`

            // Add opacity to backdrop based on drag distance
            const maxDrag = 200
            const progress = Math.min(translateY / maxDrag, 1)
            const backdrop = sheet.parentElement?.querySelector('.backdrop') as HTMLElement
            if (backdrop) {
                backdrop.style.opacity = String(1 - progress * 0.5)
            }
        }

        const handleTouchEnd = () => {
            if (!isDragging.current) return
            isDragging.current = false

            const dragDistance = currentY.current - startY.current
            sheet.style.transition = 'transform 0.3s ease-out'

            if (dragDistance > 100) {
                // Close the sheet
                sheet.style.transform = 'translateY(100%)'
                setTimeout(onClose, 300)
            } else {
                // Snap back
                sheet.style.transform = 'translateY(0)'
                const backdrop = sheet.parentElement?.querySelector('.backdrop') as HTMLElement
                if (backdrop) {
                    backdrop.style.opacity = '1'
                }
            }
        }

        sheet.addEventListener('touchstart', handleTouchStart, { passive: true })
        sheet.addEventListener('touchmove', handleTouchMove, { passive: true })
        sheet.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            sheet.removeEventListener('touchstart', handleTouchStart)
            sheet.removeEventListener('touchmove', handleTouchMove)
            sheet.removeEventListener('touchend', handleTouchEnd)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="backdrop absolute inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={cn(
                    "relative w-full max-w-lg bg-white dark:bg-surface-800 rounded-t-3xl",
                    "animate-slide-up",
                    className
                )}
                style={{ maxHeight: '90vh' }}
            >
                {/* Swipe Handle */}
                <div className="pt-2 pb-1 cursor-grab active:cursor-grabbing">
                    <div className="bottom-sheet-handle" />
                </div>

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 pb-4">
                        <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-surface-400 hover:text-surface-600 dark:hover:text-white rounded-lg touch-scale"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}
