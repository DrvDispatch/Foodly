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
    // Get coach unread from global store, fallback to prop
    const appState = useApp()
    const hasUnread = propCoachUnread ?? appState.coachUnread

    // Clear unread when visiting coach page
    useEffect(() => {
        if (pathname === '/coach' && hasUnread) {
            appState.setCoachUnread(false)
        }
    }, [pathname, hasUnread, appState])

    return (
        <>

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
