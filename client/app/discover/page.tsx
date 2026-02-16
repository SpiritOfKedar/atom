'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiscoverHero } from "@/components/discover-hero";
import { DiscoverCard } from "@/components/discover-card";
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Flame,
    Zap,
    Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOPICS = ['Tech & Science', 'Finance', 'Arts & Culture', 'Sports', 'World', 'Politics', 'Health'];

const TOPIC_ICONS: Record<string, React.ReactNode> = {
    'Tech & Science': <Zap className="w-3.5 h-3.5" />,
    'Finance': <span className="text-xs">💹</span>,
    'Arts & Culture': <span className="text-xs">🎭</span>,
    'Sports': <span className="text-xs">⚽</span>,
    'World': <Globe className="w-3.5 h-3.5" />,
    'Politics': <span className="text-xs">🏛️</span>,
    'Health': <span className="text-xs">🧬</span>,
};

interface DiscoverItem {
    title: string;
    description?: string;
    imageUrl: string | null;
    source: string;
    sourceIcon: string;
    timeAgo: string;
    link: string;
    category: string;
}

export default function DiscoverPage() {
    const router = useRouter();
    const tabs = ['For You', 'Top', 'Topics'];
    const [activeTab, setActiveTab] = useState('For You');
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [hero, setHero] = useState<DiscoverItem | null>(null);
    const [items, setItems] = useState<DiscoverItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = useCallback(async (tab: string, topic?: string | null) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (topic) {
                params.set('topic', topic);
            } else {
                params.set('tab', tab === 'For You' ? 'Top' : tab);
            }
            const res = await fetch(`/api/discover?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setHero(json.hero || null);
            setItems(json.items || []);
        } catch (err) {
            console.error('Failed to fetch discover data:', err);
            setError('Failed to load news. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNews(activeTab, activeTopic);
    }, [activeTab, activeTopic, fetchNews]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (tab !== 'Topics') setActiveTopic(null);
    };

    const handleTopicClick = (topic: string) => {
        setActiveTopic(topic === activeTopic ? null : topic);
    };

    const handleStoryClick = (item: DiscoverItem) => {
        router.push(`/chat?q=${encodeURIComponent(item.title)}`);
    };

    // Split items into layout sections
    const featuredItems = items.slice(0, 2);   // 2 featured cards in a row
    const gridItems = items.slice(2, 5);       // 3-col grid
    const listItems = items.slice(5);          // Compact list

    return (
        <div className="flex-1 overflow-y-auto bg-[#080808]">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#080808]/90 backdrop-blur-xl border-b border-white/[0.04] px-6 pt-5 pb-0">
                <div className="max-w-[1200px] mx-auto flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-white tracking-tight">Discover</h1>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Flame className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchNews(activeTab, activeTopic)}
                        disabled={loading}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm transition-all",
                            "bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white",
                            "border border-white/[0.06] disabled:opacity-40"
                        )}
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        <span className="text-xs font-medium">Refresh</span>
                    </button>
                </div>

                <div className="max-w-[1200px] mx-auto flex items-center gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={cn(
                                "px-4 py-2.5 text-sm font-medium transition-all relative",
                                activeTab === tab
                                    ? "text-white"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Topics bar */}
            {activeTab === 'Topics' && (
                <div className="border-b border-white/[0.04] bg-white/[0.01]">
                    <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-wrap gap-2">
                        {TOPICS.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => handleTopicClick(topic)}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    activeTopic === topic
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                        : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                                )}
                            >
                                {TOPIC_ICONS[topic]}
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="max-w-[1200px] mx-auto px-6 py-8">
                {loading ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="h-[420px] rounded-2xl bg-white/[0.03] animate-pulse" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-[320px] rounded-xl bg-white/[0.03] animate-pulse" />
                            <div className="h-[320px] rounded-xl bg-white/[0.03] animate-pulse" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                            <span className="text-2xl">😕</span>
                        </div>
                        <p className="text-slate-400 text-sm">{error}</p>
                        <button
                            onClick={() => fetchNews(activeTab, activeTopic)}
                            className="px-5 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Hero story */}
                        {hero && (
                            <DiscoverHero
                                title={hero.title}
                                description={hero.description || ''}
                                imageUrl={hero.imageUrl || ''}
                                source={hero.source}
                                sourceIcon={hero.sourceIcon}
                                timeAgo={hero.timeAgo}
                                onClick={() => handleStoryClick(hero)}
                            />
                        )}

                        {/* Featured row — 2 big cards */}
                        {featuredItems.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {featuredItems.map((item, index) => (
                                    <DiscoverCard
                                        key={`feat-${index}`}
                                        title={item.title}
                                        imageUrl={item.imageUrl}
                                        source={item.source}
                                        sourceIcon={item.sourceIcon}
                                        timeAgo={item.timeAgo}
                                        variant="featured"
                                        onClick={() => handleStoryClick(item)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Section label */}
                        {gridItems.length > 0 && (
                            <>
                                <div className="flex items-center gap-3 pt-4">
                                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">More Stories</h2>
                                    <div className="flex-1 h-px bg-white/[0.04]" />
                                </div>

                                {/* 3-col grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {gridItems.map((item, index) => (
                                        <DiscoverCard
                                            key={`grid-${index}`}
                                            title={item.title}
                                            imageUrl={item.imageUrl}
                                            description={item.description}
                                            source={item.source}
                                            sourceIcon={item.sourceIcon}
                                            timeAgo={item.timeAgo}
                                            onClick={() => handleStoryClick(item)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Compact list for remaining items */}
                        {listItems.length > 0 && (
                            <>
                                <div className="flex items-center gap-3 pt-4">
                                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Also Trending</h2>
                                    <div className="flex-1 h-px bg-white/[0.04]" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {listItems.map((item, index) => (
                                        <DiscoverCard
                                            key={`list-${index}`}
                                            title={item.title}
                                            imageUrl={item.imageUrl}
                                            source={item.source}
                                            sourceIcon={item.sourceIcon}
                                            timeAgo={item.timeAgo}
                                            variant="compact"
                                            onClick={() => handleStoryClick(item)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {items.length === 0 && !hero && (
                            <p className="text-center text-slate-500 py-20">No stories found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
