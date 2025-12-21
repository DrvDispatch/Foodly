'use client'

import { useState, useRef } from 'react'
import { Trash2, RotateCcw, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableRowProps {
    children: React.ReactNode
    onDelete?: () => void
    onEdit?: () => void
    onReanalyze?: () => void
    disabled?: boolean
}

export function SwipeableRow({
    children,
    onDelete,
    onEdit,
    onReanalyze,
    disabled = false,
}: SwipeableRowProps) {
    const [offset, setOffset] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const startX = useRef(0)
    const currentX = useRef(0)
    const isDragging = useRef(false)

    const ACTION_WIDTH = 160 // Width of action buttons area

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return
        startX.current = e.touches[0].clientX
        isDragging.current = true
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || disabled) return
        currentX.current = e.touches[0].clientX
        const diff = startX.current - currentX.current

        // Only allow left swipe (positive diff)
        if (diff > 0) {
            const newOffset = Math.min(diff, ACTION_WIDTH)
            setOffset(newOffset)
        } else if (isOpen) {
            // Allow closing by swiping right
            const newOffset = Math.max(0, ACTION_WIDTH + diff)
            setOffset(newOffset)
        }
    }

    const handleTouchEnd = () => {
        if (!isDragging.current) return
        isDragging.current = false

        // Snap to open or closed
        if (offset > ACTION_WIDTH / 2) {
            setOffset(ACTION_WIDTH)
            setIsOpen(true)
        } else {
            setOffset(0)
            setIsOpen(false)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return
        startX.current = e.clientX
        isDragging.current = true

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return
            currentX.current = e.clientX
            const diff = startX.current - currentX.current

            if (diff > 0) {
                const newOffset = Math.min(diff, ACTION_WIDTH)
                setOffset(newOffset)
            } else if (isOpen) {
                const newOffset = Math.max(0, ACTION_WIDTH + diff)
                setOffset(newOffset)
            }
        }

        const handleMouseUp = () => {
            isDragging.current = false
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)

            if (offset > ACTION_WIDTH / 2) {
                setOffset(ACTION_WIDTH)
                setIsOpen(true)
            } else {
                setOffset(0)
                setIsOpen(false)
            }
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const closeActions = () => {
        setOffset(0)
        setIsOpen(false)
    }

    const handleAction = (action: () => void) => {
        closeActions()
        action()
    }

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Action Buttons (behind the card) */}
            <div className="absolute inset-y-0 right-0 flex items-stretch">
                {onReanalyze && (
                    <button
                        onClick={() => handleAction(onReanalyze)}
                        className="w-16 bg-blue-500 flex items-center justify-center text-white"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={() => handleAction(onEdit)}
                        className="w-16 bg-amber-500 flex items-center justify-center text-white"
                    >
                        <Edit2 className="w-5 h-5" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => handleAction(onDelete)}
                        className="w-16 bg-red-500 flex items-center justify-center text-white"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Main Content (slides left) */}
            <div
                className={cn(
                    "relative bg-white transition-transform",
                    !isDragging.current && "duration-200"
                )}
                style={{ transform: `translateX(-${offset}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
            >
                {children}
            </div>

            {/* Tap outside to close */}
            {isOpen && (
                <div
                    className="absolute inset-0"
                    style={{ right: ACTION_WIDTH }}
                    onClick={closeActions}
                />
            )}
        </div>
    )
}
