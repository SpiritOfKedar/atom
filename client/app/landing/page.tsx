'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import {
    Search,
    ArrowRight,
    Globe,
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

// Floating particles component
function Particles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
                <div
                    key={i}
                    className="absolute w-[2px] h-[2px] rounded-full bg-emerald-400/40"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 10}s`,
                        opacity: 0.2 + Math.random() * 0.5,
                    }}
                />
            ))}
        </div>
    );
}

// Orbital rings around the hero
function OrbitalRings() {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {[280, 380, 500].map((size, i) => (
                <div
                    key={size}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/[0.06]"
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        animation: `spin-slow ${30 + i * 15}s linear infinite${i % 2 ? ' reverse' : ''}`,
                    }}
                >
                    <div
                        className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/60 shadow-lg shadow-emerald-400/30"
                        style={{ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    />
                </div>
            ))}
        </div>
    );
}

export default function LandingPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [modelProvider, setModelProvider] = useState<'openai' | 'claude' | 'gemini'>('claude');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Typewriter effect
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

    return (
        <div className="min-h-screen bg-[#040404] relative overflow-hidden">
            {/* === CSS Animations === */}
            <style jsx global>{`
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-20px) translateX(10px); }
                    50% { transform: translateY(-10px) translateX(-10px); }
                    75% { transform: translateY(-30px) translateX(5px); }
                }
                @keyframes spin-slow {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes aurora {
                    0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
                    33% { transform: rotate(120deg) scale(1.1); opacity: 0.5; }
                    66% { transform: rotate(240deg) scale(0.9); opacity: 0.3; }
                    100% { transform: rotate(360deg) scale(1); opacity: 0.3; }
                }
                @keyframes border-rotate {
                    from { --angle: 0deg; }
                    to { --angle: 360deg; }
                }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.05); opacity: 0.2; }
                    100% { transform: scale(1); opacity: 0.4; }
                }
                .animate-fade-up {
                    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
                .delay-400 { animation-delay: 0.4s; }
                .delay-500 { animation-delay: 0.5s; }
                .delay-600 { animation-delay: 0.6s; }
                .delay-700 { animation-delay: 0.7s; }
            `}</style>

            {/* === Aurora Background === */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-[-40%] left-[-10%] w-[800px] h-[800px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
                        animation: 'aurora 20s ease-in-out infinite',
                    }}
                />
                <div
                    className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)',
                        animation: 'aurora 25s ease-in-out infinite reverse',
                    }}
                />
                <div
                    className="absolute bottom-[-30%] left-[20%] w-[700px] h-[700px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)',
                        animation: 'aurora 30s ease-in-out infinite',
                        animationDelay: '5s',
                    }}
                />
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.015]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '128px 128px',
                }} />
                <Particles />
            </div>

            {/* === Nav === */}
            <header className="relative z-30 border-b border-white/[0.04] backdrop-blur-md bg-black/20">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
                    <Link href="/landing" className="flex items-center gap-2.5 group">
                        <img src="/atom-logo.png" alt="Atom" className="w-8 h-8 rounded-lg transition-transform group-hover:scale-110" />
                        <span className="text-lg font-bold text-white tracking-tight">Atom</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        {['Discover', 'Chat'].map((item) => (
                            <Link
                                key={item}
                                href={`/${item.toLowerCase()}`}
                                className="text-sm text-slate-400 hover:text-white transition-colors relative group"
                            >
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
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
                                    <button className="relative text-sm font-medium text-white px-4 py-2 rounded-lg overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 transition-all group-hover:from-emerald-500 group-hover:to-green-500" />
                                        <span className="relative">Sign up</span>
                                    </button>
                                </SignUpButton>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* === Hero === */}
            <main className="relative z-10">
                <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 text-center relative">
                    <OrbitalRings />

                    {/* Badge */}
                    <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-10",
                        mounted && "animate-fade-up"
                    )}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            Real-time AI Search
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className={cn("text-6xl md:text-8xl font-bold tracking-tighter mb-8", mounted && "animate-fade-up delay-100")}>
                        <span className="text-white block">Search smarter.</span>
                        <span
                            className="block mt-2 bg-clip-text text-transparent"
                            style={{
                                backgroundImage: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 25%, #a7f3d0 50%, #6ee7b7 75%, #34d399 100%)',
                                backgroundSize: '200% auto',
                                animation: 'shimmer 4s linear infinite',
                            }}
                        >
                            Know more.
                        </span>
                    </h1>

                    <p className={cn(
                        "text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-14 leading-relaxed",
                        mounted && "animate-fade-up delay-200"
                    )}>
                        AI-powered answers with real sources. Search the web, get cited responses,
                        and explore any topic in depth.
                    </p>

                    {/* === Search box with animated border === */}
                    <div className={cn("max-w-2xl mx-auto mb-8", mounted && "animate-fade-up delay-300")}>
                        <form onSubmit={handleSearch}>
                            <div className="relative group">
                                {/* Animated glow ring */}
                                <div
                                    className="absolute -inset-[1px] rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"
                                    style={{
                                        background: 'conic-gradient(from var(--angle, 0deg), transparent 0%, #10b981 10%, transparent 20%, #34d399 30%, transparent 40%)',
                                        animation: 'border-rotate 4s linear infinite',
                                        filter: 'blur(2px)',
                                    }}
                                />
                                {/* Outer glow */}
                                <div className="absolute -inset-4 rounded-3xl bg-emerald-500/[0.04] opacity-0 group-focus-within:opacity-100 blur-2xl transition-opacity duration-700" />

                                <div className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl overflow-hidden focus-within:border-emerald-500/20 transition-all">
                                    <div className="flex items-center">
                                        <Search className="ml-5 w-5 h-5 text-slate-600 group-focus-within:text-emerald-400 transition-colors shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={displayedPlaceholder + '|'}
                                            className="flex-1 px-4 py-5 bg-transparent text-white text-lg placeholder:text-slate-700 focus:outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!searchQuery.trim()}
                                            className={cn(
                                                "mr-3 p-2.5 rounded-xl transition-all shrink-0",
                                                searchQuery.trim()
                                                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 hover:scale-105"
                                                    : "bg-white/[0.04] text-slate-700"
                                            )}
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Model selector */}
                                    <div className="flex items-center justify-between px-5 pb-3.5 pt-0.5">
                                        <div className="flex items-center gap-1">
                                            {(['claude', 'openai', 'gemini'] as const).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setModelProvider(p)}
                                                    className={cn(
                                                        "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                                                        modelProvider === p
                                                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10"
                                                            : "text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]"
                                                    )}
                                                >
                                                    {p === 'openai' ? 'GPT-4o' : p === 'claude' ? 'Claude' : 'Gemini'}
                                                </button>
                                            ))}
                                        </div>
                                        <span className="text-[11px] text-slate-700">
                                            Powered by {modelProvider === 'openai' ? 'OpenAI' : modelProvider === 'claude' ? 'Anthropic' : 'Google'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Quick links */}
                    <div className={cn(
                        "flex items-center justify-center gap-6 mb-24",
                        mounted && "animate-fade-up delay-400"
                    )}>
                        {isSignedIn && (
                            <Link
                                href="/chat"
                                className="text-sm text-slate-500 hover:text-emerald-400 transition-colors group flex items-center gap-1"
                            >
                                Your conversations
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        )}
                        <Link
                            href="/discover"
                            className="text-sm text-slate-500 hover:text-emerald-400 transition-colors group flex items-center gap-1"
                        >
                            Discover trending
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* === Use cases === */}
                <div className={cn("max-w-4xl mx-auto px-6 mb-20", mounted && "animate-fade-up delay-500")}>
                    <div className="flex items-center gap-3 mb-8">
                        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-[0.2em]">Try it for</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {USE_CASES.map((uc) => (
                            <button
                                key={uc.label}
                                onClick={() => setSearchQuery(uc.query)}
                                className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.015] border border-white/[0.04] hover:border-emerald-500/20 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-10 h-10 rounded-xl bg-white/[0.03] group-hover:bg-emerald-500/10 flex items-center justify-center transition-all duration-300">
                                    <uc.icon className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors duration-300" />
                                </div>
                                <span className="relative text-xs font-medium text-slate-500 group-hover:text-white transition-colors duration-300">
                                    {uc.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* === Feature cards === */}
                <div className={cn("max-w-5xl mx-auto px-6 pb-28", mounted && "animate-fade-up delay-600")}>
                    <div className="grid md:grid-cols-3 gap-5">
                        {[
                            {
                                icon: Globe,
                                title: 'Real-time Search',
                                desc: 'Every answer is backed by live web sources — not stale training data.',
                                gradient: 'from-emerald-500/20 to-teal-500/20',
                            },
                            {
                                icon: Sparkles,
                                title: 'Multi-Model AI',
                                desc: 'Switch between GPT-4o, Claude, and Gemini. Pick the best model for your question.',
                                gradient: 'from-green-500/20 to-emerald-500/20',
                            },
                            {
                                icon: Shield,
                                title: 'Verified Answers',
                                desc: 'Built-in hallucination detection validates every response against its sources.',
                                gradient: 'from-teal-500/20 to-cyan-500/20',
                            },
                        ].map((feature) => (
                            <div
                                key={feature.title}
                                className="group relative p-7 rounded-2xl bg-white/[0.015] border border-white/[0.04] hover:border-emerald-500/15 transition-all duration-500 hover:-translate-y-1"
                            >
                                {/* Hover gradient backdrop */}
                                <div className={cn(
                                    "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                    feature.gradient
                                )} />
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 group-hover:shadow-lg group-hover:shadow-emerald-500/10 transition-all duration-500">
                                        <feature.icon className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-white font-semibold mb-2.5 text-[15px]">{feature.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* === Footer === */}
            <footer className="relative z-10 border-t border-white/[0.03] py-8">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <span className="text-xs text-slate-700">© 2025 Atom</span>
                    <span className="text-xs text-slate-700">Built with ❤️ and too much caffeine</span>
                </div>
            </footer>
        </div>
    );
}
