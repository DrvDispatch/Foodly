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
]

const moreItems = [
    { href: '/weight', label: 'Weight', icon: Scale, description: 'Track progress' },
    { href: '/coach', label: 'Coach', icon: Sparkles, description: 'AI Coach', hasBadge: true },
    { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferences' },
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
            <nav className="bottom-nav">
                {navItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn("nav-item", isActive && "active")}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}

                {/* More Button */}
                <button
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                    className={cn(
                        "nav-item",
                        (isMoreOpen || isMoreActive) && "active"
                    )}
                >
                    <div className="relative">
                        {isMoreOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <MoreHorizontal className="w-5 h-5" />
                        )}
                    </div>
                    <span>More</span>
                </button>
            </nav>
        </>
    )
}
