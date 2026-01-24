'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import { HeroIllustration } from '@/components/hero-illustration';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';

const categories = [
    'All',
    'Research',
    'Coding',
    'Science',
    'Technology',
    'Academic',
    'Business',
    'Health',
    'Finance',
    'Legal',
    'Creative',
    'General',
];

interface CardData {
    id: number;
    title: string;
    description: string;
    category: string;
    bgColor: string;
}

const allCards: CardData[] = [
    // Research
    { id: 1, title: 'Deep Research', description: 'Get comprehensive answers with cited sources', category: 'Research', bgColor: 'bg-emerald-50' },
    { id: 2, title: 'Literature Review', description: 'Analyze academic papers and journals', category: 'Research', bgColor: 'bg-teal-50' },
    { id: 3, title: 'Data Analysis', description: 'Extract insights from complex datasets', category: 'Research', bgColor: 'bg-cyan-50' },

    // Coding
    { id: 4, title: 'Code Assistant', description: 'Debug, explain, and write code instantly', category: 'Coding', bgColor: 'bg-blue-50' },
    { id: 5, title: 'Code Review', description: 'Get feedback on your code quality', category: 'Coding', bgColor: 'bg-indigo-50' },
    { id: 6, title: 'API Explorer', description: 'Understand and integrate APIs quickly', category: 'Coding', bgColor: 'bg-violet-50' },

    // Science
    { id: 7, title: 'Scientific Discovery', description: 'Explore latest research breakthroughs', category: 'Science', bgColor: 'bg-purple-50' },
    { id: 8, title: 'Lab Companion', description: 'Get help with experiments and methods', category: 'Science', bgColor: 'bg-fuchsia-50' },
    { id: 9, title: 'Formula Helper', description: 'Solve complex equations step by step', category: 'Science', bgColor: 'bg-pink-50' },

    // Technology
    { id: 10, title: 'Tech Trends', description: 'Stay updated on emerging technologies', category: 'Technology', bgColor: 'bg-sky-50' },
    { id: 11, title: 'Product Reviews', description: 'Compare gadgets and software', category: 'Technology', bgColor: 'bg-cyan-50' },
    { id: 12, title: 'Setup Guides', description: 'Step-by-step technical tutorials', category: 'Technology', bgColor: 'bg-teal-50' },

    // Academic
    { id: 13, title: 'Essay Writer', description: 'Structure and draft academic essays', category: 'Academic', bgColor: 'bg-amber-50' },
    { id: 14, title: 'Citation Helper', description: 'Format references in any style', category: 'Academic', bgColor: 'bg-yellow-50' },
    { id: 15, title: 'Study Notes', description: 'Summarize chapters and lectures', category: 'Academic', bgColor: 'bg-orange-50' },

    // Business
    { id: 16, title: 'Market Research', description: 'Analyze competitors and trends', category: 'Business', bgColor: 'bg-rose-50' },
    { id: 17, title: 'Business Strategy', description: 'Get insights for decision making', category: 'Business', bgColor: 'bg-pink-50' },
    { id: 18, title: 'Pitch Deck', description: 'Create compelling presentations', category: 'Business', bgColor: 'bg-red-50' },

    // Health
    { id: 19, title: 'Health Info', description: 'Understand medical conditions', category: 'Health', bgColor: 'bg-green-50' },
    { id: 20, title: 'Nutrition Guide', description: 'Get diet and wellness advice', category: 'Health', bgColor: 'bg-emerald-50' },
    { id: 21, title: 'Fitness Plans', description: 'Personalized workout suggestions', category: 'Health', bgColor: 'bg-lime-50' },

    // Finance
    { id: 22, title: 'Investment Analysis', description: 'Research stocks and markets', category: 'Finance', bgColor: 'bg-orange-50' },
    { id: 23, title: 'Tax Helper', description: 'Navigate tax rules and filing', category: 'Finance', bgColor: 'bg-amber-50' },
    { id: 24, title: 'Budget Planner', description: 'Manage personal finances wisely', category: 'Finance', bgColor: 'bg-yellow-50' },

    // Legal
    { id: 25, title: 'Legal Research', description: 'Find relevant cases and statutes', category: 'Legal', bgColor: 'bg-slate-100' },
    { id: 26, title: 'Contract Review', description: 'Understand complex agreements', category: 'Legal', bgColor: 'bg-gray-100' },
    { id: 27, title: 'Rights Guide', description: 'Know your legal rights', category: 'Legal', bgColor: 'bg-zinc-100' },

    // Creative
    { id: 28, title: 'Story Writer', description: 'Generate creative narratives', category: 'Creative', bgColor: 'bg-fuchsia-50' },
    { id: 29, title: 'Design Ideas', description: 'Get inspiration for projects', category: 'Creative', bgColor: 'bg-purple-50' },
    { id: 30, title: 'Content Creator', description: 'Write engaging social posts', category: 'Creative', bgColor: 'bg-violet-50' },

    // General
    { id: 31, title: 'Real-time Answers', description: 'Up-to-date information from the web', category: 'General', bgColor: 'bg-slate-50' },
    { id: 32, title: 'Daily Digest', description: 'Curated news and updates', category: 'General', bgColor: 'bg-gray-50' },
    { id: 33, title: 'Quick Facts', description: 'Instant answers to any question', category: 'General', bgColor: 'bg-stone-50' },
];

