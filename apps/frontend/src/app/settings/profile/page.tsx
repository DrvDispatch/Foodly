'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, TrendingUp, Camera, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useProfile } from '@/hooks/useProfile'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import NextImage from 'next/image'

const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
    { id: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
    { id: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
    { id: 'active', label: 'Active', desc: '6-7 days/week' },
    { id: 'athlete', label: 'Very Active', desc: 'Athlete or physical job' }
]

export default function EditProfilePage() {
    const router = useRouter()
    const { data: session, update: updateSession } = useSession()
    const { profile, updateProfile, refresh } = useProfile()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [sex, setSex] = useState<string>('')
    const [birthDate, setBirthDate] = useState('')
    const [heightCm, setHeightCm] = useState<number>(170)
    const [currentWeight, setCurrentWeight] = useState<number>(70)
    const [targetWeight, setTargetWeight] = useState<number>(70)
    const [activityLevel, setActivityLevel] = useState<string>('moderate')

    // Avatar state
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

    // UI state
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [showRecalcBanner, setShowRecalcBanner] = useState(false)
    const [originalValues, setOriginalValues] = useState<any>(null)

    // Load profile data
    useEffect(() => {
        if (profile) {
            const values = {
                sex: profile.sex || '',
                birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
                heightCm: profile.heightCm || 170,
                currentWeight: profile.currentWeight || 70,
                targetWeight: profile.targetWeight || 70,
                activityLevel: profile.activityLevel || 'moderate'
            }
            setSex(values.sex)
            setBirthDate(values.birthDate)
            setHeightCm(values.heightCm)
            setCurrentWeight(values.currentWeight)
            setTargetWeight(values.targetWeight)
            setActivityLevel(values.activityLevel)
            setOriginalValues(values)
        }
    }, [profile])

    // Load avatar from session
    useEffect(() => {
        if (session?.user?.image) {
            setAvatarUrl(session.user.image)
        }
    }, [session])

    // Track changes
    useEffect(() => {
        if (originalValues) {
            const changed =
                sex !== originalValues.sex ||
                birthDate !== originalValues.birthDate ||
                heightCm !== originalValues.heightCm ||
                currentWeight !== originalValues.currentWeight ||
                targetWeight !== originalValues.targetWeight ||
                activityLevel !== originalValues.activityLevel ||
                avatarPreview !== null
            setHasChanges(changed)

            // Show recalc banner if weight/height/activity changed
            const macroAffectingChange =
                heightCm !== originalValues.heightCm ||
                currentWeight !== originalValues.currentWeight ||
                activityLevel !== originalValues.activityLevel
            setShowRecalcBanner(macroAffectingChange && changed)
        }
    }, [sex, birthDate, heightCm, currentWeight, targetWeight, activityLevel, originalValues, avatarPreview])

    // Calculate age from birth date
    const calculateAge = (dateStr: string): number | null => {
        if (!dateStr) return null
        const birthDate = new Date(dateStr)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    // Handle avatar file selection
    const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Create preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    // Upload avatar
    const uploadAvatar = async (base64: string) => {
        setIsUploadingAvatar(true)
        try {
            // Use apiClient to call the NestJS backend
            const response = await apiClient.post<{ imageUrl: string }>('/account/avatar', {
                imageBase64: base64
            })
            setAvatarUrl(response.imageUrl)
            setAvatarPreview(null)
            // Update session to reflect new avatar
            await updateSession()
        } catch (err) {
            console.error('Failed to upload avatar:', err)
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Upload avatar first if there's a preview
            if (avatarPreview) {
                await uploadAvatar(avatarPreview)
            }

            const age = calculateAge(birthDate)
            await updateProfile({
                sex,
                birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
                age: age ?? undefined,
                heightCm,
                currentWeight,
                targetWeight,
                activityLevel,
            })
            await refresh()
            router.back()
        } catch (err) {
            console.error('Failed to save profile:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const displayImage = avatarPreview || avatarUrl

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-surface-50 dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold text-surface-900">Edit Profile</h1>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            hasChanges
                                ? "bg-primary-500 text-white hover:bg-primary-600"
                                : "bg-surface-100 text-surface-400 dark:bg-surface-800"
                        )}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </header>

            {/* Macro Recalculation Banner */}
            {showRecalcBanner && (
                <div className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Macro targets will be recalculated
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Your calorie and protein targets will update based on these changes.
                        </p>
                    </div>
                </div>
            )}

            {/* Form */}
            <main className="p-4 space-y-6">
                {/* Profile Picture */}
                <section className="bg-white dark:bg-surface-800 rounded-2xl p-6 flex flex-col items-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="relative group"
                    >
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                            {displayImage ? (
                                <NextImage
                                    src={displayImage}
                                    alt="Profile"
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-10 h-10 text-surface-400" />
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        {isUploadingAvatar && (
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </button>
                    <p className="text-xs text-surface-500 mt-3">Tap to change photo</p>
                    {avatarPreview && (
                        <p className="text-xs text-primary-500 mt-1">New photo will be saved when you tap Save</p>
                    )}
                </section>

                {/* Sex */}
                <section className="bg-white dark:bg-surface-800 rounded-2xl p-4">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3 block">
                        Sex
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'male', label: '♂ Male' },
                            { id: 'female', label: '♀ Female' }
                        ].map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setSex(option.id)}
                                className={cn(
                                    "py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all",
                                    sex === option.id
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                                        : "border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Date of Birth */}
                <section className="bg-white dark:bg-surface-800 rounded-2xl p-4">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3 block">
                        Date of Birth
                    </label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-900 focus:outline-none focus:border-primary-500"
                    />
                    {birthDate && (
                        <p className="text-xs text-surface-500 mt-2">
                            Age: {calculateAge(birthDate)} years old
                        </p>
                    )}
                </section>

                {/* Height */}
                <section className="bg-white dark:bg-surface-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                            Height
                        </label>
                        <span className="text-lg font-semibold text-surface-900">{heightCm} cm</span>
                    </div>
                    <input
                        type="range"
                        min="120"
                        max="220"
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                        className="w-full h-2 bg-surface-200 dark:bg-surface-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-surface-400 mt-1">
                        <span>120 cm</span>
                        <span>220 cm</span>
                    </div>
                </section>

                {/* Weight */}
                <section className="bg-white dark:bg-surface-800 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2 block">
                                Current Weight
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={currentWeight}
                                    onChange={(e) => setCurrentWeight(Number(e.target.value))}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-900 focus:outline-none focus:border-primary-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-surface-400">kg</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2 block">
                                Target Weight
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(Number(e.target.value))}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-900 focus:outline-none focus:border-primary-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-surface-400">kg</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Activity Level */}
                <section className="bg-white dark:bg-surface-800 rounded-2xl p-4">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3 block">
                        Activity Level
                    </label>
                    <div className="space-y-2">
                        {activityLevels.map((level) => (
                            <button
                                key={level.id}
                                onClick={() => setActivityLevel(level.id)}
                                className={cn(
                                    "w-full p-3 rounded-xl text-left border-2 transition-all",
                                    activityLevel === level.id
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                        : "border-surface-200 dark:border-surface-600 hover:border-surface-300"
                                )}
                            >
                                <p className={cn(
                                    "text-sm font-medium",
                                    activityLevel === level.id
                                        ? "text-primary-700 dark:text-primary-300"
                                        : "text-surface-700 dark:text-surface-300"
                                )}>
                                    {level.label}
                                </p>
                                <p className="text-xs text-surface-400 mt-0.5">{level.desc}</p>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}
