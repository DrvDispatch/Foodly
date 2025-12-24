'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient, setTokens } from '@/lib/api-client'
import NextImage from 'next/image'

function SignInContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    const error = searchParams.get('error')

    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isDemoLoading, setIsDemoLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [formError, setFormError] = useState<string | null>(error || null)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setFormError(null)

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password,
            })

            if (result?.error) {
                setFormError(result.error)
            } else {
                router.push(callbackUrl)
                router.refresh()
            }
        } catch {
            setFormError('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true)
        await signIn('google', { callbackUrl })
    }

    const handleDemoMode = async () => {
        setIsDemoLoading(true)
        setFormError(null)

        try {
            const data = await apiClient.post<{ 
                user: { email: string }
                accessToken: string
                refreshToken: string 
            }>('/auth/demo')

            // Store the JWT tokens from the backend
            if (data.accessToken && data.refreshToken) {
                setTokens(data.accessToken, data.refreshToken)
            }

            // Sign in with demo credentials for NextAuth session
            const result = await signIn('credentials', {
                redirect: false,
                email: data.user.email,
                password: 'demo-password', // Demo users bypass password check
            })

            if (result?.error) {
                // For demo, just redirect anyway since the user is created
                router.push('/')
                router.refresh()
            } else {
                router.push('/')
                router.refresh()
            }
        } catch (err) {
            setFormError('Failed to start demo mode')
        } finally {
            setIsDemoLoading(false)
        }
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
                {/* Logo & Title */}
                <div className="text-center space-y-2">
                    <div className="inline-block mb-4">
                        <NextImage src="/favicon.png" alt="Foodly" width={64} height={64} className="rounded-2xl shadow-glow" />
                    </div>
                    <h1 className="text-3xl font-bold text-surface-900">Welcome back</h1>
                    <p className="text-surface-500">Sign in to continue with Foodly</p>
                </div>

                {/* Main Card */}
                <div className="card p-6 space-y-6">
                    {/* Error Message */}
                    {formError && (
                        <div className="px-4 py-3 bg-danger-light text-danger-dark rounded-xl text-sm animate-scale-in">
                            {formError}
                        </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-surface-700">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input input-icon"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium text-surface-700">
                                    Password
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input input-icon pr-12"
                                    placeholder="••••••••"
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
                                <>
                                    Sign in
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-surface-400">or continue with</span>
                        </div>
                    </div>

                    {/* Social & Demo Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading}
                            className={cn(
                                "btn btn-secondary w-full",
                                isGoogleLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Chrome className="w-5 h-5 mr-2" />
                                    Google
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleDemoMode}
                            disabled={isDemoLoading}
                            className={cn(
                                "btn btn-ghost w-full border border-dashed border-primary-300 text-primary-600 hover:bg-primary-50",
                                isDemoLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isDemoLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Try Demo Mode
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-surface-500">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        }>
            <SignInContent />
        </Suspense>
    )
}
