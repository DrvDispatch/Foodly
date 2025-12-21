'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { AppBootstrapProvider } from '@/lib/app-store'
import { LaunchScreen } from '@/components/LaunchScreen'
import { DynamicFavicon } from '@/components/DynamicFavicon'

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <AppBootstrapProvider>
                <DynamicFavicon />
                <LaunchScreen />
                {children}
            </AppBootstrapProvider>
        </SessionProvider>
    )
}

