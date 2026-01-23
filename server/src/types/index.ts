export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    favicon?: string;
    publishedDate?: Date;
    author?: string;
    category?: 'news' | 'academic' | 'blog' | 'forum' | 'other';
    readingTime?: number; // minutes
}

export interface ScrapedContent {
    url: string;
    title: string;
    content: string;
    success: boolean;
    publishedDate?: Date;
    author?: string;
    category?: 'news' | 'academic' | 'blog' | 'forum' | 'other';
    readingTime?: number; // minutes
}

export interface RAGContext {
    index: number;
    title: string;
    url: string;
    content: string;
}

export interface ChatRequest {
    query: string;
}

export interface StreamChunk {
    type: 'sources' | 'token' | 'error' | 'status';
    data: any;
}

export interface RankedSource extends SearchResult {
    relevanceScore: number;
    freshnessScore: number;
    authorityScore: number;
    totalScore: number;
    scrapedContent?: string;
}

/**
 * Search type options for different search strategies.
 */
export type SearchType = 'web' | 'news' | 'academic';

/**
 * Answer style options for different response formats.
 */
export type AnswerStyle = 'concise' | 'detailed' | 'bullet-points';

/**
 * Extended chat request with optional search type.
 */
export interface ExtendedChatRequest extends ChatRequest {
    searchType?: SearchType;
    conversationId?: string;
    answerStyle?: AnswerStyle;
}
