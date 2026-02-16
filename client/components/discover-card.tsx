'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface DiscoverCardProps {
    title: string;
    imageUrl: string | null;
    description?: string;
    source: string;
    sourceIcon: string;
    timeAgo: string;
    variant?: 'default' | 'featured' | 'compact';
    className?: string;
    onClick?: () => void;
}

export function DiscoverCard({
    title,
    imageUrl,
    description,
    source,
    sourceIcon,
    timeAgo,
    variant = 'default',
    className,
    onClick
}: DiscoverCardProps) {
    // Featured variant — tall card with image background + overlay text
    if (variant === 'featured') {
        return (
            <div
                onClick={onClick}
                className={cn(
                    "group relative overflow-hidden rounded-xl cursor-pointer h-[320px]",
                    className
                )}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <div className="flex items-center gap-2 mb-2">
                        {sourceIcon && <img src={sourceIcon} alt="" className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20" />}
                        <span className="text-[11px] text-white/70 font-medium">{source}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-[11px] text-white/40">{timeAgo}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white leading-snug line-clamp-3 group-hover:text-emerald-300 transition-colors">
                        {title}
                    </h3>
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/90 flex items-center justify-center backdrop-blur-sm">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>
        );
    }

    // Compact variant — horizontal, no image
    if (variant === 'compact') {
        return (
            <div
                onClick={onClick}
                className={cn(
                    "group flex items-start gap-4 p-4 rounded-xl cursor-pointer",
                    "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-emerald-500/20",
                    "transition-all duration-300",
                    className
                )}
            >
                <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-slate-200 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2.5">
                        {sourceIcon && <img src={sourceIcon} alt="" className="w-3.5 h-3.5 rounded-full" />}
                        <span className="text-[11px] text-slate-500">{source}</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-[11px] text-slate-600">{timeAgo}</span>
                    </div>
                </div>
                {imageUrl && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Default variant — card with image on top
    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-xl cursor-pointer",
                "bg-white/[0.03] border border-white/[0.04] hover:border-emerald-500/20",
                "hover:bg-white/[0.06] transition-all duration-300",
                "hover:shadow-lg hover:shadow-emerald-500/5",
                className
            )}
        >
            {imageUrl && (
                <div className="aspect-[16/9] w-full relative overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                </div>
            )}

            <div className="p-4 flex flex-col gap-2.5">
                <h3 className="text-[15px] font-semibold text-slate-200 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>

                {description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{description}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-1">
                    <div className="flex items-center gap-2">
                        {sourceIcon && <img src={sourceIcon} alt="" className="w-3.5 h-3.5 rounded-full" />}
                        <span className="text-[11px] text-slate-500">{source}</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-[11px] text-slate-600">{timeAgo}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
