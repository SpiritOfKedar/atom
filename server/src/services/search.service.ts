import axios from 'axios';
import { SearchResult, SearchType } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getCachedSearchResults, cacheSearchResults } from './cache.service';
import { retry } from '../utils/retry';

const SERPER_API_URL = 'https://google.serper.dev/search';
const CONTEXT = 'SearchService';

interface SerperOrganicResult {
    title: string;
    link: string;
    snippet: string;
    favicon?: string;
}

interface SerperResponse {
    organic: SerperOrganicResult[];
}

/**
 * Builds search parameters based on search type.
 */
const buildSearchParams = (query: string, numResults: number, searchType: SearchType): any => {
    const baseParams: any = {
        q: query,
        num: numResults,
    };

    // Add type-specific parameters
    switch (searchType) {
        case 'news':
            // For news, we can add time-based filters or news-specific parameters
            baseParams.tbs = 'qdr:w'; // Past week
            break;
        case 'academic':
            // For academic searches, we can add site restrictions or academic domains
            // Note: Serper API doesn't have direct academic search, but we can filter results
            baseParams.q = `${query} site:edu OR site:org OR site:gov OR site:ac.uk OR site:ac.za`;
            break;
        case 'web':
        default:
            // Default web search, no additional params needed
            break;
    }

    return baseParams;
};

/**
 * Performs a web search using Serper.dev (Google Search API).
 * Supports different search types: web, news, academic.
 * Falls back to mock data if API key is not configured.
 */
export const searchWeb = async (
    query: string,
    numResults: number = 5,
    searchType: SearchType = 'web'
): Promise<SearchResult[]> => {
    // Create cache key that includes search type
    const cacheKey = `${searchType}:${query}`;
    
    // Check cache first
    const cached = await getCachedSearchResults(cacheKey);
    if (cached && cached.length > 0) {
        logger.info(`Cache hit for ${searchType} search: "${query.substring(0, 50)}..."`, CONTEXT);
        return cached.slice(0, numResults);
    }

    if (!env.serperApiKey) {
        logger.warn('SERPER_API_KEY not set, using mock search results', CONTEXT);
        const mockResults = getMockResults(query, searchType);
        await cacheSearchResults(cacheKey, mockResults);
        return mockResults;
    }

    try {
        logger.info(`Searching (${searchType}) for: "${query}"`, CONTEXT);

        const searchParams = buildSearchParams(query, numResults, searchType);

        // Retry search API call with exponential backoff
        const response = await retry(
            async () => {
                return await axios.post<SerperResponse>(
                    SERPER_API_URL,
                    searchParams,
                    {
                        headers: {
                            'X-API-KEY': env.serperApiKey,
                            'Content-Type': 'application/json',
                        },
                        timeout: 5000,
                    }
                );
            },
            {
                maxAttempts: 3,
                initialDelayMs: 1000,
                maxDelayMs: 5000,
                backoffMultiplier: 2,
                retryableErrors: (error: any) => {
                    // Retry on network errors, timeouts, and 5xx/429 status codes
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

        const results: SearchResult[] = response.data.organic.slice(0, numResults).map((item) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            favicon: item.favicon || getFaviconUrl(item.link),
        }));

        // Cache results with search type in key
        await cacheSearchResults(cacheKey, results);

        logger.info(`Found ${results.length} ${searchType} search results`, CONTEXT);
        return results;
    } catch (error: any) {
        logger.error(`Search API failed after retries: ${error.message}`, CONTEXT, error);
        // Fallback to mock on error
        return getMockResults(query, searchType);
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

    // Default web results
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
