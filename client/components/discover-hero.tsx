'use client';

import React from 'react';
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoverHeroProps {
    title: string;
    description: string;
    imageUrl: string;
    source: string;
    sourceIcon: string;
    timeAgo: string;
    onClick?: () => void;
}

export function DiscoverHero({
    title,
    description,
    imageUrl,
    source,
    sourceIcon,
    timeAgo,
    onClick,
}: DiscoverHeroProps) {
    return (
        <div
            onClick={onClick}
            className="group relative w-full h-[420px] rounded-2xl overflow-hidden cursor-pointer"
        >
            {/* Full-bleed background image */}
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

            {/* Top badge */}
            <div className="absolute top-5 left-5 z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Top Story</span>
                </div>
            </div>

            {/* Content at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
                <div className="max-w-2xl">
                    {/* Source info */}
                    <div className="flex items-center gap-2 mb-3">
                        {sourceIcon && (
                            <img src={sourceIcon} alt="" className="w-4 h-4 rounded-full ring-1 ring-white/20" />
                        )}
                        <span className="text-xs font-medium text-white/80">{source}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-xs text-white/50">{timeAgo}</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight tracking-tight">
                        {title}
                    </h2>

                    {/* Description */}
                    {description && (
                        <p className="text-white/60 line-clamp-2 text-sm md:text-base leading-relaxed mb-4 max-w-xl">
                            {description}
                        </p>
                    )}

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <span>Explore with Atom</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </div>
    );
}