export default function LandingPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredCards = useMemo(() => {
        if (activeCategory === 'All') {
            const categoryOrder = categories.filter(c => c !== 'All');
            const topCards: CardData[] = [];

            for (const cat of categoryOrder) {
                const card = allCards.find(c => c.category === cat);
                if (card && topCards.length < 3) {
                    topCards.push(card);
                }
            }
            return topCards;
        }

        return allCards.filter(card => card.category === activeCategory);
    }, [activeCategory]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/landing" className="flex items-center gap-2">
                            <img src="/atom-logo.png" alt="Atom" className="w-8 h-8 rounded-lg" />
                            <span className="text-xl font-semibold text-gray-900">Atom</span>
                        </Link>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <Link
                                href="/landing"
                                className="text-sm font-medium text-gray-900 border-b-2 border-gray-900 pb-0.5"
                            >
                                Search
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                API
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Company
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Blog
                            </Link>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-3">
                            {isSignedIn ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 hidden sm:block">
                                        {user?.firstName || user?.username || 'User'}
                                    </span>
                                    <UserButton
                                        afterSignOutUrl="/landing"
                                        appearance={{
                                            elements: {
                                                avatarBox: "w-8 h-8"
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <SignInButton mode="modal">
                                        <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                            Log in
                                        </button>
                                    </SignInButton>
                                    <SignUpButton mode="modal">
                                        <button className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition-colors">
                                            Sign up
                                        </button>
                                    </SignUpButton>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                {/* Illustration */}
                <HeroIllustration />

                {/* Headline */}
                <h1 className="text-4xl md:text-5xl font-light text-center text-gray-800 mb-10">
                    AI-powered search. <span className="font-normal">With sources.</span>
                </h1>

                {/* Search Input */}
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ask anything..."
                            className="w-full px-5 py-4 pr-14 text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>
                </form>

                {/* Secondary CTA */}
                <div className="text-center mb-16">
                    {isSignedIn ? (
                        <Link
                            href="/chat"
                            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full px-4 py-2 hover:border-gray-300 transition-all"
                        >
                            Go to your conversations →
                        </Link>
                    ) : (
                        <SignUpButton mode="modal">
                            <button className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full px-4 py-2 hover:border-gray-300 transition-all">
                                New to Atom? Sign up for suggestions
                            </button>
                        </SignUpButton>
                    )}
                </div>

                {/* Category Pills */}
                <div className="relative mb-12">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full border transition-all ${activeCategory === category
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}

                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredCards.map((card) => (
                        <div
                            key={card.id}
                            className={`${card.bgColor} rounded-2xl p-6 h-48 flex flex-col justify-end hover:shadow-lg transition-shadow cursor-pointer`}
                        >
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                {card.title}
                            </h3>
                            <p className="text-sm text-gray-600">{card.description}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer spacing */}
            <div className="h-16" />
        </div>
    );
}
