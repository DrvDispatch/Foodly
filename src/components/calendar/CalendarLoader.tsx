'use client'

export function CalendarLoader() {
    return (
        <div className="bg-white rounded-2xl p-1 shadow-sm opacity-60 animate-pulse">
            <div className="grid grid-cols-7 mb-2">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-4 bg-surface-100 rounded mx-auto w-4" />
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {[...Array(35)].map((_, i) => (
                    <div key={i} className="aspect-square bg-surface-100 rounded-lg" />
                ))}
            </div>
        </div>
    )
}
