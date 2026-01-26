'use client';

import React, { useState } from 'react';
import { Clock, MoreHorizontal, Heart, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoverHeroProps {
    title: string;
    description: string;
    imageUrl: string;
    sourceCount: number;
    timeAgo: string;
    category: string;
}

export function DiscoverHero({
    title,
    description,
    imageUrl,
    sourceCount,
    timeAgo,
    category
}: DiscoverHeroProps) {
    return (
        <div className="group relative w-full rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-all duration-300 cursor-pointer">
            <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <span className="text-[10px] font-bold">P</span>
                            </div>
                            <span className="text-xs font-medium text-slate-400">Published {timeAgo}</span>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-serif font-medium text-slate-100 mb-3 leading-tight group-hover:text-emerald-400 transition-colors">
                            {title}
                        </h2>

                        <p className="text-slate-400 line-clamp-3 md:line-clamp-4 leading-relaxed mb-6">
                            {description}
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-900 ring-2 ring-slate-900 flex items-center justify-center text-[8px] text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs font-medium text-slate-500">{sourceCount} sources</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors">
                                <Heart className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-[45%] h-64 md:h-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-slate-900/50 to-slate-900" />
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
}
