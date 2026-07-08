'use client';

import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ALL_MODEL_PROVIDERS,
    ModelProvider,
    modelProviderDescription,
    modelProviderLogo,
    modelProviderLogoFit,
    modelProviderShortLabel,
} from '@/lib/models';

interface ModelSelectorProps {
    modelProvider: ModelProvider;
    onChange: (provider: ModelProvider) => void;
    className?: string;
}

function ModelLogo({
    provider,
    size = 'md',
    className,
}: {
    provider: ModelProvider;
    size?: 'sm' | 'md';
    className?: string;
}) {
    const fit = modelProviderLogoFit(provider);
    const dim = size === 'sm' ? 'w-5 h-5' : 'w-9 h-9';
    const needsPad = fit === 'contain';
    const pad = needsPad ? (size === 'sm' ? 'p-[3px]' : 'p-1.5') : 'p-0';

    return (
        <div
            className={cn(
                dim,
                'rounded-[10px] overflow-hidden shrink-0',
                needsPad ? 'bg-white' : 'bg-white/[0.06]',
                'ring-1 ring-inset ring-white/[0.1]',
                pad,
                className
            )}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={modelProviderLogo(provider)}
                alt=""
                aria-hidden
                className={cn(
                    'w-full h-full',
                    fit === 'cover' ? 'object-cover' : 'object-contain',
                    provider === 'gemini' && 'scale-[1.28]'
                )}
                draggable={false}
            />
        </div>
    );
}

export function ModelSelector({ modelProvider, onChange, className }: ModelSelectorProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="Select AI model"
                    className={cn(
                        'inline-flex items-center gap-2 h-8 pl-1.5 pr-2 rounded-full',
                        'glass-light text-xs font-medium text-white/80',
                        'hover:bg-white/10 hover:text-white transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
                        open && 'bg-white/10 text-white',
                        className
                    )}
                >
                    <ModelLogo provider={modelProvider} size="sm" className="rounded-full ring-0" />
                    <span className="truncate max-w-[160px]">{modelProviderShortLabel(modelProvider)}</span>
                    <ChevronDown
                        className={cn(
                            'w-3.5 h-3.5 text-white/45 transition-transform duration-200',
                            open && 'rotate-180'
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className={cn(
                    'w-[min(360px,calc(100vw-2rem))] p-0 overflow-hidden rounded-2xl border-white/[0.1]',
                    '!bg-transparent backdrop-blur-xl',
                    'shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)]'
                )}
                align="start"
            >
                <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.06]">
                    <p className="text-[13px] font-semibold tracking-tight text-white">
                        Choose a model
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
                        Answers are generated with the model you pick
                    </p>
                </div>

                <ScrollArea className="h-[min(420px,55vh)]">
                    <div className="flex flex-col gap-0.5 p-2">
                        {ALL_MODEL_PROVIDERS.map((provider) => {
                            const active = provider === modelProvider;
                            return (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => {
                                        onChange(provider);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left',
                                        'transition-colors duration-150',
                                        active
                                            ? 'bg-white/[0.08]'
                                            : 'hover:bg-white/[0.045]'
                                    )}
                                >
                                    <ModelLogo provider={provider} />
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className={cn(
                                                'text-[13px] font-medium tracking-tight truncate',
                                                active ? 'text-white' : 'text-white/90'
                                            )}
                                        >
                                            {modelProviderShortLabel(provider)}
                                        </div>
                                        <div className="text-[11px] text-white/40 truncate mt-0.5 leading-snug">
                                            {modelProviderDescription(provider)}
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-opacity',
                                            active
                                                ? 'bg-white text-black opacity-100'
                                                : 'opacity-0'
                                        )}
                                        aria-hidden={!active}
                                    >
                                        <Check className="w-3 h-3" strokeWidth={2.75} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
