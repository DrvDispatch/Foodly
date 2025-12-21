import { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import NextImage from 'next/image'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface-50 to-surface-100">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300/20 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-center py-6">
                <div className="flex items-center gap-2">
                    <NextImage src="/favicon.png" alt="Foodly" width={40} height={40} className="rounded-xl" />
                    <span className="text-xl font-semibold text-surface-900">Foodly</span>
                </div>
            </header>

            {/* Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center px-4 pb-12">
                {children}
            </main>
        </div>
    )
}
