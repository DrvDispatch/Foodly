'use client'

import { useState } from 'react'
import { Plus, X, UtensilsCrossed, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAddFabProps {
    onAddMeal: () => void
    onAddWeight: () => void
    disabled?: boolean
}

export function QuickAddFab({ onAddMeal, onAddWeight, disabled }: QuickAddFabProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleAddMeal = () => {
        setIsOpen(false)
        onAddMeal()
    }

    const handleAddWeight = () => {
        setIsOpen(false)
        onAddWeight()
    }

    if (disabled) return null

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* FAB Menu */}
            <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
                {/* Options - shown when open */}
                {isOpen && (
                    <>
                        {/* Add Weight */}
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <span className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-surface-700 shadow-lg">
                                Add Weight
                            </span>
                            <button
                                onClick={handleAddWeight}
                                className="w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all"
                            >
                                <Scale className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Add Meal */}
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ animationDelay: '50ms' }}>
                            <span className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-surface-700 shadow-lg">
                                Add Meal
                            </span>
                            <button
                                onClick={handleAddMeal}
                                className="w-12 h-12 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-all"
                            >
                                <UtensilsCrossed className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                )}

                {/* Main FAB */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200",
                        isOpen
                            ? "bg-surface-700 rotate-45"
                            : "bg-primary-600 hover:bg-primary-700"
                    )}
                    aria-label={isOpen ? "Close menu" : "Add"}
                >
                    <Plus className={cn("w-7 h-7 text-white transition-transform duration-200", isOpen && "rotate-45")} />
                </button>
            </div>
        </>
    )
}
