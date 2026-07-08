'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import {
    Search,
    ArrowRight,
    BookOpen,
    Code,
    TrendingUp,
    Microscope,
    Scale,
    Palette,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelSelector } from '@/components/model-selector';
import {
    DEFAULT_MODEL_PROVIDER,
    ModelProvider,
} from '@/lib/models';

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
    const [modelProvider, setModelProvider] = useState<ModelProvider>(DEFAULT_MODEL_PROVIDER);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [mounted, setMounted] = useState(false);
    const searchTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        const el = searchTextareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [searchQuery]);

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
                const timeout = setTimeout(() => {
                    setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_QUERIES.length);
                    setIsTyping(true);
                }, 120);
                return () => clearTimeout(timeout);
            }
        }
    }, [displayedPlaceholder, isTyping, placeholderIndex]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/chat?q=${encodeURIComponent(searchQuery.trim())}&mp=${encodeURIComponent(modelProvider)}`);
        }
    };

    const handleSearchKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (searchQuery.trim()) {
                handleSearch(e);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background overflow-x-clip">
            {/* ============ HERO ============ */}
            <section className="relative min-h-[100svh] flex flex-col">
                {/* Wallpaper with slow Ken Burns drift */}
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
                        style={{ backgroundImage: "url('/wallpaper.png')" }}
                    />
                    {/* Readability + blend overlays */}
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-background via-background/70 to-transparent" />
                </div>

                {/* Glass nav */}
                <header className="relative z-30 mt-5 px-4">
                    <div className={cn(
                        "max-w-5xl mx-auto glass rounded-2xl px-5 h-14 flex items-center justify-between",
                        mounted && "animate-fade-up"
                    )}>
                        <Link href="/landing" className="flex items-center gap-2.5 group">
                            <img src="/atom-logo.png" alt="Atom" className="w-8 h-8 rounded-lg transition-transform duration-300 group-hover:rotate-12" />
                            <span className="text-lg font-bold text-white tracking-tight">Atom</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-7">
                            {['Discover', 'Chat'].map((item) => (
                                <Link
                                    key={item}
                                    href={`/${item.toLowerCase()}`}
                                    className="relative text-sm text-white/70 hover:text-white transition-colors group"
                                >
                                    {item}
                                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-white/70 group-hover:w-full transition-all duration-300" />
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            {isSignedIn ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-white/70 hidden sm:block">
                                        {user?.firstName || user?.username}
                                    </span>
                                    <UserButton afterSignOutUrl="/landing" />
                                </div>
                            ) : (
                                <>
                                    <SignInButton mode="modal">
                                        <button className="text-sm text-white/70 hover:text-white transition-colors">
                                            Log in
                                        </button>
                                    </SignInButton>
                                    <SignUpButton mode="modal">
                                        <button className="text-sm font-medium text-black bg-white hover:bg-white/90 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]">
                                            Sign up
                                        </button>
                                    </SignUpButton>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero content */}
                <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pb-24 pt-10 text-center">
                    <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light mb-8",
                        mounted && "animate-fade-up delay-100"
                    )}>
                        <span className="relative flex w-2 h-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                            <span className="relative inline-flex rounded-full w-2 h-2 bg-brand" />
                        </span>
                        <span className="text-xs font-medium text-white/85 tracking-wide">Real-time AI search</span>
                    </div>

                    <h1 className={cn(
                        "text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6",
                        mounted && "animate-fade-up delay-200"
                    )}>
                        <span className="text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.45)]">Search smarter.</span>
                        <br />
                        <span className="bg-gradient-to-r from-sky-200 via-emerald-200 to-sky-200 bg-clip-text text-transparent animate-gradient-x [filter:drop-shadow(0_4px_24px_rgba(0,0,0,0.4))]">
                            Know more.
                        </span>
                    </h1>

                    <p className={cn(
                        "text-base sm:text-lg md:text-xl text-white/75 max-w-xl mx-auto mb-10 sm:mb-12 leading-relaxed [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]",
                        mounted && "animate-fade-up delay-300"
                    )}>
                        AI-powered answers with real sources. Search the web, get cited
                        responses, and explore any topic in depth.
                    </p>

                    {/* Glass search box */}
                    <div className={cn("w-full max-w-2xl mx-auto mb-8", mounted && "animate-fade-up delay-400")}>
                        <form onSubmit={handleSearch}>
                            <div className={cn(
                                "group glass rounded-2xl overflow-visible text-left transition-all duration-300",
                                "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]",
                                "focus-within:border-white/25 focus-within:shadow-[0_20px_70px_-10px_rgba(0,0,0,0.7)] focus-within:-translate-y-0.5"
                            )}>
                                <div className="flex items-start gap-3 px-4 pt-4 pb-1">
                                    <Search className="mt-2.5 w-5 h-5 text-white/50 group-focus-within:text-brand transition-colors shrink-0" />
                                    <textarea
                                        ref={searchTextareaRef}
                                        rows={1}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        placeholder={displayedPlaceholder + '|'}
                                        className="flex-1 min-h-[44px] max-h-[160px] resize-none overflow-y-auto bg-transparent text-white text-lg leading-6 placeholder:text-white/40 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!searchQuery.trim()}
                                        className={cn(
                                            "mt-1 p-2.5 rounded-xl transition-all duration-200 shrink-0",
                                            searchQuery.trim()
                                                ? "bg-brand text-brand-foreground hover:scale-110 active:scale-95 shadow-lg shadow-brand/30"
                                                : "bg-white/10 text-white/40"
                                        )}
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-0.5 border-t border-white/[0.07]">
                                    <div className="pt-2.5 min-w-0">
                                        <ModelSelector modelProvider={modelProvider} onChange={setModelProvider} />
                                    </div>
                                    <span className="hidden sm:inline text-[11px] text-white/35 pt-2.5 shrink-0">
                                        Enter to search · Shift+Enter for newline
                                    </span>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Use-case chips over the hero */}
                    <div className={cn(
                        "flex flex-wrap items-center justify-center gap-2 max-w-2xl",
                        mounted && "animate-fade-up delay-500"
                    )}>
                        {USE_CASES.map((uc) => (
                            <button
                                key={uc.label}
                                onClick={() => setSearchQuery(uc.query)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-white/70
                                    hover:text-white hover:bg-white/12 hover:-translate-y-0.5
                                    transition-all duration-200"
                            >
                                <uc.icon className="w-3.5 h-3.5" />
                                {uc.label}
                            </button>
                        ))}
                    </div>

                    {/* Scroll cue */}
                    <div className={cn(
                        "absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 animate-float-soft",
                        mounted && "animate-fade-up delay-600"
                    )}>
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </div>
            </section>

            {/* ============ BELOW THE FOLD ============ */}
            <main className="relative z-10">
                <div className="max-w-5xl mx-auto px-6 pt-10 sm:pt-16 pb-10 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                    {isSignedIn && (
                        <Link
                            href="/chat"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
                        >
                            Your conversations
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                    <Link
                        href="/discover"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
                    >
                        Discover trending
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </main>

            {/* ============ FOOTER ============ */}
            <footer className="border-t border-border py-8">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">© 2026 Atom</span>
                    <span className="text-xs text-muted-foreground">Search the world, beautifully</span>
                </div>
            </footer>
        </div>
    );
}
