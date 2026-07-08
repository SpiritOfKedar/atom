'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface AnswerMarkdownProps {
    content: string;
    className?: string;
}

/** Turn bare [n] citation markers into markdown links we style as chips. */
function prepareCitations(text: string): string {
    return text.replace(/\[(\d+)\]/g, '[$1](#cite-$1)');
}

export function AnswerMarkdown({ content, className }: AnswerMarkdownProps) {
    return (
        <div className={cn('answer-markdown', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h2 className="text-xl font-semibold text-white tracking-tight mt-6 mb-3 first:mt-0">
                            {children}
                        </h2>
                    ),
                    h2: ({ children }) => (
                        <h3 className="text-lg font-semibold text-white tracking-tight mt-5 mb-2.5 first:mt-0">
                            {children}
                        </h3>
                    ),
                    h3: ({ children }) => (
                        <h4 className="text-[15px] font-semibold text-white/95 mt-4 mb-2 first:mt-0">
                            {children}
                        </h4>
                    ),
                    p: ({ children }) => (
                        <p className="text-[15px] leading-7 text-white/85 mb-4 last:mb-0">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-3.5 space-y-2 list-disc pl-5 marker:text-brand/70">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-3.5 space-y-2 list-decimal pl-5 marker:text-white/40">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-[15px] leading-7 text-white/85 pl-1">
                            {children}
                        </li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-white/90">{children}</em>
                    ),
                    a: ({ href, children }) => {
                        if (href?.startsWith('#cite-')) {
                            return (
                                <sup className="citation ml-0.5 inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 rounded-md bg-white/10 text-[10px] font-semibold text-brand align-super no-underline">
                                    {children}
                                </sup>
                            );
                        }
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand underline underline-offset-2 decoration-brand/40 hover:decoration-brand transition-colors"
                            >
                                {children}
                            </a>
                        );
                    },
                    blockquote: ({ children }) => (
                        <blockquote className="my-4 border-l-2 border-brand/50 pl-4 text-white/70 italic">
                            {children}
                        </blockquote>
                    ),
                    code: ({ className: codeClass, children }) => {
                        const isBlock = Boolean(codeClass);
                        if (isBlock) {
                            return (
                                <code className="block text-[13px] font-mono text-white/85 leading-relaxed whitespace-pre">
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-[13px] font-mono text-brand/90">
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => (
                        <pre className="my-4 overflow-x-auto rounded-xl bg-black/40 border border-white/[0.08] p-4">
                            {children}
                        </pre>
                    ),
                    hr: () => <hr className="my-6 border-white/[0.08]" />,
                    table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-xl border border-white/[0.08]">
                            <table className="w-full text-sm text-left">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-white/[0.04] text-white/70">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 font-medium border-b border-white/[0.08]">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-white/80 border-b border-white/[0.05]">{children}</td>
                    ),
                }}
            >
                {prepareCitations(content)}
            </ReactMarkdown>
        </div>
    );
}
