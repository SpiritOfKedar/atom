'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    ALL_MODEL_PROVIDERS,
    ModelProvider,
    modelProviderDescription,
    modelProviderGroup,
    modelProviderShortLabel,
} from '@/lib/models';

interface ModelSelectorProps {
    modelProvider: ModelProvider;
    onChange: (provider: ModelProvider) => void;
    className?: string;
}

/** Per-vendor gradient used for the little monogram tiles. */
const GROUP_GRADIENTS: Record<string, string> = {
    'NVIDIA NIM': 'from-emerald-400 to-teal-600',
    'OpenAI': 'from-slate-200 to-slate-500',
    'Anthropic': 'from-orange-300 to-amber-600',
    'Google': 'from-sky-300 to-blue-600',
};

function Monogram({ provider, group }: { provider: ModelProvider; group: string }) {
    const initial = modelProviderShortLabel(provider).charAt(0).toUpperCase();
    return (
        <div
            className={cn(
                'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0',
                'text-[11px] font-bold text-black/80 shadow-inner',
                GROUP_GRADIENTS[group] ?? 'from-slate-300 to-slate-600'
            )}
        >
            {initial}
        </div>
    );
}

export function ModelSelector({ modelProvider, onChange, className }: ModelSelectorProps) {
    const [open, setOpen] = useState(false);

    const groups = useMemo(() => {
        const map = new Map<string, ModelProvider[]>();
        for (const provider of ALL_MODEL_PROVIDERS) {
            const group = modelProviderGroup(provider);
            if (!map.has(group)) map.set(group, []);
            map.get(group)!.push(provider);
        }
        return Array.from(map.entries());
    }, []);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="Select AI model"
                    className={cn(
                        'inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full',
                        'glass-light text-xs font-medium text-white/80',
                        'hover:bg-white/10 hover:text-white transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
                        open && 'bg-white/10 text-white',
                        className
                    )}
                >
                    <Cpu className="w-3.5 h-3.5 text-brand" />
                    <span className="truncate max-w-[130px]">{modelProviderShortLabel(modelProvider)}</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-white/50 transition-transform duration-200', open && 'rotate-180')} />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[340px] max-h-[400px] overflow-y-auto glass-heavy rounded-2xl p-2 shadow-2xl shadow-black/60"
                align="start"
            >
                <div className="px-2.5 pt-1.5 pb-2 border-b border-white/[0.06] mb-1">
                    <p className="text-sm font-semibold text-white">Choose a model</p>
                    <p className="text-[11px] text-white/40">Answers are generated with the model you pick</p>
                </div>
                {groups.map(([group, providers]) => (
                    <div key={group} className="mb-1 last:mb-0">
                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                            <span
                                className={cn(
                                    'w-1.5 h-1.5 rounded-full bg-gradient-to-br',
                                    GROUP_GRADIENTS[group] ?? 'from-slate-300 to-slate-600'
                                )}
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                {group}
                            </span>
                        </div>
                        {providers.map((provider) => {
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
                                        'w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150 group/row',
                                        active
                                            ? 'bg-brand/15 ring-1 ring-brand/30'
                                            : 'hover:bg-white/[0.06]'
                                    )}
                                >
                                    <Monogram provider={provider} group={group} />
                                    <div className="flex-1 min-w-0">
                                        <div className={cn(
                                            'text-[13px] font-semibold truncate',
                                            active ? 'text-brand' : 'text-white/90'
                                        )}>
                                            {modelProviderShortLabel(provider)}
                                        </div>
                                        <div className="text-[11px] text-white/40 truncate">
                                            {modelProviderDescription(provider)}
                                        </div>
                                    </div>
                                    {active && (
                                        <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-brand-foreground" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </PopoverContent>
        </Popover>
    );
}
