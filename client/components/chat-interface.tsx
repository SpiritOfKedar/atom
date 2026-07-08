'use client';

import React, { FormEvent, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Search,
    Sparkles,
    Image,
    FileText,
    Mic,
    Paperclip,
    X,
    ShoppingBag,
    BookOpen,
    Code,
    Lightbulb,
    TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/model-selector";
import { ModelProvider } from "@/lib/models";

interface ChatInterfaceProps {
    query: string;
    setQuery: (q: string) => void;
    onSubmit: (e: FormEvent) => void;
    isLoading: boolean;
    hasSearched: boolean;
    modelProvider: ModelProvider;
    setModelProvider: (provider: ModelProvider) => void;
}

const QUICK_SUGGESTIONS = [
    { icon: ShoppingBag, label: 'Shopping', query: 'Find the best deals on ' },
    { icon: BookOpen, label: 'Research', query: 'Research about ' },
    { icon: Code, label: 'Code', query: 'How to code ' },
    { icon: Lightbulb, label: 'Explain', query: 'Explain in simple terms ' },
    { icon: TrendingUp, label: 'Trending', query: 'What is trending in ' },
];

interface Attachment {
    type: 'image' | 'pdf' | 'audio';
    name: string;
    file: File;
}

export function ChatInterface({
    query,
    setQuery,
    onSubmit,
    isLoading,
    hasSearched,
    modelProvider,
    setModelProvider,
}: ChatInterfaceProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileType, setFileType] = useState<'image' | 'pdf' | 'audio'>('image');

    const handleFileSelect = (type: 'image' | 'pdf' | 'audio') => {
        setFileType(type);
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'image' ? 'image/*' : type === 'pdf' ? '.pdf' : 'audio/*';
            fileInputRef.current.click();
        }
        setShowAttachMenu(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            setAttachments(prev => [...prev, {
                type: fileType,
                name: files[0].name,
                file: files[0]
            }]);
        }
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSuggestionClick = (suggestion: typeof QUICK_SUGGESTIONS[0]) => {
        setQuery(suggestion.query);
    };

    return (
        <div className={cn(
            "transition-all duration-500 ease-in-out w-full max-w-2xl mx-auto z-10",
            !hasSearched ? "flex flex-col items-center justify-center min-h-[60vh]" : ""
        )}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {!hasSearched && (
                <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-light mb-6">
                        <Sparkles className="w-3 h-3 text-brand" />
                        <span className="text-xs text-white/75">Powered by AI</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.5)]">
                        What do you want to know?
                    </h1>
                    <p className="text-white/70 text-lg [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
                        Search the web with AI-powered answers
                    </p>
                </div>
            )}

            <form onSubmit={onSubmit} className="relative w-full group">
                <div className={cn(
                    "relative glass transition-all duration-300",
                    "focus-within:border-white/25 focus-within:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)]",
                    hasSearched ? "rounded-xl" : "rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
                )}>
                    {/* Attachments preview */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4 pt-3">
                            {attachments.map((attachment, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light text-sm"
                                >
                                    {attachment.type === 'image' && <Image className="w-3 h-3 text-white/60" />}
                                    {attachment.type === 'pdf' && <FileText className="w-3 h-3 text-white/60" />}
                                    {attachment.type === 'audio' && <Mic className="w-3 h-3 text-white/60" />}
                                    <span className="text-white/90 max-w-[100px] truncate">{attachment.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(index)}
                                        className="text-white/50 hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Input row */}
                    <div className="flex items-center">
                        <Search className="absolute left-5 h-5 w-5 text-white/50 group-focus-within:text-brand transition-colors" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={isLoading}
                            placeholder="Ask anything. Type @ for mentions..."
                            className={cn(
                                "pl-14 pr-32 h-14 w-full border-0 bg-transparent",
                                "text-lg text-white placeholder:text-white/40",
                                "focus-visible:ring-0 focus-visible:ring-offset-0"
                            )}
                        />
                    </div>

                    {/* Bottom toolbar */}
                    <div className="flex items-center justify-between px-4 pb-3 pt-1">
                        <div className="flex items-center gap-1.5">
                            {/* Mode buttons */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 rounded-full bg-brand/20 text-brand hover:bg-brand/25 hover:text-brand"
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5" />
                                Search
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                Focus
                            </Button>

                            <ModelSelector modelProvider={modelProvider} onChange={setModelProvider} />
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Attachment buttons */}
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                                >
                                    <Paperclip className="w-4 h-4" />
                                </Button>

                                {/* Attachment dropdown */}
                                {showAttachMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 glass-heavy rounded-xl p-1.5 shadow-2xl min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <button
                                            type="button"
                                            onClick={() => handleFileSelect('image')}
                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/[0.08] transition-colors text-left"
                                        >
                                            <Image className="w-4 h-4 text-white/60" />
                                            <span className="text-sm text-white/90">Image</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFileSelect('pdf')}
                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/[0.08] transition-colors text-left"
                                        >
                                            <FileText className="w-4 h-4 text-white/60" />
                                            <span className="text-sm text-white/90">PDF Document</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFileSelect('audio')}
                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/[0.08] transition-colors text-left"
                                        >
                                            <Mic className="w-4 h-4 text-white/60" />
                                            <span className="text-sm text-white/90">Audio</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                                onClick={() => handleFileSelect('image')}
                            >
                                <Image className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                            >
                                <Mic className="w-4 h-4" />
                            </Button>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!query.trim() || isLoading}
                                className={cn(
                                    "h-8 w-8 rounded-lg ml-1 transition-all duration-200",
                                    "bg-brand text-brand-foreground hover:bg-brand/90 hover:scale-110 active:scale-95",
                                    "shadow-lg shadow-brand/25",
                                    "disabled:opacity-40 disabled:shadow-none disabled:scale-100"
                                )}
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Quick suggestions */}
            {!hasSearched && (
                <div className="flex flex-wrap justify-center gap-2 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    {QUICK_SUGGESTIONS.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full glass-light
                                text-sm text-white/70 hover:text-white hover:bg-white/12 hover:-translate-y-0.5
                                transition-all duration-200"
                        >
                            <suggestion.icon className="w-4 h-4" />
                            {suggestion.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
