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

interface ChatInterfaceProps {
    query: string;
    setQuery: (q: string) => void;
    onSubmit: (e: FormEvent) => void;
    isLoading: boolean;
    hasSearched: boolean;
    modelProvider: 'openai' | 'claude' | 'gemini';
    setModelProvider: (provider: 'openai' | 'claude' | 'gemini') => void;
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
            "transition-all duration-700 ease-in-out w-full max-w-2xl mx-auto z-10",
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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-emerald-700/50 mb-6">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-300/80">Powered by AI</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                            What do you want to know?
                        </span>
                    </h1>
                    <p className="text-slate-500 text-lg">
                        Search the web with AI-powered answers
                    </p>
                </div>
            )}

            <form onSubmit={onSubmit} className="relative w-full group">
                <div className="relative">
                    {/* Glow effect */}
                    <div className={cn(
                        "absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 opacity-0 blur-lg transition-opacity duration-500",
                        "group-focus-within:opacity-100"
                    )} />

                    <div className="relative">
                        {/* Main input container */}
                        <div className={cn(
                            "relative transition-all",
                            "bg-black/50 backdrop-blur-xl",
                            "border border-emerald-800/40 hover:border-emerald-700/50",
                            "focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:ring-offset-0 focus-within:border-emerald-500/50",
                            hasSearched ? "rounded-xl" : "rounded-2xl shadow-2xl shadow-black/40"
                        )}>
                            {/* Attachments preview */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-4 pt-3">
                                    {attachments.map((attachment, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                                        >
                                            {attachment.type === 'image' && <Image className="w-3 h-3 text-blue-400" />}
                                            {attachment.type === 'pdf' && <FileText className="w-3 h-3 text-red-400" />}
                                            {attachment.type === 'audio' && <Mic className="w-3 h-3 text-green-400" />}
                                            <span className="text-slate-300 max-w-[100px] truncate">{attachment.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="text-slate-500 hover:text-white transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Input row */}
                            <div className="flex items-center">
                                <Search className={cn(
                                    "absolute left-5 h-5 w-5 text-slate-400 transition-colors",
                                    "group-focus-within:text-emerald-400"
                                )} />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Ask anything. Type @ for mentions..."
                                    className={cn(
                                        "pl-14 pr-32 h-14 w-full border-0 bg-transparent",
                                        "text-lg text-white placeholder:text-slate-500",
                                        "focus-visible:ring-0 focus-visible:ring-offset-0"
                                    )}
                                />
                            </div>

                            {/* Bottom toolbar */}
                            <div className="flex items-center justify-between px-4 pb-3 pt-1">
                                <div className="flex items-center gap-1">
                                    {/* Mode buttons */}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300"
                                    >
                                        <Search className="w-3.5 h-3.5 mr-1.5" />
                                        Search
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                        Focus
                                    </Button>

                                    <select
                                        value={modelProvider}
                                        onChange={(e) => setModelProvider(e.target.value as 'openai' | 'claude' | 'gemini')}
                                        className="h-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 text-xs px-2 outline-none focus:border-emerald-500"
                                        aria-label="Select AI model provider"
                                    >
                                        <option value="openai">OpenAI (gpt-4o-mini)</option>
                                        <option value="claude">Claude (3.5 Haiku)</option>
                                        <option value="gemini">Gemini (2.5 Flash)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Attachment buttons */}
                                    <div className="relative">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                                        >
                                            <Paperclip className="w-4 h-4" />
                                        </Button>

                                        {/* Attachment dropdown */}
                                        {showAttachMenu && (
                                            <div className="absolute bottom-full right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-xl min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                <button
                                                    type="button"
                                                    onClick={() => handleFileSelect('image')}
                                                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors text-left"
                                                >
                                                    <Image className="w-4 h-4 text-blue-400" />
                                                    <span className="text-sm text-slate-200">Image</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFileSelect('pdf')}
                                                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors text-left"
                                                >
                                                    <FileText className="w-4 h-4 text-red-400" />
                                                    <span className="text-sm text-slate-200">PDF Document</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFileSelect('audio')}
                                                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors text-left"
                                                >
                                                    <Mic className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm text-slate-200">Audio</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                        onClick={() => handleFileSelect('image')}
                                    >
                                        <Image className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                    >
                                        <Mic className="w-4 h-4" />
                                    </Button>

                                    {/* Submit button */}
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!query.trim() || isLoading}
                                        className={cn(
                                            "h-8 w-8 rounded-lg ml-1 transition-all",
                                            "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400",
                                            "shadow-lg shadow-emerald-500/25",
                                            "disabled:opacity-40 disabled:shadow-none"
                                        )}
                                    >
                                        {isLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <ArrowRight className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
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
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-emerald-800/40 
                                text-sm text-emerald-300/80 hover:text-white hover:bg-emerald-900/30 hover:border-emerald-600/50
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
