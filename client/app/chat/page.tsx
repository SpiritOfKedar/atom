'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { SourceCarousel } from '@/components/source-carousel';
import { ChatInterface } from '@/components/chat-interface';
import { Sidebar } from '@/components/sidebar';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCw, Copy, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchConversation, Message } from '@/lib/conversations';
import { getApiUrl } from '@/lib/api';
import {
    ModelProvider,
    DEFAULT_MODEL_PROVIDER,
    isModelProvider,
} from '@/lib/models';

interface Source {
    title: string;
    link: string;
    favicon: string;
}

const GUEST_MESSAGE_LIMIT = 2;

export default function ChatPage() {
    const { isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const initialModelProviderParam = searchParams.get('mp');
    const initialModelProvider: ModelProvider =
        initialModelProviderParam && isModelProvider(initialModelProviderParam)
            ? initialModelProviderParam
            : DEFAULT_MODEL_PROVIDER;

    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [guestMessageCount, setGuestMessageCount] = useState(0);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [modelProvider, setModelProvider] = useState<ModelProvider>(initialModelProvider);

    const bottomRef = useRef<HTMLDivElement>(null);
    const initialQueryProcessedRef = useRef(false);

    // Process initial query from URL - using ref to prevent double execution
    useEffect(() => {
        if (initialQuery && !initialQueryProcessedRef.current) {
            initialQueryProcessedRef.current = true;
            processQuery(initialQuery);
        }
    }, [initialQuery]);

    const processQuery = async (userQuery: string) => {
        // Check guest message limit
        if (!isSignedIn && guestMessageCount >= GUEST_MESSAGE_LIMIT) {
            setShowAuthModal(true);
            return;
        }

        setHasSearched(true);
        setIsLoading(true);

        // Increment guest message count
        if (!isSignedIn) {
            setGuestMessageCount(prev => prev + 1);
        }

        // Add user message to history
        const newUserMessage: Message = {
            role: 'user',
            content: userQuery,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, newUserMessage]);

        let currentAssistantContent = '';
        let currentSources: Source[] = [];

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            if (isSignedIn) {
                const token = await getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            const response = await fetch(`${getApiUrl()}/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: userQuery, conversationId, modelProvider }),
            });

            if (response.status === 401) {
                setShowAuthModal(true);
                throw new Error('Authentication required');
            }
            if (response.status === 429) {
                setShowAuthModal(true);
                const errBody = await response.json().catch(() => ({}));
                throw new Error((errBody as { error?: string }).error || 'Guest search limit reached');
            }
            if (!response.ok) throw new Error('Network response was not ok');
            if (!response.body) throw new Error('No body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const parsed = JSON.parse(line);

                        if (parsed.type === 'sources') {
                            currentSources = parsed.data;
                            setMessages(prev => {
                                const last = prev[prev.length - 1];
                                if (last && last.role === 'assistant') {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...last, sources: parsed.data }
                                    ];
                                } else {
                                    return [
                                        ...prev,
                                        {
                                            role: 'assistant',
                                            content: '',
                                            sources: parsed.data,
                                            createdAt: new Date().toISOString()
                                        }
                                    ];
                                }
                            });
                        } else if (parsed.type === 'token') {
                            currentAssistantContent += parsed.data;
                            setMessages(prev => {
                                const last = prev[prev.length - 1];
                                if (last && last.role === 'assistant') {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...last, content: currentAssistantContent }
                                    ];
                                } else {
                                    return [
                                        ...prev,
                                        {
                                            role: 'assistant',
                                            content: currentAssistantContent,
                                            sources: currentSources,
                                            createdAt: new Date().toISOString()
                                        }
                                    ];
                                }
                            });
                        } else if (parsed.type === 'conversationId') {
                            setConversationId(parsed.data);
                        } else if (parsed.type === 'error') {
                            console.error("Backend error:", parsed.data);
                            const errorContent = `Error: ${parsed.data}`;
                            currentAssistantContent = errorContent;
                            setMessages(prev => {
                                const last = prev[prev.length - 1];
                                if (last && last.role === 'assistant') {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...last, content: errorContent }
                                    ];
                                } else {
                                    return [
                                        ...prev,
                                        { role: 'assistant', content: errorContent, createdAt: new Date().toISOString() }
                                    ];
                                }
                            });
                            setIsLoading(false);
                        }
                    } catch (err) {
                        console.error('Error parsing JSON line:', err);
                    }
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            const errorContent = "Sorry, I encountered an error while searching.";
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant') {
                    return [
                        ...prev.slice(0, -1),
                        { ...last, content: errorContent }
                    ];
                } else {
                    return [
                        ...prev,
                        { role: 'assistant', content: errorContent, createdAt: new Date().toISOString() }
                    ];
                }
            });
        } finally {
            setIsLoading(false);

            // Show auth modal after response if limit reached
            if (!isSignedIn && guestMessageCount + 1 >= GUEST_MESSAGE_LIMIT) {
                setTimeout(() => setShowAuthModal(true), 1000);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        // Check guest message limit before submitting
        if (!isSignedIn && guestMessageCount >= GUEST_MESSAGE_LIMIT) {
            setShowAuthModal(true);
            return;
        }

        const userQuery = query.trim();
        setQuery('');
        await processQuery(userQuery);
    };

    const handleCopy = async (content: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSelectConversation = async (id: string) => {
        if (!isSignedIn) return;

        try {
            const token = await getToken();
            if (!token) return;

            const convo = await fetchConversation(token, id);
            setConversationId(id);
            setMessages(convo.messages);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const handleNewConversation = () => {
        setConversationId(null);
        setQuery('');
        setMessages([]);
        setHasSearched(false);
    };

    useEffect(() => {
        if (isLoading || messages.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    return (
        <div className="min-h-screen relative">
            {/* Wallpaper backdrop */}
            <div
                className="fixed inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/wallpaper.png')" }}
            />
            <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px]" />
            <div className="fixed inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/60 to-transparent" />

            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                activeConversationId={conversationId}
            />

            <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
                <DialogContent className="bg-black/60 backdrop-blur-2xl border-white/10">
                    <DialogHeader>
                        <div className="w-14 h-14 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-brand" />
                        </div>
                        <DialogTitle className="text-white">Continue with Atom</DialogTitle>
                        <DialogDescription className="text-white/60">
                            You&apos;ve used your {GUEST_MESSAGE_LIMIT} free searches. Sign in or create an account to continue exploring.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <SignInButton mode="modal">
                            <Button className="w-full h-11 bg-brand text-brand-foreground hover:bg-brand/90">
                                Sign in
                            </Button>
                        </SignInButton>

                        <SignUpButton mode="modal">
                            <Button variant="secondary" className="w-full h-11 bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10">
                                Create an account
                            </Button>
                        </SignUpButton>
                    </DialogFooter>

                    <p className="text-center text-muted-foreground text-xs mt-4">
                        Free accounts get unlimited searches
                    </p>
                </DialogContent>
            </Dialog>

            <div className={cn(
                "transition-all duration-300",
                sidebarOpen ? "ml-64" : "ml-16"
            )}>
                <main className="relative z-10 flex flex-col min-h-screen font-sans text-foreground max-w-4xl mx-auto px-4 md:px-8">
                    <div className="flex-1 py-8">
                        {!hasSearched && (
                            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                                <ChatInterface
                                    query={query}
                                    setQuery={setQuery}
                                    onSubmit={handleSubmit}
                                    isLoading={isLoading}
                                    hasSearched={false}
                                    modelProvider={modelProvider}
                                    setModelProvider={setModelProvider}
                                />
                                {!isSignedIn && (
                                    <p className="text-white/60 text-sm mt-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                                        {GUEST_MESSAGE_LIMIT - guestMessageCount} free searches remaining
                                    </p>
                                )}
                            </div>
                        )}

                        {hasSearched && (
                            <>
                                <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {messages.map((message, idx) => (
                                        <div key={idx} className="space-y-6">
                                            {message.role === 'user' ? (
                                                <div className="flex flex-col gap-2">
                                                    <h2 className="text-2xl font-bold tracking-tight text-white px-3 border-l-4 border-brand [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
                                                        {message.content}
                                                    </h2>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {message.sources && message.sources.length > 0 && (
                                                        <SourceCarousel sources={message.sources} />
                                                    )}

                                                    <div className="relative">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                                                                <div className="h-5 w-5 flex items-center justify-center">
                                                                    {isLoading && idx === messages.length - 1 ? (
                                                                        <RefreshCw className="h-4 w-4 animate-spin text-brand" />
                                                                    ) : (
                                                                        <div className="h-2 w-2 bg-brand rounded-full" />
                                                                    )}
                                                                </div>
                                                                <span>Answer</span>
                                                            </div>

                                                            {message.content && !(isLoading && idx === messages.length - 1) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleCopy(message.content)}
                                                                    className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                                                                >
                                                                    {copied ? (
                                                                        <Check className="h-4 w-4 text-brand" />
                                                                    ) : (
                                                                        <Copy className="h-4 w-4" />
                                                                    )}
                                                                    <span className="ml-1 text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {message.content ? (
                                                            <div className="relative p-6 rounded-2xl glass">
                                                                <div className="prose prose-invert max-w-none text-base leading-relaxed break-words text-white/90">
                                                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4 p-6 rounded-2xl glass">
                                                                <Skeleton className="h-4 w-full bg-white/10" />
                                                                <Skeleton className="h-4 w-[90%] bg-white/10" />
                                                                <Skeleton className="h-4 w-[80%] bg-white/10" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {idx < messages.length - 1 && <Separator className="bg-white/[0.08]" />}
                                        </div>
                                    ))}
                                    <div ref={bottomRef} className="h-4" />
                                </div>

                                <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
                                    <div className={cn(
                                        "mx-auto w-full transition-all duration-300 px-4 pb-8 pt-12 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-auto",
                                        sidebarOpen ? "pl-[272px] pr-8" : "pl-20 pr-8"
                                    )}>
                                        <div className="max-w-3xl mx-auto">
                                            <ChatInterface
                                                query={query}
                                                setQuery={setQuery}
                                                onSubmit={handleSubmit}
                                                isLoading={isLoading}
                                                hasSearched={true}
                                                modelProvider={modelProvider}
                                                setModelProvider={setModelProvider}
                                            />
                                            {!isSignedIn && guestMessageCount > 0 && (
                                                <p className="text-center text-white/60 text-sm mt-2">
                                                    {Math.max(0, GUEST_MESSAGE_LIMIT - guestMessageCount)} free searches remaining
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
