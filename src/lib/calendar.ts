import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

/**
 * Generate a consistent day key (YYYY-MM-DD) from a date and timezone.
 * Uses the user's timezone to ensure day boundaries are respected.
 */
export function getDayKey(date: Date, timeZone: string = 'UTC'): string {
    // Convert UTC date to user's timezone
    const zonedDate = toZonedTime(date, timeZone)
    return format(zonedDate, 'yyyy-MM-dd')
}

/**
 * Get the start and end of a month in UTC, relative to the user's timezone.
 * Used for database queries to fetch all records that fall within the user's month.
 */
export function getMonthBounds(year: number, month: number, timeZone: string = 'UTC') {
    // Construct start of month in user's timezone
    // Note: month is 0-indexed in JS Date, but we surely expect 1-12 here? 
    // Let's assume input is 1-12 (standard month number).

    const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
    // Create a date that effectively represents this local time in the target timezone
    // We can't just new Date(startStr) because that treats it as local or UTC.
    // A simpler way: construct the string 'YYYY-MM-DD' and let getDayKey handle consistency?
    // Actually, for query range, we specifically need the ISO strings.

    // Let's rely on date-fns-tz for robust construction if possible, or string manipulation
    // since dayKeys are just strings "YYYY-MM-DD".

    // Actually, since we query by dayKey string, we just need the string range?
    // Yes! If we query `activeSnapshot.mealTime`, we need exact bounds.
    // But if we query `CalendarDaySummary` by `dayKey`, we just need "2024-05-01" to "2024-05-31".

    const daysInMonth = new Date(year, month, 0).getDate()

    const startKey = `${year}-${String(month).padStart(2, '0')}-01`
    const endKey = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

    return { startKey, endKey }
}

/**
 * Default patterns for Calendar Highlight Mode
 */
export const PATTERNS = {
    LOW_PROTEIN: 'low_protein',
    HIGH_CARB: 'high_carb',
    MISSED_LOGGING: 'missed_logging',
    ON_TRACK: 'on_track',
    OVER_TARGET: 'over_target',
    TRAINING: 'training',
} as const

export type PatternType = typeof PATTERNS[keyof typeof PATTERNS]

/**
 * Priority for Context Tags (highest to lowest)
 */
export const CONTEXT_PRIORITY = {
    travel: 100,
    training: 90,
    social: 80,
    rest: 70,
    other: 0,
} as const

export function getDominantContext(tags: string[]): string | null {
    if (!tags || tags.length === 0) return null

    return tags.sort((a, b) => {
        const pA = CONTEXT_PRIORITY[a as keyof typeof CONTEXT_PRIORITY] || 0
        const pB = CONTEXT_PRIORITY[b as keyof typeof CONTEXT_PRIORITY] || 0
        return pB - pA
    })[0]
}
