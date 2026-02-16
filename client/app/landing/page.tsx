'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import {
    Search,
    ArrowRight,
    Globe,
    Zap,
    Shield,
    Sparkles,
    BookOpen,
    Code,
    TrendingUp,
    Microscope,
    Scale,
    Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXAMPLE_QUERIES = [
    'What are the latest breakthroughs in quantum computing?',
    'Explain the economic impact of AI on global markets',
    'How does CRISPR gene editing work?',
    'Compare React, Vue, and Svelte for web development',
    'What caused the 2024 market volatility?',
];

const USE_CASES = [
    { icon: BookOpen, label: 'Research', query: 'Research the latest findings on ' },
    { icon: Code, label: 'Code', query: 'How to implement ' },
    { icon: TrendingUp, label: 'Finance', query: 'Analyze the market trends for ' },
    { icon: Microscope, label: 'Science', query: 'Explain the science behind ' },
    { icon: Scale, label: 'Legal', query: 'What are the legal implications of ' },
    { icon: Palette, label: 'Creative', query: 'Generate ideas for ' },
];

export default function LandingPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [modelProvider, setModelProvider] = useState<'openai' | 'claude' | 'gemini'>('claude');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
    const [isTyping, setIsTyping] = useState(true);

    // Typewriter effect for placeholder
    useEffect(() => {
        const target = EXAMPLE_QUERIES[placeholderIndex];
        if (isTyping) {
            if (displayedPlaceholder.length < target.length) {
                const timeout = setTimeout(() => {
                    setDisplayedPlaceholder(target.slice(0, displayedPlaceholder.length + 1));
                }, 30);
                return () => clearTimeout(timeout);
            } else {
                const timeout = setTimeout(() => setIsTyping(false), 2000);
                return () => clearTimeout(timeout);
            }
        } else {
            if (displayedPlaceholder.length > 0) {
                const timeout = setTimeout(() => {
                    setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1));
                }, 15);
                return () => clearTimeout(timeout);
            } else {
                setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_QUERIES.length);
                setIsTyping(true);
            }
        }
    }, [displayedPlaceholder, isTyping, placeholderIndex]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/chat?q=${encodeURIComponent(searchQuery.trim())}&mp=${encodeURIComponent(modelProvider)}`);
        }
    };

    const handleUseCaseClick = (query: string) => {
        setSearchQuery(query);
    };

    return (
        <div className="min-h-screen bg-[#060606] relative overflow-hidden">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-emerald-500/[0.07] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-emerald-600/[0.05] rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[80px]" />
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* Nav */}
            <header className="relative z-20 border-b border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
                    <Link href="/landing" className="flex items-center gap-2.5">
                        <img src="/atom-logo.png" alt="Atom" className="w-8 h-8 rounded-lg" />
                        <span className="text-lg font-bold text-white tracking-tight">Atom</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        {['Discover', 'Chat'].map((item) => (
                            <Link
                                key={item}
                                href={`/${item.toLowerCase()}`}
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                {item}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        {isSignedIn ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-400 hidden sm:block">
                                    {user?.firstName || user?.username}
                                </span>
                                <UserButton
                                    afterSignOutUrl="/landing"
                                    appearance={{ elements: { avatarBox: 'w-8 h-8 ring-2 ring-emerald-500/30' } }}
                                />
                            </div>
                        ) : (
                            <>
                                <SignInButton mode="modal">
                                    <button className="text-sm text-slate-400 hover:text-white transition-colors">
                                        Log in
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20">
                                        Sign up
                                    </button>
                                </SignUpButton>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10">
                <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            Real-time AI Search
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                        <span className="text-white">Search smarter.</span>
                        <br />
                        <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-300 bg-clip-text text-transparent">
                            Know more.
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        AI-powered answers with real sources. Search the web, get cited responses,
                        and explore any topic in depth.
                    </p>

                    {/* Search box */}
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
                        <div className="relative group">
                            {/* Glow */}
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />

                            <div className="relative bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden focus-within:border-emerald-500/40 transition-all shadow-2xl shadow-black/20">
                                <div className="flex items-center">
                                    <Search className="ml-5 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={displayedPlaceholder + '|'}
                                        className="flex-1 px-4 py-5 bg-transparent text-white text-lg placeholder:text-slate-600 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!searchQuery.trim()}
                                        className={cn(
                                            "mr-3 p-2.5 rounded-xl transition-all flex-shrink-0",
                                            searchQuery.trim()
                                                ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                                                : "bg-white/[0.05] text-slate-600"
                                        )}
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Model selector row */}
                                <div className="flex items-center justify-between px-5 pb-3 pt-0">
                                    <div className="flex items-center gap-1">
                                        {(['claude', 'openai', 'gemini'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setModelProvider(p)}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                                                    modelProvider === p
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                                                )}
                                            >
                                                {p === 'openai' ? 'GPT-4o' : p === 'claude' ? 'Claude' : 'Gemini'}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-slate-600">
                                        Powered by {modelProvider === 'openai' ? 'OpenAI' : modelProvider === 'claude' ? 'Anthropic' : 'Google'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Quick links */}
                    <div className="flex items-center justify-center gap-4 mb-20">
                        {isSignedIn && (
                            <Link
                                href="/chat"
                                className="text-sm text-slate-500 hover:text-emerald-400 transition-colors"
                            >
                                Your conversations →
                            </Link>
                        )}
                        <Link
                            href="/discover"
                            className="text-sm text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                            Discover trending →
                        </Link>
                    </div>
                </div>

                {/* Use case pills */}
                <div className="max-w-4xl mx-auto px-6 mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Try it for</h2>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {USE_CASES.map((uc) => (
                            <button
                                key={uc.label}
                                onClick={() => handleUseCaseClick(uc.query)}
                                className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-emerald-500/20 hover:bg-emerald-500/[0.04] transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                                    <uc.icon className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                                    {uc.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feature cards */}
                <div className="max-w-5xl mx-auto px-6 pb-24">
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            {
                                icon: Globe,
                                title: 'Real-time Search',
                                desc: 'Every answer is backed by live web sources — not stale training data.',
                            },
                            {
                                icon: Sparkles,
                                title: 'Multi-Model AI',
                                desc: 'Switch between GPT-4o, Claude, and Gemini. Pick the best model for your question.',
                            },
                            {
                                icon: Shield,
                                title: 'Verified Answers',
                                desc: 'Built-in hallucination detection validates every response against its sources.',
                            },
                        ].map((feature) => (
                            <div
                                key={feature.title}
                                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-emerald-500/15 transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
                                    <feature.icon className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/[0.04] py-8">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <span className="text-xs text-slate-600">© 2025 Atom</span>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-600">Built with ❤️ and too much caffeine</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
