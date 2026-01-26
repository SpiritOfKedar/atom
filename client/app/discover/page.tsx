'use client';

import React from 'react';
import { DiscoverHero } from "@/components/discover-hero";
import { DiscoverCard } from "@/components/discover-card";
import {
    CloudSun,
    Settings,
    Share2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
    const tabs = ["For You", "Top", "Topics"];
    const [activeTab, setActiveTab] = React.useState("For You");
    const [data, setData] = React.useState<{ hero: any, items: any[] } | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/discover');
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error("Failed to fetch discover data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const marketData = [
        { name: "S&P 500", value: "6,945.75", change: "+0.01%", up: true },
        { name: "NASDAQ", value: "25,738.25", change: "+0.31%", up: true },
        { name: "Bitcoin", value: "88,645.14", change: "-0.84%", up: false },
        { name: "VIX", value: "16.09", change: "+2.88%", up: true },
    ];

    if (loading) {
        return (
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    const { hero: heroItem, items: discoverItems } = data;

    return (
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-6 pt-6 pb-2">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between mb-4">
                    <h1 className="text-xl font-medium text-white">Discover</h1>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-400 hover:text-white text-sm transition-colors">
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </button>
                </div>

                <div className="max-w-[1600px] mx-auto flex items-center gap-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "pb-2 text-sm font-medium transition-colors relative",
                                activeTab === tab
                                    ? "text-white"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-6 flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 max-w-4xl">
                    <div className="mb-8">
                        <DiscoverHero {...heroItem} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {discoverItems.map((item, index) => (
                            <DiscoverCard
                                key={index}
                                {...item}
                                sourceIcon={
                                    <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-white font-bold">
                                        N
                                    </div>
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-6">
                    {/* Make it yours - Customization Card */}
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-slate-200">Make it yours</h3>
                            <button className="text-slate-500 hover:text-white"><Settings className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Select topics and interests to customize your Discover experience</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {["Tech & Science", "Finance", "Arts & Culture", "Sports"].map(tag => (
                                <span key={tag} className="px-2 py-1 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <button className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors">
                            Save Interests
                        </button>
                    </div>

                    {/* Weather Widget (Mock) */}
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CloudSun className="w-5 h-5 text-yellow-500" />
                                <span className="text-2xl font-semibold text-white">29°</span>
                                <span className="text-xs text-slate-500">F/C</span>
                            </div>
                            <span className="text-xs text-slate-500">Mostly clear</span>
                        </div>
                        <div className="flex justify-between text-center">
                            {["Sun", "Mon", "Tue", "Wed", "Thu"].map(day => (
                                <div key={day} className="flex flex-col gap-1">
                                    <CloudSun className="w-3 h-3 text-slate-500 mx-auto" />
                                    <span className="text-[10px] text-slate-500">{day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Market Widget */}
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                        <h3 className="font-medium text-slate-200 mb-4 text-sm">Market Outlook</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {marketData.map((item) => (
                                <div key={item.name} className="flex flex-col">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-400">{item.name}</span>
                                        <span className={cn("text-[10px]", item.up ? "text-green-400" : "text-red-400")}>
                                            {item.change}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-200">{item.value}</span>
                                    {/* Mock Mini Sparkline */}
                                    <div className={cn("h-6 w-full mt-1 opacity-50", item.up ? "stroke-green-500" : "stroke-red-500")}>
                                        <svg viewBox="0 0 100 20" className="w-full h-full fill-none stroke-current stroke-2">
                                            <path d={item.up ? "M0 15 Q25 18 50 10 T100 2" : "M0 2 Q25 5 50 12 T100 18"} />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
