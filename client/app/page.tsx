'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SourceCarousel } from '@/components/source-carousel';
import { ChatInterface } from '@/components/chat-interface';
import { Sidebar } from '@/components/sidebar';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchConversation, Message } from '@/lib/conversations';

interface Source {
  title: string;
  link: string;
  favicon: string;
}

export default function Home() {
  const { isSignedIn, getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);
    setIsLoading(true);
    setSources([]);
    setAnswer('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, conversationId }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            if (parsed.type === 'sources') {
              setSources(parsed.data);
            } else if (parsed.type === 'token') {
              setAnswer(prev => prev + parsed.data);
            } else if (parsed.type === 'conversationId') {
              setConversationId(parsed.data);
            } else if (parsed.type === 'error') {
              console.error("Backend error:", parsed.data);
              setAnswer(prev => prev + "\n[Error: " + parsed.data + "]");
            }
          } catch (err) {
            console.error('Error parsing JSON line:', err);
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setAnswer("Sorry, I encountered an error while searching.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectConversation = async (id: string) => {
    if (!isSignedIn) return;

    try {
      const token = await getToken();
      if (!token) return;

      const convo = await fetchConversation(token, id);
      setConversationId(id);
      setMessages(convo.messages);
      setHasSearched(true);

      const lastUserMsg = [...convo.messages].reverse().find(m => m.role === 'user');
      const lastAssistantMsg = [...convo.messages].reverse().find(m => m.role === 'assistant');

      if (lastUserMsg) setQuery(lastUserMsg.content);
      if (lastAssistantMsg) {
        setAnswer(lastAssistantMsg.content);
        if (lastAssistantMsg.sources) {
          setSources(lastAssistantMsg.sources);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setQuery('');
    setAnswer('');
    setSources([]);
    setMessages([]);
    setHasSearched(false);
  };

  useEffect(() => {
    if (isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [answer, isLoading]);

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/back_for_proj.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        activeConversationId={conversationId}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-3xl" />
      </div>

      <div className={cn(
        "transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        <main className="relative z-10 flex flex-col p-4 md:p-8 font-sans text-foreground">
          <ChatInterface
            query={query}
            setQuery={setQuery}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasSearched={hasSearched}
          />

          {hasSearched && (
            <div className="max-w-2xl mx-auto w-full mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

              {sources.length > 0 ? (
                <SourceCarousel sources={sources} />
              ) : isLoading ? (
                <div className="w-full space-y-2 mb-6">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                    <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
                    <Skeleton className="h-4 w-20 bg-slate-800" />
                  </div>
                  <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="w-[220px] h-[90px] rounded-xl shrink-0 bg-slate-800/50" />
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator className="bg-emerald-900/30" />

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="h-5 w-5 flex items-center justify-center">
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                      ) : (
                        <div className="h-2 w-2 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full shadow-lg shadow-emerald-500/50" />
                      )}
                    </div>
                    <span className="text-slate-300">Answer</span>
                  </div>

                  {answer && !isLoading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="ml-1 text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  )}
                </div>

                {answer ? (
                  <div className="relative p-5 rounded-xl bg-black/40 border border-emerald-900/30 backdrop-blur-sm">
                    <div className="prose prose-invert max-w-none text-base leading-relaxed break-words text-emerald-100/90">
                      <div className="whitespace-pre-wrap">{answer}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-5 rounded-xl bg-black/40 border border-emerald-900/30">
                    <Skeleton className="h-4 w-full bg-emerald-900/30" />
                    <Skeleton className="h-4 w-[90%] bg-emerald-900/30" />
                    <Skeleton className="h-4 w-[80%] bg-emerald-900/30" />
                  </div>
                )}
              </div>

              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
