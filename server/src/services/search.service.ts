import axios from 'axios';
import { SearchResult, SearchType } from '../types';
import { env, isDev } from '../config/env';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { getCachedSearchResults, cacheSearchResults } from './cache.service';
import { retry } from '../utils/retry';

const SERPER_SEARCH_URL = 'https://google.serper.dev/search';
const SERPER_NEWS_URL = 'https://google.serper.dev/news';
const CONTEXT = 'SearchService';

interface SerperOrganicResult {
    title: string;
    link: string;
    snippet: string;
    favicon?: string;
}

interface SerperNewsResult {
    title: string;
    link: string;
    snippet?: string;
    source?: string;
    date?: string;
    imageUrl?: string;
}

interface SerperSearchResponse {
    organic?: SerperOrganicResult[];
}

interface SerperNewsResponse {
    news?: SerperNewsResult[];
}

/**
 * Builds search parameters based on search type.
 */
const buildSearchParams = (query: string, numResults: number, searchType: SearchType): Record<string, unknown> => {
    const baseParams: Record<string, unknown> = {
        q: query,
        num: numResults,
    };

    switch (searchType) {
        case 'news':
            // Prefer recent coverage without being so tight that Serper returns nothing.
            baseParams.tbs = 'qdr:m';
            break;
        case 'academic':
            baseParams.q = `${query} site:edu OR site:org OR site:gov OR site:ac.uk OR site:ac.za`;
            break;
        case 'web':
        default:
            break;
    }

    return baseParams;
};

const mapOrganicResults = (items: SerperOrganicResult[], numResults: number): SearchResult[] =>
    items.slice(0, numResults).map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        favicon: item.favicon || getFaviconUrl(item.link),
    }));

const mapNewsResults = (items: SerperNewsResult[], numResults: number): SearchResult[] =>
    items.slice(0, numResults).map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || (item.source ? `${item.source}${item.date ? ` · ${item.date}` : ''}` : item.title),
        favicon: getFaviconUrl(item.link),
    }));

const postSerper = async <T>(
    url: string,
    body: Record<string, unknown>
): Promise<T> => {
    const response = await retry(
        async () => {
            return await axios.post<T>(url, body, {
                headers: {
                    'X-API-KEY': env.serperApiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            });
        },
        {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 5000,
            backoffMultiplier: 2,
            retryableErrors: (error: any) => {
                if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                    return true;
                }
                if (error.response) {
                    const status = error.response.status;
                    return status >= 500 || status === 429;
                }
                return error.message?.includes('timeout') || false;
            },
        }
    );

    return response.data;
};

/**
 * Performs a web search using Serper.dev (Google Search API).
 * Supports different search types: web, news, academic.
 * News uses the dedicated /news endpoint, then falls back to web if empty.
 * Falls back to mock data if API key is not configured in development.
 */
