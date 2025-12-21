'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, RefreshCw, Sparkles, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { BottomNav } from '@/components/bottom-nav'
import { useThemedAsset } from '@/hooks/useThemedAsset'

interface CoachMessage {
    id: string
    role: 'coach' | 'user'
    type: 'reflection' | 'reply' | 'question'
    content: string
    date: string
    createdAt: string
}

export default function CoachPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const coachAvatar = useThemedAsset('coachAvatar')
    const [messages, setMessages] = useState<CoachMessage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [isGeneratingReflection, setIsGeneratingReflection] = useState(false)
    const [input, setInput] = useState('')
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/signin')
        }
    }, [status, router])

    // Fetch messages
    const fetchMessages = useCallback(async (cursor?: string) => {
        try {
            const url = cursor
                ? `/api/coach/messages?cursor=${cursor}&days=30`
                : '/api/coach/messages?days=7'
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                if (cursor) {
                    // Prepend older messages
                    setMessages(prev => [...data.messages, ...prev])
                } else {
                    setMessages(data.messages)
                }
                setNextCursor(data.nextCursor)
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        }
    }, [])

    // Initial load
    useEffect(() => {
        if (status === 'authenticated') {
            fetchMessages().finally(() => {
                setIsLoading(false)
                // Scroll to bottom after loading
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
                }, 100)
            })
            // Mark as read
            fetch('/api/coach/state', { method: 'POST' })
        }
    }, [status, fetchMessages])

    // Try to generate reflection if after 8pm
    useEffect(() => {
        if (status === 'authenticated') {
            const hour = new Date().getHours()
            if (hour >= 20) {
                fetch('/api/coach/reflection', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.generated && data.message) {
                            setMessages(prev => [...prev, data.message])
                        }
                    })
                    .catch(console.error)
            }
        }
    }, [status])

    // Load more on scroll to top
    const handleScroll = useCallback(() => {
        if (!containerRef.current || isLoadingMore || !nextCursor) return

        if (containerRef.current.scrollTop < 100) {
            setIsLoadingMore(true)
            fetchMessages(nextCursor).finally(() => setIsLoadingMore(false))
        }
    }, [nextCursor, isLoadingMore, fetchMessages])

    // Send message
    const handleSend = async () => {
        if (!input.trim() || isSending) return

        const question = input.trim()
        setInput('')
        setIsSending(true)

        try {
            const res = await fetch('/api/coach/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            })

            if (res.ok) {
                const data = await res.json()
                setMessages(prev => [...prev, data.userMessage, data.coachMessage])
                // Scroll to bottom
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setIsSending(false)
        }
    }

    // Manual reflection trigger
    const triggerReflection = async () => {
        setIsGeneratingReflection(true)
        try {
            const res = await fetch('/api/coach/reflection', { method: 'POST' })
            const data = await res.json()
            if (data.generated && data.message) {
                setMessages(prev => [...prev, data.message])
            }
        } catch (error) {
            console.error('Failed to generate reflection:', error)
        } finally {
            setIsGeneratingReflection(false)
        }
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
                    <p className="text-surface-500">Loading coach...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-surface-100 px-4 py-3 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/')}
                            className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-surface-600" />
                        </button>
                        <img src={coachAvatar} alt="Coach" className="w-8 h-8 rounded-full" />
                        <h1 className="text-lg font-semibold text-surface-900">Coach</h1>
                    </div>
                    <button
                        onClick={triggerReflection}
                        disabled={isGeneratingReflection}
                        className="text-surface-500 hover:text-surface-700 p-2 rounded-full hover:bg-surface-100 transition-colors disabled:opacity-50"
                        title="Generate today's reflection"
                    >
                        <RefreshCw className={cn("w-5 h-5", isGeneratingReflection && "animate-spin")} />
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4"
            >
                <div className="max-w-2xl mx-auto space-y-4">
                    {/* Load more indicator */}
                    {isLoadingMore && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
                        </div>
                    )}

                    {messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-primary-400" />
                            </div>
                            <h2 className="text-lg font-medium text-surface-900 mb-2">Your Coach</h2>
                            <p className="text-surface-500 max-w-sm mx-auto">
                                Daily reflections appear here after 8pm. Ask questions anytime about your nutrition.
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBlock key={message.id} message={message} />
                        ))
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="bg-white border-t border-surface-100 px-4 py-3 mb-16">
                <div className="max-w-2xl mx-auto flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        onFocus={() => {
                            // Scroll input into view when keyboard opens
                            setTimeout(() => {
                                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }, 300)
                        }}
                        placeholder="Ask about your nutrition..."
                        disabled={isSending}
                        className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-full text-surface-900 placeholder:text-surface-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isSending || !input.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}

function MessageBlock({ message }: { message: CoachMessage }) {
    const isUser = message.role === 'user'
    const isReflection = message.type === 'reflection'
    const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })

    if (isReflection) {
        return (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-100">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-surface-900">Today's Reflection</span>
                    <span className="text-xs text-surface-400">· Automatic</span>
                </div>
                <p className="text-surface-700 leading-relaxed">{message.content}</p>
                <p className="text-xs text-surface-400 mt-3">{timeAgo}</p>
            </div>
        )
    }

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                    <p>{message.content}</p>
                    <p className="text-xs text-primary-200 mt-1 text-right">{timeAgo}</p>
                </div>
            </div>
        )
    }

    // Coach reply
    return (
        <div className="flex justify-start">
            <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm border border-surface-100">
                <p className="text-surface-700">{message.content}</p>
                <p className="text-xs text-surface-400 mt-1">{timeAgo}</p>
            </div>
        </div>
    )
}
