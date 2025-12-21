'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, Chrome, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import NextImage from 'next/image'

export default function SignUpPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setFormError(null)

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setFormError('Passwords do not match')
            setIsLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong')
            }

            setSuccess(true)

            // Auto sign in after registration
            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password,
            })

            if (!result?.error) {
                router.push('/onboarding/goal')
                router.refresh()
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true)
        await signIn('google', { callbackUrl: '/onboarding/goal' })
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
                    <h1 className="text-3xl font-bold text-surface-900">Create account</h1>
                    <p className="text-surface-500">Start tracking with Foodly</p>
                </div>

                {/* Main Card */}
                <div className="card p-6 space-y-6">
                    {/* Messages */}
                    {formError && (
                        <div className="px-4 py-3 bg-danger-light text-danger-dark rounded-xl text-sm animate-scale-in">
                            {formError}
                        </div>
                    )}

                    {success && (
                        <div className="px-4 py-3 bg-success-light text-success-dark rounded-xl text-sm animate-scale-in">
                            Account created! Signing you in...
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-surface-700">
                                Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input input-icon"
                                    placeholder="Your name"
                                />
                            </div>
                        </div>

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
                            <label htmlFor="password" className="text-sm font-medium text-surface-700">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                                <>
                                    Create account
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

                    {/* Google Button */}
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

                    {/* Terms */}
                    <p className="text-xs text-center text-surface-400">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="text-primary-600 hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary-600 hover:underline">
                            Privacy Policy
                        </Link>
                    </p>
                </div>

                {/* Sign In Link */}
                <p className="text-center text-surface-500">
                    Already have an account?{' '}
                    <Link href="/auth/signin" className="text-primary-600 hover:text-primary-700 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
