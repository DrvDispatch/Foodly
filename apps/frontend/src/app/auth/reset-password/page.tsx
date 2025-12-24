'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import NextImage from 'next/image'

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!token) {
            setFormError('Invalid reset link')
            return
        }

        if (password !== confirmPassword) {
            setFormError('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setFormError('Password must be at least 8 characters')
            return
        }

        setIsLoading(true)
        setFormError(null)

        try {
            await apiClient.post('/auth/reset-password', { token, password })
            setSuccess(true)
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to reset password')
        } finally {
            setIsLoading(false)
        }
    }

    // No token provided
    if (!token) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-surface-50 to-surface-100">
                <div className="relative w-full max-w-md space-y-8 animate-fade-in">
                    <div className="card p-6 text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger-light text-danger mx-auto">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-semibold text-surface-900">Invalid Reset Link</h2>
                        <p className="text-surface-500">
                            This password reset link is invalid or has expired.
                        </p>
                        <Link href="/auth/forgot-password" className="btn btn-primary inline-flex">
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-surface-50 to-surface-100">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300/20 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative w-full max-w-md space-y-8 animate-fade-in">
                {/* Back Link */}
                <Link
                    href="/auth/signin"
                    className="inline-flex items-center text-surface-500 hover:text-surface-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                </Link>

                {/* Logo & Title */}
                <div className="text-center space-y-2">
                    <div className="inline-block mb-4">
                        <NextImage src="/favicon.png" alt="Foodly" width={64} height={64} className="rounded-2xl shadow-glow" />
                    </div>
                    <h1 className="text-3xl font-bold text-surface-900">Set new password</h1>
                    <p className="text-surface-500">
                        Create a strong password for your account
                    </p>
                </div>

                {/* Main Card */}
                <div className="card p-6 space-y-6">
                    {success ? (
                        <div className="text-center space-y-4 py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light text-success">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-surface-900">Password Reset!</h2>
                                <p className="text-surface-500">
                                    Your password has been successfully reset. You can now sign in with your new password.
                                </p>
                            </div>
                            <Link href="/auth/signin" className="btn btn-primary inline-flex">
                                Sign In
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Error Message */}
                            {formError && (
                                <div className="px-4 py-3 bg-danger-light text-danger-dark rounded-xl text-sm animate-scale-in">
                                    {formError}
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium text-surface-700">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input input-icon pr-12"
                                            placeholder="Min. 8 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="confirmPassword" className="text-sm font-medium text-surface-700">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                        <input
                                            id="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input input-icon"
                                            placeholder="Confirm your password"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "btn btn-primary w-full",
                                        isLoading && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
