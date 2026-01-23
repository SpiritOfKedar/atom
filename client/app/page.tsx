'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SourceCarousel } from '@/components/source-carousel';
import { ChatInterface } from '@/components/chat-interface';
import { Sidebar } from '@/components/sidebar';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Source {
  title: string;
  link: string;
  favicon: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);
    setIsLoading(true);
    setSources([]);
    setAnswer('');

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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

  useEffect(() => {
    if (isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [answer, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main content with sidebar offset */}
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

              {/* Sources Section */}
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

              <Separator className="bg-slate-800/50" />

              {/* Answer Section */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="h-5 w-5 flex items-center justify-center">
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                      ) : (
                        <div className="h-2 w-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg shadow-blue-500/50" />
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
                  <div className="relative p-5 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
                    <div className="prose prose-invert max-w-none text-base leading-relaxed break-words text-slate-300">
                      <div className="whitespace-pre-wrap">{answer}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-5 rounded-xl bg-slate-900/50 border border-slate-800/50">
                    <Skeleton className="h-4 w-full bg-slate-800" />
                    <Skeleton className="h-4 w-[90%] bg-slate-800" />
                    <Skeleton className="h-4 w-[80%] bg-slate-800" />
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
