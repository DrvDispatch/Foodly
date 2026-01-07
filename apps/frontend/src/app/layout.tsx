import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
})

export const metadata: Metadata = {
    title: 'Foodly | AI Calorie Counter & Food Tracker',
    description: 'Smart food tracking made simple. Snap photos of your meals, get accurate calorie counts, and reach your nutrition goals with AI-powered insights.',
    keywords: ['food tracker', 'calorie counter', 'nutrition', 'AI', 'diet', 'macros', 'meal tracking'],
    authors: [{ name: 'Foodly' }],
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Foodly',
    },
    icons: {
        icon: [
            { url: '/favicon.png', media: '(prefers-color-scheme: light)' },
            { url: '/favicon-dark.png', media: '(prefers-color-scheme: dark)' },
        ],
        apple: [
            { url: '/icon-192.png', media: '(prefers-color-scheme: light)' },
            { url: '/icon-192-dark.png', media: '(prefers-color-scheme: dark)' },
        ],
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: 'resizes-content',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
        { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
    ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Inline script to apply theme before React hydrates (prevents flash)
    const themeScript = `
        (function() {
            try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else if (theme === 'system') {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.documentElement.classList.add('dark');
                    }
                }
            } catch (e) {}
        })();
    `;

    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <body className="min-h-screen bg-surface-50 dark:bg-surface-50 text-surface-900 antialiased">
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}

