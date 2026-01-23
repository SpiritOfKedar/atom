export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    favicon?: string;
}

export interface ScrapedContent {
    url: string;
    title: string;
    content: string;
    success: boolean;
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
