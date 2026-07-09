'use client';


import { useRouter, usePathname } from 'next/navigation';
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
    User,
    Menu,
    X,
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
    { icon: Compass, label: 'Discover', active: false, href: '/discover' },
    { icon: LayoutGrid, label: 'Spaces', active: false, href: '/spaces' },
    { icon: TrendingUp, label: 'Trending', active: false, href: '/trending' },
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
    const router = useRouter();
    const pathname = usePathname();
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

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    return (
        <>
            {/* Mobile top bar + menu button */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 h-12 bg-black/40 backdrop-blur-xl border-b border-white/10">
                <button
                    type="button"
                    aria-label={isOpen ? 'Close menu' : 'Open menu'}
                    onClick={onToggle}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
                >
                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2"
                >
                    <img src="/atom-logo.png" alt="Atom" className="w-7 h-7 invert" />
                    <span className="text-base font-semibold text-white">Atom</span>
                </button>
                <div className="w-9" />
            </div>

            {/* Mobile overlay backdrop */}
            {isOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={onToggle}
                />
            )}

            <aside className={cn(
                "fixed top-0 h-full z-50 flex flex-col overflow-visible",
                "bg-black/50 backdrop-blur-2xl border-r border-white/10",
                "transition-all duration-300",
                // Mobile: slide-over drawer; Desktop: icon rail / expanded panel
                "left-0 w-[min(20rem,85vw)]",
                isOpen ? "translate-x-0" : "-translate-x-full",
                "md:translate-x-0",
                isOpen ? "md:w-64" : "md:w-16"
            )}>
                <div className="p-4 flex items-center gap-3 cursor-pointer group" onClick={() => router.push('/')}>
                    <img src="/atom-logo.png" alt="Atom" className="w-8 h-8 shrink-0 invert transition-transform duration-300 group-hover:rotate-12" />
                    <span className={cn(
                        "text-lg font-semibold text-white animate-in fade-in duration-300",
                        !isOpen && "md:hidden"
                    )}>
                        Atom
                    </span>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    <button
                        onClick={() => {
                            onNewConversation?.();
                            if (typeof window !== 'undefined' && window.innerWidth < 768) onToggle();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl glass-light text-white hover:bg-white/12 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5 shrink-0" />
                        <span className={cn(
                            "text-sm font-medium animate-in fade-in duration-300",
                            !isOpen && "md:hidden"
                        )}>
                            New Thread
                        </span>
                    </button>

                    {isSignedIn && conversations.length > 0 && (
                        <div className={cn("mt-4", !isOpen && "md:hidden")}>
                            <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 uppercase tracking-wide">
                                <Clock className="w-3 h-3" />
                                <span>Recent</span>
                            </div>
                            <div className="space-y-1">
                                {conversations.map((convo) => (
                                    <div
                                        key={convo._id}
                                        className={cn(
                                            "w-full flex items-center gap-1 px-1 py-1 rounded-lg transition-colors duration-200 group",
                                            activeConversationId === convo._id
                                                ? "bg-brand/15 text-brand"
                                                : "text-white/60 hover:text-white hover:bg-white/[0.07]"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelectConversation?.(convo._id);
                                                if (typeof window !== 'undefined' && window.innerWidth < 768) onToggle();
                                            }}
                                            className="flex-1 flex items-center gap-2 px-2 py-1 min-w-0 text-left"
                                        >
                                            <MessageSquare className="w-4 h-4 shrink-0" />
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-sm truncate">{convo.title}</div>
                                                <div className="text-xs text-white/35">{formatDate(convo.updatedAt)}</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Delete ${convo.title}`}
                                            onClick={(e) => handleDelete(e, convo._id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all shrink-0"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 space-y-1">
                        {NAV_ITEMS.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => item.href && handleNavigation(item.href)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200",
                                    pathname === item.href
                                        ? "bg-brand/15 text-brand"
                                        : "text-white/60 hover:text-white hover:bg-white/[0.07]"
                                )}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className={cn(
                                    "text-sm font-medium animate-in fade-in duration-300",
                                    !isOpen && "md:hidden"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="px-2 pb-4 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors duration-200">
                        <MoreHorizontal className="w-5 h-5 shrink-0" />
                        <span className={cn("text-sm font-medium", !isOpen && "md:hidden")}>More</span>
                    </button>
                </div>

                <div className={cn(
                    "border-t border-white/[0.08]",
                    isOpen ? "p-4" : "p-4 md:px-2 md:py-4"
                )}>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors duration-200">
                        <Settings className="w-5 h-5 shrink-0" />
                        <span className={cn("text-sm font-medium", !isOpen && "md:hidden")}>Settings</span>
                    </button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="hidden md:flex w-full mt-2 h-8 text-white/50 hover:text-white hover:bg-white/[0.07]"
                    >
                        <ChevronRight className={cn(
                            "w-4 h-4 transition-transform duration-300",
                            isOpen && "rotate-180"
                        )} />
                    </Button>
                </div>

                <div className={cn(
                    "border-t border-white/[0.08] space-y-2",
                    isOpen ? "p-4" : "p-4 md:px-2 md:py-4"
                )}>
                    <SignedIn>
                        <div className={cn(
                            "w-full flex items-center gap-3 rounded-xl glass-light",
                            isOpen ? "px-3 py-2.5" : "px-3 py-2.5 md:p-2 md:justify-center"
                        )}>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                    <User className="w-4 h-4 text-white/60" />
                                )}
                            </div>
                            <span className={cn(
                                "text-sm font-medium text-white truncate flex-1",
                                !isOpen && "md:hidden"
                            )}>
                                {user?.firstName || user?.username || 'User'}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut({ redirectUrl: '/landing' })}
                            className={cn(
                                "w-full flex items-center gap-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors duration-200",
                                isOpen ? "px-3 py-2.5" : "px-3 py-2.5 md:p-2 md:justify-center"
                            )}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            <span className={cn("text-sm font-medium", !isOpen && "md:hidden")}>Sign Out</span>
                        </button>
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-light text-white hover:bg-white/12 transition-all duration-200">
                                <LogIn className="w-5 h-5 shrink-0" />
                                <span className={cn("text-sm font-medium", !isOpen && "md:hidden")}>Sign In</span>
                            </button>
                        </SignInButton>
                    </SignedOut>
                </div>
            </aside>
        </>
    );
}
