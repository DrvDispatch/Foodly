'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, History, TrendingUp, Sparkles, MoreHorizontal, Heart, Settings, X, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/app-store'

const navItems = [
    { href: '/', label: 'Today', icon: Home },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/timeline', label: 'Timeline', icon: History },
    { href: '/trends', label: 'Trends', icon: TrendingUp },
    { href: '/health', label: 'Health', icon: Heart },
    { href: '/weight', label: 'Weight', icon: Scale },
    { href: '/coach', label: 'Coach', icon: Sparkles, hasBadge: true },
    { href: '/settings', label: 'Settings', icon: Settings },
]

interface BottomNavProps {
    coachUnread?: boolean // Optional override - uses global store if not provided
}

export function BottomNav({ coachUnread: propCoachUnread }: BottomNavProps = {}) {
    const pathname = usePathname()
    const [isMoreOpen, setIsMoreOpen] = useState(false)
    const moreRef = useRef<HTMLDivElement>(null)

    // Get coach unread from global store, fallback to prop
    const appState = useApp()
    const hasUnread = propCoachUnread ?? appState.coachUnread

    // Clear unread when visiting coach page
    useEffect(() => {
        if (pathname === '/coach' && hasUnread) {
            appState.setCoachUnread(false)
        }
    }, [pathname, hasUnread, appState])

    // Close More menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
                setIsMoreOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Check if current page is in More menu
    const isMoreActive = moreItems.some(item => pathname === item.href)

    return (
        <>
            {/* More Menu Overlay */}
            {isMoreOpen && (
                <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsMoreOpen(false)} />
            )}

            {/* More Menu */}
            <div
                ref={moreRef}
                className={cn(
                    "fixed bottom-20 right-4 bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden transition-all duration-200 z-50",
                    isMoreOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}
            >
                <div className="p-2 space-y-1">
                    {moreItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMoreOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                    isActive
                                        ? "bg-primary-50 text-primary-600"
                                        : "hover:bg-surface-50 text-surface-600"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-[10px] text-surface-400">{item.description}</p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 pb-safe pt-2 px-2 z-40">
                <div className="flex items-center justify-between overflow-x-auto scrollbar-hide -mx-2 px-2 gap-1 touch-pan-x">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        // Show badge for Coach if unread messages
                        const showBadge = item.hasBadge && hasUnread

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[4.5rem] py-2 rounded-xl transition-all duration-200 relative shrink-0",
                                    isActive
                                        ? "text-primary-600 dark:text-primary-400 font-medium"
                                        : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                                )}
                            >
                                <div className="relative">
                                    <item.icon className={cn("w-6 h-6 mb-1", isActive && "fill-current/20")} />
                                    {showBadge && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-surface-900 animate-pulse" />
                                    )}
                                </div>
                                <span className="text-[10px] whitespace-nowrap">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
