'use client'

import { User } from 'lucide-react'
import NextImage from 'next/image'
import { useSession } from 'next-auth/react'

interface AccountCardProps {
    profile: {
        name?: string | null
        email?: string | null
        image?: string | null
        birthDate?: string | null
        age?: number | null
        sex?: string | null
    }
    onEdit?: () => void
}

export function AccountCard({ profile, onEdit }: AccountCardProps) {
    const { data: session } = useSession()

    // Use session data first, fall back to profile
    const name = session?.user?.name || profile.name
    const email = session?.user?.email || profile.email
    const image = session?.user?.image || profile.image

    // Format displays
    const ageDisplay = profile.age ? `${profile.age} years` : null
    const sexDisplay = profile.sex
        ? (profile.sex === 'male' ? '♂ Male' : profile.sex === 'female' ? '♀ Female' : profile.sex)
        : null

    return (
        <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Profile Picture */}
                <div className="relative">
                    {image ? (
                        <NextImage
                            src={image}
                            alt="Profile"
                            width={56}
                            height={56}
                            className="w-14 h-14 rounded-full object-cover border-2 border-surface-100 dark:border-surface-700"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-surface-400" />
                        </div>
                    )}
                </div>

                {/* Name and Details */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-surface-900 truncate">
                        {name || 'Your Name'}
                    </h2>
                    <p className="text-sm text-surface-500 truncate">
                        {email || 'No email set'}
                    </p>
                    {(sexDisplay || ageDisplay) && (
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-surface-400">
                            {sexDisplay && <span>{sexDisplay}</span>}
                            {sexDisplay && ageDisplay && <span>•</span>}
                            {ageDisplay && <span>{ageDisplay}</span>}
                        </div>
                    )}
                </div>

                {/* Edit Button */}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 rounded-full hover:bg-primary-100 transition-colors"
                    >
                        Edit
                    </button>
                )}
            </div>
        </div>
    )
}
