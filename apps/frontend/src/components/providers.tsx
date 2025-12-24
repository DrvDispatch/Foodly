'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { AppBootstrapProvider } from '@/lib/app-store'
import { LaunchScreen } from '@/components/LaunchScreen'
import { DynamicFavicon } from '@/components/DynamicFavicon'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { SWRProvider } from '@/providers/SWRProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <SessionProvider>
                <SWRProvider>
                    <ProfileProvider>
                        <AppBootstrapProvider>
                            <DynamicFavicon />
                            <LaunchScreen />
                            {children}
                        </AppBootstrapProvider>
                    </ProfileProvider>
                </SWRProvider>
            </SessionProvider>
        </ThemeProvider>
    )
}