export const searchWeb = async (
    query: string,
    numResults: number = 5,
    searchType: SearchType = 'web'
): Promise<SearchResult[]> => {
    const cacheKey = `${searchType}:${query}`;

    const cached = await getCachedSearchResults(cacheKey);
    if (cached && cached.length > 0) {
        logger.info(`Cache hit for ${searchType} search: "${query.substring(0, 50)}..."`, CONTEXT);
        return cached.slice(0, numResults);
    }

    if (!env.serperApiKey) {
        if (isDev) {
            logger.warn('SERPER_API_KEY not set, using mock search results', CONTEXT);
            const mockResults = getMockResults(query, searchType);
            await cacheSearchResults(cacheKey, mockResults);
            return mockResults;
        }
        throw ApiError.serviceUnavailable('Search service is not configured');
    }

    try {
        logger.info(`Searching (${searchType}) for: "${query}"`, CONTEXT);

        let results: SearchResult[] = [];

        if (searchType === 'news') {
            const newsBody = buildSearchParams(query, numResults, 'news');
            const newsData = await postSerper<SerperNewsResponse>(SERPER_NEWS_URL, newsBody);
            results = mapNewsResults(newsData.news || [], numResults);

            if (results.length === 0) {
                logger.warn(
                    `News search returned 0 results, falling back to web search for: "${query.substring(0, 50)}..."`,
                    CONTEXT
                );
                const webData = await postSerper<SerperSearchResponse>(
                    SERPER_SEARCH_URL,
                    buildSearchParams(query, numResults, 'web')
                );
                results = mapOrganicResults(webData.organic || [], numResults);
            }
        } else {
            const searchParams = buildSearchParams(query, numResults, searchType);
            const data = await postSerper<SerperSearchResponse>(SERPER_SEARCH_URL, searchParams);
            results = mapOrganicResults(data.organic || [], numResults);

            // Academic site-filtering can be too narrow — retry plain web once.
            if (results.length === 0 && searchType === 'academic') {
                logger.warn(
                    `Academic search returned 0 results, falling back to web search for: "${query.substring(0, 50)}..."`,
                    CONTEXT
                );
                const webData = await postSerper<SerperSearchResponse>(
                    SERPER_SEARCH_URL,
                    buildSearchParams(query, numResults, 'web')
                );
                results = mapOrganicResults(webData.organic || [], numResults);
            }
        }

        if (results.length > 0) {
            await cacheSearchResults(cacheKey, results);
        }

        logger.info(`Found ${results.length} ${searchType} search results`, CONTEXT);
        return results;
    } catch (error: any) {
        logger.error(`Search API failed after retries: ${error.message}`, CONTEXT, error);
        if (isDev) {
            return getMockResults(query, searchType);
        }
        throw ApiError.serviceUnavailable('Search service is temporarily unavailable');
    }
};

/**
 * Extracts favicon URL from a given page URL.
 */
const getFaviconUrl = (url: string): string => {
    try {
        const { origin } = new URL(url);
        return `${origin}/favicon.ico`;
    } catch {
        return '';
    }
};

/**
 * Returns mock search results for development/testing.
 */
const getMockResults = (query: string, searchType: SearchType = 'web'): SearchResult[] => {
    logger.debug(`Returning mock ${searchType} results for: "${query}"`, CONTEXT);

    const baseResults: SearchResult[] = [
        {
            title: `Wikipedia - ${query}`,
            link: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`,
            snippet: `Learn about ${query} from Wikipedia, the free encyclopedia.`,
            favicon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico',
        },
    ];

    if (searchType === 'news') {
        return [
            ...baseResults,
            {
                title: `${query} - Breaking News`,
                link: 'https://news.example.com/breaking',
                snippet: `Latest breaking news about ${query}.`,
                favicon: 'https://news.example.com/favicon.ico',
            },
            {
                title: `${query} - Recent Updates`,
                link: 'https://news.example.com/recent',
                snippet: `Recent news and updates about ${query}.`,
                favicon: 'https://news.example.com/favicon.ico',
            },
        ];
    } else if (searchType === 'academic') {
        return [
            ...baseResults,
            {
                title: `${query} - Research Paper`,
                link: 'https://scholar.example.edu/paper',
                snippet: `Academic research paper about ${query}.`,
                favicon: 'https://scholar.example.edu/favicon.ico',
            },
            {
                title: `${query} - Academic Study`,
                link: 'https://university.example.edu/study',
                snippet: `Academic study and analysis of ${query}.`,
                favicon: 'https://university.example.edu/favicon.ico',
            },
        ];
    }

    return [
        ...baseResults,
        {
            title: `Understanding ${query} - Complete Guide`,
            link: 'https://example.com/guide',
            snippet: `A comprehensive guide to understanding ${query} and its applications.`,
            favicon: 'https://example.com/favicon.ico',
        },
        {
            title: `${query} - Latest News and Updates`,
            link: 'https://news.example.com/topic',
            snippet: `Stay updated with the latest news about ${query}.`,
            favicon: 'https://news.example.com/favicon.ico',
        },
        {
            title: `${query} explained simply`,
            link: 'https://explained.example.com',
            snippet: `Simple explanations and tutorials about ${query} for beginners.`,
            favicon: 'https://explained.example.com/favicon.ico',
        },
    ];
};
