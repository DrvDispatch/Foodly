'use client'

import { cn } from '@/lib/utils'

// Reusable skeleton primitives
export function SkeletonPulse({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse bg-surface-200 dark:bg-surface-700 rounded", className)} />
    )
}

export function SkeletonCircle({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse bg-surface-200 dark:bg-surface-700 rounded-full", className)} />
    )
}

export function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "animate-pulse bg-surface-200 dark:bg-surface-700 rounded h-4",
                        i === lines - 1 && lines > 1 && "w-3/4"
                    )}
                />
            ))}
        </div>
    )
}

// Page-specific skeletons
export function SettingsPageSkeleton() {
    return (
        <div className="space-y-4 px-4 py-4">
            {/* Account Card Skeleton */}
            <div className="space-y-2">
                <SkeletonPulse className="h-3 w-16" />
                <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 flex items-center gap-4">
                    <SkeletonCircle className="w-14 h-14" />
                    <div className="flex-1 space-y-2">
                        <SkeletonPulse className="h-5 w-32" />
                        <SkeletonPulse className="h-4 w-48" />
                    </div>
                </div>
            </div>

            {/* Identity Card Skeleton */}
            <div className="space-y-2">
                <SkeletonPulse className="h-3 w-28" />
                <div className="bg-primary-50 dark:bg-primary-950 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <SkeletonCircle className="w-10 h-10" />
                        <div className="space-y-1">
                            <SkeletonPulse className="h-3 w-20" />
                            <SkeletonPulse className="h-5 w-24" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <SkeletonPulse className="h-20 rounded-xl" />
                        <SkeletonPulse className="h-20 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Other sections */}
            {[1, 2, 3].map(i => (
                <SkeletonPulse key={i} className="h-14 rounded-2xl" />
            ))}
        </div>
    )
}

export function WeightPageSkeleton() {
    return (
        <div className="space-y-4 px-4 py-4">
            {/* Chart area */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <SkeletonPulse className="h-6 w-32" />
                    <SkeletonPulse className="h-8 w-24 rounded-full" />
                </div>
                <SkeletonPulse className="h-48 rounded-xl" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-surface-800 rounded-xl p-3 space-y-2">
                        <SkeletonPulse className="h-3 w-16" />
                        <SkeletonPulse className="h-6 w-12" />
                    </div>
                ))}
            </div>

            {/* History */}
            <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-surface-800 rounded-xl p-3 flex justify-between">
                        <SkeletonPulse className="h-5 w-24" />
                        <SkeletonPulse className="h-5 w-16" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function CoachPageSkeleton() {
    return (
        <div className="space-y-4 px-4 py-4">
            {/* Header card */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <SkeletonCircle className="w-12 h-12" />
                    <div className="space-y-1 flex-1">
                        <SkeletonPulse className="h-5 w-24" />
                        <SkeletonPulse className="h-4 w-32" />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className={cn(
                        "rounded-2xl p-4 space-y-2",
                        i % 2 === 0 ? "bg-primary-50 ml-8" : "bg-white dark:bg-surface-800 mr-8"
                    )}>
                        <SkeletonPulse className="h-4 w-full" />
                        <SkeletonPulse className="h-4 w-3/4" />
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="fixed bottom-20 left-4 right-4">
                <SkeletonPulse className="h-12 rounded-xl" />
            </div>
        </div>
    )
}
