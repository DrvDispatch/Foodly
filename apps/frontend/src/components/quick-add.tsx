'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Loader2, Sparkles, ImagePlus, Send, Clock, Calendar, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAddProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: (mealDate?: Date) => void
}

interface PhotoData {
    preview: string
    base64: string
    exifDate?: Date | null
}

export function QuickAdd({ isOpen, onClose, onSuccess }: QuickAddProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [description, setDescription] = useState('')
    const [photos, setPhotos] = useState<PhotoData[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // Date/time state
    const [mealDate, setMealDate] = useState(() => formatDateForInput(new Date()))
    const [mealTime, setMealTime] = useState(() => formatTimeForInput(new Date()))
    const [suggestedDateTime, setSuggestedDateTime] = useState<Date | null>(null)
    const [showDateTimePicker, setShowDateTimePicker] = useState(false)

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            const now = new Date()
            setMealDate(formatDateForInput(now))
            setMealTime(formatTimeForInput(now))
            setSuggestedDateTime(null)
        }
    }, [isOpen])

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        for (const file of files) {
            const previewUrl = URL.createObjectURL(file)

            // Try to extract EXIF date
            const exifDate = await extractExifDate(file)

            // Read as base64
            const reader = new FileReader()
            reader.onloadend = () => {
                const newPhoto: PhotoData = {
                    preview: previewUrl,
                    base64: reader.result as string,
                    exifDate,
                }

                setPhotos(prev => {
                    const updated = [...prev, newPhoto]

                    // If this is the first photo with EXIF date, suggest it
                    if (exifDate && !suggestedDateTime && prev.length === 0) {
                        setSuggestedDateTime(exifDate)
                    }

                    return updated
                })
            }
            reader.readAsDataURL(file)
        }

        // Clear input for re-selection
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removePhoto = (index: number) => {
        setPhotos(prev => {
            const updated = prev.filter((_, i) => i !== index)
            // Clear suggestion if we removed the photo that had it
            if (prev[index]?.exifDate && suggestedDateTime) {
                const hasOtherExif = updated.some(p => p.exifDate)
                if (!hasOtherExif) {
                    setSuggestedDateTime(null)
                }
            }
            return updated
        })
    }

    const applySuggestedDateTime = () => {
        if (suggestedDateTime) {
            setMealDate(formatDateForInput(suggestedDateTime))
            setMealTime(formatTimeForInput(suggestedDateTime))
            setSuggestedDateTime(null) // Clear after applying
        }
    }

    const handleSubmit = async () => {
        if (!description.trim() && photos.length === 0) return

        setIsSubmitting(true)

        try {
            // Combine date and time into ISO string
            const dateTime = new Date(`${mealDate}T${mealTime}`)

            const res = await fetch('/api/meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: description.trim() || undefined,
                    photoBase64: photos[0]?.base64 || undefined,
                    additionalPhotos: photos.slice(1).map(p => p.base64),
                    mealTime: dateTime.toISOString(),
                }),
            })

            if (!res.ok) throw new Error('Failed to log meal')

            // Show success feedback briefly
            setShowSuccess(true)

            // Close after short delay for smooth transition
            setTimeout(() => {
                const mealDateTime = new Date(`${mealDate}T${mealTime}`)
                resetForm()
                onSuccess?.(mealDateTime)
                onClose()
                // Note: No router.refresh() to prevent CSS flash
            }, 600)

        } catch (err) {
            console.error('Submit error:', err)
            setIsSubmitting(false)
        }
    }

    const resetForm = () => {
        setDescription('')
        setPhotos([])
        setIsSubmitting(false)
        setShowSuccess(false)
        setSuggestedDateTime(null)
        setShowDateTimePicker(false)
        const now = new Date()
        setMealDate(formatDateForInput(now))
        setMealTime(formatTimeForInput(now))
    }

    const handleClose = () => {
        if (!isSubmitting) {
            resetForm()
            onClose()
        }
    }

    if (!isOpen) return null

    const canSubmit = description.trim() || photos.length > 0

    // Format display date/time
    const displayDateTime = formatDisplayDateTime(mealDate, mealTime)

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
                onClick={handleClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
                <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                        <div className="w-10 h-1 rounded-full bg-surface-300" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pb-4 border-b border-surface-100 flex-shrink-0">
                        <h2 className="text-heading text-surface-900">Log Meal</h2>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-2 -mr-2 text-surface-400 disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">

                        {/* Success State */}
                        {showSuccess ? (
                            <div className="py-12 text-center animate-scale-in">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-body font-semibold text-surface-900">
                                    Meal logged!
                                </h3>
                                <p className="text-caption text-surface-500 mt-1">
                                    AI is analyzing nutrition...
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Photo Grid */}
                                <div>
                                    <label className="text-caption font-medium text-surface-700 block mb-2">
                                        Photos
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Existing Photos */}
                                        {photos.map((photo, index) => (
                                            <div
                                                key={index}
                                                className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-100"
                                            >
                                                <img
                                                    src={photo.preview}
                                                    alt={`Meal photo ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() => removePhoto(index)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                                {photo.exifDate && (
                                                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-micro text-white">
                                                        📅
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Add Photo Button */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors",
                                                photos.length === 0
                                                    ? "border-primary-300 bg-primary-50 text-primary-600"
                                                    : "border-surface-300 bg-surface-50 text-surface-500"
                                            )}
                                        >
                                            {photos.length === 0 ? (
                                                <Camera className="w-6 h-6" />
                                            ) : (
                                                <ImagePlus className="w-5 h-5" />
                                            )}
                                            <span className="text-micro">
                                                {photos.length === 0 ? 'Add' : 'More'}
                                            </span>
                                        </button>
                                    </div>
                                    {/* Hidden file inputs */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handlePhotoCapture}
                                        className="hidden"
                                        id="gallery-input"
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePhotoCapture}
                                        className="hidden"
                                        id="camera-input"
                                    />
                                </div>

                                {/* Camera/Gallery Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('camera-input')?.click()}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-500 text-white rounded-xl font-medium text-caption hover:bg-primary-600 transition-colors"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Take Photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-100 text-surface-700 rounded-xl font-medium text-caption hover:bg-surface-200 transition-colors"
                                    >
                                        <ImagePlus className="w-4 h-4" />
                                        Choose Photos
                                    </button>
                                </div>

                                {/* EXIF Suggestion Banner */}
                                {suggestedDateTime && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                <Lightbulb className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-caption font-medium text-amber-900">
                                                    Photo taken on {formatDisplayDateTime(
                                                        formatDateForInput(suggestedDateTime),
                                                        formatTimeForInput(suggestedDateTime)
                                                    )}
                                                </p>
                                                <p className="text-micro text-amber-700 mt-0.5">
                                                    Would you like to use this as the meal time?
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={applySuggestedDateTime}
                                                        className="px-3 py-1.5 bg-amber-600 text-white text-caption font-medium rounded-lg"
                                                    >
                                                        Use this time
                                                    </button>
                                                    <button
                                                        onClick={() => setSuggestedDateTime(null)}
                                                        className="px-3 py-1.5 text-amber-700 text-caption font-medium"
                                                    >
                                                        Keep current
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Date/Time Picker */}
                                <div>
                                    <label className="text-caption font-medium text-surface-700 block mb-2">
                                        When did you eat?
                                    </label>

                                    {/* Collapsed view */}
                                    {!showDateTimePicker ? (
                                        <button
                                            onClick={() => setShowDateTimePicker(true)}
                                            className="w-full flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-200 hover:border-surface-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-surface-400" />
                                                <span className="text-body text-surface-700">
                                                    {displayDateTime}
                                                </span>
                                            </div>
                                            <span className="text-caption text-primary-600 font-medium">
                                                Change
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="space-y-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-micro text-surface-500 block mb-1">
                                                        Date
                                                    </label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                                        <input
                                                            type="date"
                                                            value={mealDate}
                                                            onChange={(e) => setMealDate(e.target.value)}
                                                            max={formatDateForInput(new Date())}
                                                            className="input pl-9 text-surface-700"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-micro text-surface-500 block mb-1">
                                                        Time
                                                    </label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                                        <input
                                                            type="time"
                                                            value={mealTime}
                                                            onChange={(e) => setMealTime(e.target.value)}
                                                            className="input pl-9 text-surface-700"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowDateTimePicker(false)}
                                                className="text-caption text-primary-600 font-medium"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-caption font-medium text-surface-700 block mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g., Grilled chicken, rice, salad with olive oil dressing..."
                                        rows={3}
                                        className="input resize-none"
                                    />
                                    <p className="text-micro text-surface-400 mt-1.5">
                                        Add details for more accurate nutrition estimates
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer - Fixed at bottom */}
                    {!showSuccess && (
                        <div className="p-5 pt-3 border-t border-surface-100 flex-shrink-0 safe-bottom">
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit || isSubmitting}
                                className={cn(
                                    "btn btn-primary w-full",
                                    (!canSubmit || isSubmitting) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Logging...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Analyze Meal
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

// Helper functions
function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0]
}

function formatTimeForInput(date: Date): string {
    return date.toTimeString().slice(0, 5)
}

function formatDisplayDateTime(date: string, time: string): string {
    const dateObj = new Date(`${date}T${time}`)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = dateObj.toDateString() === today.toDateString()
    const isYesterday = dateObj.toDateString() === yesterday.toDateString()

    const timeStr = dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })

    if (isToday) {
        return `Today at ${timeStr}`
    } else if (isYesterday) {
        return `Yesterday at ${timeStr}`
    } else {
        const dateStr = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
        return `${dateStr} at ${timeStr}`
    }
}

/**
 * Extract date from EXIF metadata
 * Uses a simple approach that works in browser without external libraries
 */
async function extractExifDate(file: File): Promise<Date | null> {
    try {
        // Only process JPEG images (most likely to have EXIF)
        if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
            return null
        }

        const buffer = await file.arrayBuffer()
        const view = new DataView(buffer)

        // Check for JPEG magic bytes
        if (view.getUint16(0) !== 0xFFD8) {
            return null
        }

        let offset = 2
        while (offset < view.byteLength - 2) {
            const marker = view.getUint16(offset)

            // APP1 marker (EXIF)
            if (marker === 0xFFE1) {
                const length = view.getUint16(offset + 2)
                const exifStart = offset + 4

                // Check for "Exif\0\0"
                const exifHeader = String.fromCharCode(
                    view.getUint8(exifStart),
                    view.getUint8(exifStart + 1),
                    view.getUint8(exifStart + 2),
                    view.getUint8(exifStart + 3)
                )

                if (exifHeader === 'Exif') {
                    // Parse EXIF data (simplified - look for DateTimeOriginal)
                    const exifData = new Uint8Array(buffer, exifStart + 6, length - 6)
                    const exifString = new TextDecoder('ascii').decode(exifData)

                    // Look for date patterns like "2024:12:20 14:30:00"
                    const dateMatch = exifString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
                    if (dateMatch) {
                        const [, year, month, day, hour, minute, second] = dateMatch
                        const date = new Date(
                            parseInt(year),
                            parseInt(month) - 1,
                            parseInt(day),
                            parseInt(hour),
                            parseInt(minute),
                            parseInt(second)
                        )

                        // Validate the date is reasonable (not too old, not in future)
                        const now = new Date()
                        const oneYearAgo = new Date(now)
                        oneYearAgo.setFullYear(now.getFullYear() - 1)

                        if (date > oneYearAgo && date <= now) {
                            return date
                        }
                    }
                }
                break
            }

            // Skip to next marker
            if ((marker & 0xFF00) === 0xFF00) {
                offset += 2 + view.getUint16(offset + 2)
            } else {
                offset += 1
            }
        }

        return null
    } catch (error) {
        console.log('EXIF extraction failed:', error)
        return null
    }
}
