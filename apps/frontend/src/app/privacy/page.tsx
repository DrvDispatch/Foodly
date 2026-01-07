'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PrivacyPolicyPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-surface-800/80 backdrop-blur-lg border-b border-surface-200 dark:border-surface-700">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
                    </button>
                    <h1 className="text-xl font-bold text-surface-900 dark:text-white">Privacy Policy</h1>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="prose prose-surface dark:prose-invert max-w-none">
                    <p className="text-surface-500 dark:text-surface-400 text-sm mb-8">
                        Last updated: December 24, 2025
                    </p>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">1. Introduction</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            Nutri ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our nutrition tracking application.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">2. Information We Collect</h2>
                        <div className="space-y-4 text-surface-600 dark:text-surface-300">
                            <div>
                                <h3 className="font-medium text-surface-800 dark:text-surface-200">Account Information</h3>
                                <p>Email address, name, and profile picture when you create an account or sign in with Google.</p>
                            </div>
                            <div>
                                <h3 className="font-medium text-surface-800 dark:text-surface-200">Health & Body Data</h3>
                                <p>Height, weight, age, sex, activity level, and nutrition goals you provide during onboarding.</p>
                            </div>
                            <div>
                                <h3 className="font-medium text-surface-800 dark:text-surface-200">Meal Data</h3>
                                <p>Photos of meals, meal descriptions, timestamps, and AI-analyzed nutritional information.</p>
                            </div>
                            <div>
                                <h3 className="font-medium text-surface-800 dark:text-surface-200">Usage Data</h3>
                                <p>App interactions, feature usage, and error logs to improve our service.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">3. How We Use Your Information</h2>
                        <ul className="list-disc list-inside space-y-2 text-surface-600 dark:text-surface-300">
                            <li>Provide personalized nutrition tracking and recommendations</li>
                            <li>Analyze meal photos using AI to estimate nutritional content</li>
                            <li>Calculate calorie and macro targets based on your goals</li>
                            <li>Generate insights and trends about your eating habits</li>
                            <li>Send important service updates (no marketing spam)</li>
                            <li>Improve and optimize our application</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">4. Third-Party Services</h2>
                        <div className="space-y-4 text-surface-600 dark:text-surface-300">
                            <div>
                                <h3 className="font-medium text-surface-800 dark:text-surface-200">Google Gemini AI</h3>
                                <p>We use Google's Gemini AI to analyze meal photos and estimate nutritional values. Meal images are processed by Google's servers according to their privacy policy.</p>
                            </div>
                            <div>
                                <h3 className="font-medium text-surface-800 dark:text-surface-200">Google OAuth</h3>
                                <p>If you sign in with Google, we receive basic profile information as authorized by you.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">5. Data Storage & Security</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            Your data is stored securely using industry-standard encryption. We use secure HTTPS connections for all data transmission. Meal photos are stored in encrypted cloud storage. We never sell your personal data to third parties.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">6. Your Rights</h2>
                        <ul className="list-disc list-inside space-y-2 text-surface-600 dark:text-surface-300">
                            <li><strong>Access:</strong> View all data we have about you</li>
                            <li><strong>Export:</strong> Download your data in standard formats</li>
                            <li><strong>Delete:</strong> Request complete deletion of your account and data</li>
                            <li><strong>Correct:</strong> Update any inaccurate information</li>
                        </ul>
                        <p className="mt-4 text-surface-600 dark:text-surface-300">
                            You can exercise these rights through the Settings page in the app, or by contacting us directly.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">7. Data Retention</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            We retain your data while your account is active. When you delete your account, all personal data is permanently removed within 30 days. Anonymized, aggregated data may be retained for analytics.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">8. Children's Privacy</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            Nutri is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">9. Changes to This Policy</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">10. Contact Us</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            If you have questions about this Privacy Policy or your data, please contact us at:
                        </p>
                        <p className="mt-2 text-primary-600 dark:text-primary-400 font-medium">
                            support@nutri.app
                        </p>
                    </section>
                </div>
            </main>
        </div>
    )
}
