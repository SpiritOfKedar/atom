'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Heart, MoreHorizontal, MessageCircle } from "lucide-react";

interface DiscoverCardProps {
    title: string;
    imageUrl: string;
    sourceCount: number;
    sourceIcon?: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function DiscoverCard({
    title,
    imageUrl,
    sourceCount,
    sourceIcon,
    className,
    onClick
}: DiscoverCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-xl bg-slate-900/40 border border-slate-800/50",
                "hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300 cursor-pointer",
                className
            )}
        >
            {/* Image Container */}
            <div className="aspect-[16/9] w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opactiy-60" />
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            </div>

            <div className="p-4 flex flex-col gap-3">
                <h3 className="text-base font-medium text-slate-200 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>

                <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                        {sourceIcon || (
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">
                                B
                            </div>
                        )}
                        <span className="text-xs text-slate-500">{sourceCount} sources</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-full hover:bg-slate-700 text-slate-500 hover:text-red-400">
                            <Heart className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-full hover:bg-slate-700 text-slate-500 hover:text-white">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
