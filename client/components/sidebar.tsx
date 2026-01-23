'use client';

import React from 'react';
import {
    Sparkles,
    Plus,
    Clock,
    Compass,
    LayoutGrid,
    TrendingUp,
    Settings,
    ChevronRight,
    MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const NAV_ITEMS = [
    { icon: Plus, label: 'New Thread', active: false, primary: true },
    { icon: Clock, label: 'History', active: false },
    { icon: Compass, label: 'Discover', active: false },
    { icon: LayoutGrid, label: 'Spaces', active: false },
    { icon: TrendingUp, label: 'Trending', active: false },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
    return (
        <>
            {/* Collapsed sidebar (icons only) */}
            <aside className={cn(
                "fixed left-0 top-0 h-full z-50 flex flex-col",
                "bg-black/40 backdrop-blur-xl border-r border-emerald-900/30",
                "transition-all duration-300",
                isOpen ? "w-64" : "w-16"
            )}>
                {/* Logo */}
                <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    {isOpen && (
                        <span className="text-lg font-semibold bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent animate-in fade-in duration-300">
                            Atom
                        </span>
                    )}
                </div>

                {/* Navigation items */}
                <nav className="flex-1 px-2 py-4 space-y-1">
                    {NAV_ITEMS.map((item, index) => (
                        <button
                            key={index}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                                item.primary
                                    ? "bg-slate-800 text-white hover:bg-slate-700"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {isOpen && (
                                <span className="text-sm font-medium animate-in fade-in duration-300">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* More section */}
                <div className="px-2 pb-4 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200">
                        <MoreHorizontal className="w-5 h-5 shrink-0" />
                        {isOpen && <span className="text-sm font-medium">More</span>}
                    </button>
                </div>

                {/* Bottom section */}
                <div className="p-4 border-t border-slate-800/50">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200">
                        <Settings className="w-5 h-5 shrink-0" />
                        {isOpen && <span className="text-sm font-medium">Settings</span>}
                    </button>

                    {/* Toggle button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="w-full mt-2 h-8 text-slate-500 hover:text-white hover:bg-slate-800"
                    >
                        <ChevronRight className={cn(
                            "w-4 h-4 transition-transform duration-300",
                            isOpen && "rotate-180"
                        )} />
                    </Button>
                </div>

                {/* Sign in button at bottom */}
                <div className="p-4 border-t border-emerald-900/30">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40 transition-all duration-200">
                        <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center">
                            <span className="text-xs">?</span>
                        </div>
                        {isOpen && <span className="text-sm font-medium">Sign In</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
