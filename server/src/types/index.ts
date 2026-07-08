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
 * NVIDIA NIM models (OpenAI-compatible via integrate.api.nvidia.com).
 */
export const NVAPI_MODELS = [
    'mistralai/mistral-medium-3.5-128b',
    'z-ai/glm-5.2',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'minimaxai/minimax-m3',
    'deepseek-ai/deepseek-v4-pro',
    'deepseek-ai/deepseek-v4-flash',
] as const;

export type NvapiModel = (typeof NVAPI_MODELS)[number];

/**
 * Supported LLM providers / models for search answer generation.
 * Classic providers map to a fixed model; nvapi values are NIM model IDs.
 */
export type ModelProvider = 'openai' | 'claude' | 'gemini' | NvapiModel;

export const isNvapiModel = (provider: string): provider is NvapiModel =>
    (NVAPI_MODELS as readonly string[]).includes(provider);

/**
 * Extended chat request with optional search type.
 */
export interface ExtendedChatRequest extends ChatRequest {
    searchType?: SearchType;
    conversationId?: string;
    answerStyle?: AnswerStyle;
    modelProvider?: ModelProvider;
}
