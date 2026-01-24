'use client';

import React, { useEffect, useState } from 'react';
import {
    SignedIn,
    SignedOut,
    SignInButton,
    useAuth,
    useClerk,
    useUser,
} from '@clerk/nextjs';
import {
    Plus,
    Clock,
    Compass,
    LayoutGrid,
    TrendingUp,
    Settings,
    ChevronRight,
    MoreHorizontal,
    LogIn,
    LogOut,
    Trash2,
    MessageSquare,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fetchConversations, deleteConversation, ConversationListItem } from "@/lib/conversations";

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onSelectConversation?: (id: string) => void;
    onNewConversation?: () => void;
    activeConversationId?: string | null;
}

const NAV_ITEMS = [
    { icon: Compass, label: 'Discover', active: false },
    { icon: LayoutGrid, label: 'Spaces', active: false },
    { icon: TrendingUp, label: 'Trending', active: false },
];

export function Sidebar({
    isOpen,
    onToggle,
    onSelectConversation,
    onNewConversation,
    activeConversationId
}: SidebarProps) {
    const { isSignedIn, getToken } = useAuth();
    const { signOut } = useClerk();
    const { user } = useUser();
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isSignedIn) {
            loadConversations();
        } else {
            setConversations([]);
        }
    }, [isSignedIn]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (token) {
                const convos = await fetchConversations(token);
                setConversations(convos);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const token = await getToken();
            if (token) {
                await deleteConversation(token, id);
                setConversations(prev => prev.filter(c => c._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            <aside className={cn(
                "fixed left-0 top-0 h-full z-40 flex flex-col overflow-visible",
                "bg-black/40 backdrop-blur-xl border-r border-emerald-900/30",
                "transition-all duration-300",
                isOpen ? "w-64" : "w-16"
            )}>
                <div className="p-4 flex items-center gap-3">
                    <img src="/atom-logo.png" alt="Atom" className="w-8 h-8 shrink-0 invert" />
                    {isOpen && (
                        <span className="text-lg font-semibold bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent animate-in fade-in duration-300">
                            Atom
                        </span>
                    )}
                </div>

                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    <button
                        onClick={onNewConversation}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5 shrink-0" />
                        {isOpen && (
                            <span className="text-sm font-medium animate-in fade-in duration-300">
                                New Thread
                            </span>
                        )}
                    </button>

                    {isOpen && isSignedIn && conversations.length > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 uppercase tracking-wide">
                                <Clock className="w-3 h-3" />
                                <span>Recent</span>
                            </div>
                            <div className="space-y-1">
                                {conversations.map((convo) => (
                                    <button
                                        key={convo._id}
                                        onClick={() => onSelectConversation?.(convo._id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group",
                                            activeConversationId === convo._id
                                                ? "bg-emerald-500/20 text-emerald-300"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                        )}
                                    >
                                        <MessageSquare className="w-4 h-4 shrink-0" />
                                        <div className="flex-1 text-left overflow-hidden">
                                            <div className="text-sm truncate">{convo.title}</div>
                                            <div className="text-xs text-slate-500">{formatDate(convo.updatedAt)}</div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, convo._id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-400" />
                                        </button>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 space-y-1">
                        {NAV_ITEMS.map((item, index) => (
                            <button
                                key={index}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {isOpen && (
                                    <span className="text-sm font-medium animate-in fade-in duration-300">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="px-2 pb-4 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200">
                        <MoreHorizontal className="w-5 h-5 shrink-0" />
                        {isOpen && <span className="text-sm font-medium">More</span>}
                    </button>
                </div>

                <div className={cn(
                    "border-t border-slate-800/50",
                    isOpen ? "p-4" : "px-2 py-4"
                )}>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200">
                        <Settings className="w-5 h-5 shrink-0" />
                        {isOpen && <span className="text-sm font-medium">Settings</span>}
                    </button>

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

                <div className={cn(
                    "border-t border-emerald-900/30 space-y-2",
                    isOpen ? "p-4" : "px-2 py-4"
                )}>
                    <SignedIn>
                        <div className={cn(
                            "w-full flex items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20",
                            isOpen ? "px-3 py-2.5" : "p-2 justify-center"
                        )}>
                            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                    <User className="w-4 h-4 text-white" />
                                )}
                            </div>
                            {isOpen && (
                                <span className="text-sm font-medium text-emerald-300 truncate flex-1">
                                    {user?.firstName || user?.username || 'User'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => signOut({ redirectUrl: '/landing' })}
                            className={cn(
                                "w-full flex items-center gap-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200",
                                isOpen ? "px-3 py-2.5" : "p-2 justify-center"
                            )}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {isOpen && <span className="text-sm font-medium">Sign Out</span>}
                        </button>
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40 hover:from-emerald-500/20 hover:to-green-500/20 transition-all duration-200">
                                <LogIn className="w-5 h-5 shrink-0" />
                                {isOpen && <span className="text-sm font-medium">Sign In</span>}
                            </button>
                        </SignInButton>
                    </SignedOut>
                </div>
            </aside>
        </>
    );
}
