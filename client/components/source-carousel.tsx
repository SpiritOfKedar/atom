import React from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Globe, ExternalLink } from "lucide-react";

interface Source {
    title: string;
    link: string;
    favicon: string;
}

interface SourceCarouselProps {
    sources: Source[];
}

export function SourceCarousel({ sources }: SourceCarouselProps) {
    if (sources.length === 0) return null;

    return (
        <div className="w-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-white/70">
                <Globe className="h-4 w-4" />
                <span>Sources</span>
                <span className="text-xs opacity-60">({sources.length})</span>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-3 pb-4">
                    {sources.map((source, index) => (
                        <a
                            key={index}
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                        >
                            <div className="relative w-[220px] h-[90px] rounded-xl overflow-hidden transition-all duration-300
                                glass
                                hover:border-white/25 hover:-translate-y-0.5
                                cursor-pointer">

                                {/* Source number badge */}
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white/60">{index + 1}</span>
                                </div>

                                <div className="p-3 flex flex-col justify-between h-full relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {source.favicon ? (
                                                <img
                                                    src={source.favicon}
                                                    alt=""
                                                    className="w-3 h-3 object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <Globe className="w-2.5 h-2.5 text-white/50" />
                                            )}
                                        </div>
                                        <span className="text-[11px] text-white/50 truncate">
                                            {new URL(source.link).hostname.replace('www.', '')}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                                    </div>
                                    <div className="font-medium text-sm line-clamp-2 leading-snug whitespace-normal text-white/85 group-hover:text-white transition-colors">
                                        {source.title}
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
