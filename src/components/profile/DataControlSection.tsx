'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Shield, Download, Upload, Trash2, AlertTriangle, X, FileText } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'

interface DataControlSectionProps {
    className?: string
}

export function DataControlSection({ className }: DataControlSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        try {
            // For export, we need the raw response to get blob
            const response = await apiClient.raw<any>('/export')
            if (!response.ok) throw new Error('Export failed')

            // Get blob from response
            const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `foodly-export-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    const handleDelete = async () => {
        if (deleteConfirmation !== 'DELETE MY ACCOUNT') return

        setIsDeleting(true)
        try {
            await apiClient.delete('/account/delete')
            await signOut({ callbackUrl: '/' })
        } catch (error) {
            console.error('Delete failed:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className={cn("bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden", className)}>
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-surface-400" />
                    <span className="text-sm font-semibold text-surface-900">Data & Privacy</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-surface-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-surface-400" />
                )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Export Data */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full flex items-center justify-between p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Download className="w-4 h-4 text-primary-600" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-surface-900">Export Data</p>
                                <p className="text-[10px] text-surface-400">
                                    Includes meals, nutrition data, weight logs, and profile settings.
                                </p>
                            </div>
                        </div>
                        {isExporting && (
                            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        )}
                    </button>

                    {/* Import Data (placeholder) */}
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl opacity-50">
                        <div className="flex items-center gap-3">
                            <Upload className="w-4 h-4 text-surface-400" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-surface-900">Import Data</p>
                                <p className="text-[10px] text-surface-400">Coming soon</p>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Info */}
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium text-blue-900">Your Data, Your Control</p>
                                <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
                                    Your data is stored securely and never shared with third parties.
                                    AI analysis happens in real-time and is not stored permanently.
                                    You can export or delete your data at any time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Delete Account */}
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-xl text-left hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <div>
                            <p className="text-sm font-medium text-red-700">Delete Account</p>
                            <p className="text-[10px] text-red-500">Permanently delete all your data</p>
                        </div>
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-900">Delete Account</h3>
                        </div>

                        <p className="text-sm text-surface-600 mb-4">
                            This will permanently delete your account and all associated data. This action cannot be undone.
                        </p>

                        <p className="text-xs text-surface-500 mb-2">
                            Type <span className="font-mono font-semibold">DELETE MY ACCOUNT</span> to confirm:
                        </p>

                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="DELETE MY ACCOUNT"
                            className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:border-red-400 font-mono text-sm mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation('') }}
                                className="flex-1 py-3 text-sm font-medium text-surface-600 bg-surface-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmation !== 'DELETE MY ACCOUNT' || isDeleting}
                                className="flex-1 py-3 text-sm font-medium text-white bg-red-600 rounded-xl disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
