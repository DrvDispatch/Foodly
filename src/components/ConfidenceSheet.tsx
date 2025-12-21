'use client'

import { X, Camera, MessageSquare, Scale, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfidenceSheetProps {
    isOpen: boolean
    onClose: () => void
    confidence: number
    hasPhoto?: boolean
    hasDescription?: boolean
}

// Generate reasons based on inputs
function getConfidenceReasons(confidence: number, hasPhoto: boolean, hasDescription: boolean): string[] {
    const reasons: string[] = []

    if (hasPhoto && confidence >= 0.85) {
        reasons.push("Clear, well-lit photo of the meal")
    } else if (hasPhoto && confidence < 0.85) {
        reasons.push("Photo quality or angle could be improved")
    } else {
        reasons.push("No photo provided — estimation is text-based only")
    }

    if (hasDescription && hasDescription) {
        reasons.push("Description helps identify ingredients")
    } else if (!hasDescription && !hasPhoto) {
        reasons.push("Limited information provided")
    }

    if (confidence >= 0.9) {
        reasons.push("Recognizable, common food items detected")
    } else if (confidence >= 0.7) {
        reasons.push("Some portions or ingredients are estimated")
    } else {
        reasons.push("Complex or obscured meal — rough estimate")
    }

    return reasons.slice(0, 2) // Max 2 bullets
}

function getConfidenceTitle(confidence: number): string {
    if (confidence >= 0.9) return "High Confidence"
    if (confidence >= 0.7) return "Good Estimate"
    return "Rough Estimate"
}

function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return "bg-green-100 text-green-700"
    if (confidence >= 0.7) return "bg-amber-100 text-amber-700"
    return "bg-red-100 text-red-700"
}

export function ConfidenceSheet({ isOpen, onClose, confidence, hasPhoto = false, hasDescription = false }: ConfidenceSheetProps) {
    if (!isOpen) return null

    const reasons = getConfidenceReasons(confidence, hasPhoto, hasDescription)
    const title = getConfidenceTitle(confidence)
    const colorClass = getConfidenceColor(confidence)

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
                <div className="bg-white rounded-t-3xl shadow-2xl">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 rounded-full bg-surface-300" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pb-4">
                        <h2 className="text-heading text-surface-900">Why this confidence?</h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-surface-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-5 pb-8 space-y-6">
                        {/* Confidence Badge */}
                        <div className="text-center">
                            <span className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-heading font-semibold",
                                colorClass
                            )}>
                                {Math.round(confidence * 100)}% — {title}
                            </span>
                        </div>

                        {/* Reasons */}
                        <div className="space-y-3">
                            {reasons.map((reason, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
                                        {i === 0 ? (
                                            hasPhoto ? <Camera className="w-4 h-4 text-surface-500" /> : <Eye className="w-4 h-4 text-surface-500" />
                                        ) : (
                                            <Scale className="w-4 h-4 text-surface-500" />
                                        )}
                                    </div>
                                    <p className="text-body text-surface-700 pt-1">{reason}</p>
                                </div>
                            ))}
                        </div>

                        {/* Improvement Tips */}
                        <div className="bg-surface-50 rounded-xl p-4">
                            <h3 className="text-caption font-semibold text-surface-900 mb-2">
                                How to improve accuracy
                            </h3>
                            <ul className="space-y-1.5">
                                <li className="text-caption text-surface-600 flex items-start gap-2">
                                    <span className="text-primary-500">•</span>
                                    Take photos in good lighting from above
                                </li>
                                <li className="text-caption text-surface-600 flex items-start gap-2">
                                    <span className="text-primary-500">•</span>
                                    Add descriptions like &quot;2 eggs&quot; or &quot;large portion&quot;
                                </li>
                                <li className="text-caption text-surface-600 flex items-start gap-2">
                                    <span className="text-primary-500">•</span>
                                    Edit values manually if you know exact amounts
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
