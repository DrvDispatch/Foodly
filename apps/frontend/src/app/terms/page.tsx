'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsOfServicePage() {
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
                    <h1 className="text-xl font-bold text-surface-900 dark:text-white">Terms of Service</h1>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="prose prose-surface dark:prose-invert max-w-none">
                    <p className="text-surface-500 dark:text-surface-400 text-sm mb-8">
                        Last updated: December 24, 2025
                    </p>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            By accessing or using Nutri ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">2. Service Description</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            Nutri is a nutrition tracking application that uses artificial intelligence to analyze meal photos and estimate nutritional content. The App helps users track their food intake, monitor calories and macronutrients, and work towards their health goals.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">3. Important Health Disclaimer</h2>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                            <p className="text-amber-800 dark:text-amber-200 font-medium">
                                ⚠️ Nutri is NOT a medical service
                            </p>
                        </div>
                        <ul className="list-disc list-inside space-y-2 text-surface-600 dark:text-surface-300">
                            <li>Nutritional estimates from AI analysis are approximations and may not be accurate</li>
                            <li>The App does not provide medical, dietary, or health advice</li>
                            <li>Always consult a healthcare professional or registered dietitian for medical concerns</li>
                            <li>Do not use this App to diagnose, treat, or manage any medical condition</li>
                            <li>Users with eating disorders should consult a healthcare provider before using calorie tracking apps</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">4. User Accounts</h2>
                        <div className="space-y-4 text-surface-600 dark:text-surface-300">
                            <p>You are responsible for:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Providing accurate information when creating your account</li>
                                <li>Maintaining the security of your account credentials</li>
                                <li>All activities that occur under your account</li>
                                <li>Notifying us immediately of any unauthorized access</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">5. Acceptable Use</h2>
                        <p className="text-surface-600 dark:text-surface-300 mb-4">You agree NOT to:</p>
                        <ul className="list-disc list-inside space-y-2 text-surface-600 dark:text-surface-300">
                            <li>Use the App for any illegal purpose</li>
                            <li>Upload inappropriate, offensive, or harmful content</li>
                            <li>Attempt to hack, reverse-engineer, or disrupt the service</li>
                            <li>Share your account with others</li>
                            <li>Use automated systems to access the App</li>
                            <li>Misrepresent your identity or affiliation</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">6. Intellectual Property</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            The App, including its design, features, and content, is owned by Nutri and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our permission.
                        </p>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed mt-4">
                            You retain ownership of any photos or content you upload. By uploading content, you grant us a license to process it for providing the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">7. Limitation of Liability</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            To the maximum extent permitted by law, Nutri shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App. This includes but is not limited to health outcomes based on nutritional information provided by the App.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">8. Service Availability</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            We strive to maintain high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue features at any time. We will provide notice of significant changes when possible.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">9. Account Termination</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            You may delete your account at any time through the App settings. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted according to our Privacy Policy.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">10. Changes to Terms</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            We may update these Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify you of significant changes.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">11. Governing Law</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through good-faith negotiation or appropriate legal channels.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">12. Contact</h2>
                        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                            For questions about these Terms of Service, please contact us at:
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
