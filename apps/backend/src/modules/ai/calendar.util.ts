/**
 * Calendar Utilities
 * 
 * Functions for date handling, day keys, and calendar-related constants.
 * Used across the backend for timezone-aware date operations.
 */

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * Generate a consistent day key (YYYY-MM-DD) from a date and timezone.
 * Uses the user's timezone to ensure day boundaries are respected.
 */
export function getDayKey(date: Date, timeZone: string = 'UTC'): string {
    // Convert UTC date to user's timezone
    const zonedDate = toZonedTime(date, timeZone);
    return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Get the start and end of a month as day key strings.
 * Used for database queries to fetch all records that fall within the user's month.
 * 
 * @param year - Full year (e.g., 2024)
 * @param month - 1-indexed month (1-12)
 * @param timeZone - User's timezone (currently unused but kept for API consistency)
 */
export function getMonthBounds(year: number, month: number, _timeZone: string = 'UTC') {
    // Since we query by dayKey string, we just need the string range
    const daysInMonth = new Date(year, month, 0).getDate();

    const startKey = `${year}-${String(month).padStart(2, '0')}-01`;
    const endKey = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

    return { startKey, endKey };
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
} as const;

export type PatternType = typeof PATTERNS[keyof typeof PATTERNS];

/**
 * Priority for Context Tags (highest to lowest)
 */
export const CONTEXT_PRIORITY = {
    travel: 100,
    training: 90,
    social: 80,
    rest: 70,
    other: 0,
} as const;

/**
 * Get the dominant context tag from a list of tags
 * Returns the tag with highest priority, or null if empty
 */
export function getDominantContext(tags: string[]): string | null {
    if (!tags || tags.length === 0) return null;

    return tags.sort((a, b) => {
        const pA = CONTEXT_PRIORITY[a as keyof typeof CONTEXT_PRIORITY] || 0;
        const pB = CONTEXT_PRIORITY[b as keyof typeof CONTEXT_PRIORITY] || 0;
        return pB - pA;
    })[0];
}
