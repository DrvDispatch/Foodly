'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [email, setEmail] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setFormError(null)

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong')
            }

            setSuccess(true)
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
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
                        <img src="/favicon.png" alt="Foodly" className="w-16 h-16 rounded-2xl shadow-glow" />
                    </div>
                    <h1 className="text-3xl font-bold text-surface-900">Reset password</h1>
                    <p className="text-surface-500">
                        Enter your email and we&apos;ll send you a link to reset your password
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
                                <h2 className="text-xl font-semibold text-surface-900">Check your email</h2>
                                <p className="text-surface-500">
                                    If an account exists with <span className="font-medium">{email}</span>, you will receive a password reset link shortly.
                                </p>
                            </div>
                            <Link href="/auth/signin" className="btn btn-primary inline-flex">
                                Back to sign in
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
                                    <label htmlFor="email" className="text-sm font-medium text-surface-700">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                        <input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input input-icon"
                                            placeholder="you@example.com"
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
                                        'Send reset link'
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
