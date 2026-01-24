'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HeroIllustration } from '@/components/hero-illustration';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';

const categories = [
    'All',
    'Brand Monitoring',
    'Career',
    'Daily Digest',
    'Entertainment',
    'Lifestyle',
    'Local Events',
    'News',
    'Rare Products',
    'Real Estate',
    'Research',
    'Reservations',
];

const previewCards = [
    {
        id: 1,
        title: 'Real Estate',
        description: 'Monitor new apartment listings',
        image: '/preview-realestate.jpg',
        bgColor: 'bg-amber-100',
    },
    {
        id: 2,
        title: 'Career',
        description: 'Track job opportunities',
        image: '/preview-career.jpg',
        bgColor: 'bg-blue-100',
    },
    {
        id: 3,
        title: 'News',
        description: 'Stay updated on topics',
        image: '/preview-news.jpg',
        bgColor: 'bg-slate-100',
    },
];

export default function LandingPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/landing" className="flex items-center">
                            <span className="text-xl font-semibold text-slate-800">Atom</span>
                        </Link>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <Link
                                href="/landing"
                                className="text-sm font-medium text-slate-900 border-b-2 border-slate-800 pb-1"
                            >
                                Scouts
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                API
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Company
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Blog
                            </Link>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-3">
                            <Link
                                href="/sign-in"
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/sign-up"
                                className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition-colors"
                            >
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                {/* Illustration */}
                <HeroIllustration />

                {/* Headline */}
                <h1 className="text-4xl md:text-5xl font-light text-center text-slate-800 mb-10">
                    Scouts monitor the web. <span className="font-normal">For you.</span>
                </h1>

                {/* Search Input */}
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Scout for new apartment listings in..."
                            className="w-full px-5 py-4 pr-14 text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
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
                    <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-full px-4 py-2 hover:border-slate-300 transition-all"
                    >
                        Not sure what to Scout? Sign up for suggestions
                    </Link>
                </div>

                {/* Category Pills */}
                <div className="relative mb-12">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full border transition-all ${activeCategory === category
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}

                        <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {previewCards.map((card) => (
                        <div
                            key={card.id}
                            className={`${card.bgColor} rounded-2xl p-6 h-48 flex flex-col justify-end hover:scale-[1.02] transition-transform cursor-pointer`}
                        >
                            <h3 className="text-lg font-semibold text-slate-800 mb-1">
                                {card.title}
                            </h3>
                            <p className="text-sm text-slate-600">{card.description}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer spacing */}
            <div className="h-16" />
        </div>
    );
}
