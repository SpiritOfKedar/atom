import axios from 'axios';
import { SearchResult } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

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
 * Performs a web search using Serper.dev (Google Search API).
 * Falls back to mock data if API key is not configured.
 */
export const searchWeb = async (query: string, numResults: number = 5): Promise<SearchResult[]> => {
    if (!env.serperApiKey) {
        logger.warn('SERPER_API_KEY not set, using mock search results', CONTEXT);
        return getMockResults(query);
    }

    try {
        logger.info(`Searching for: "${query}"`, CONTEXT);

        const response = await axios.post<SerperResponse>(
            SERPER_API_URL,
            { q: query, num: numResults },
            {
                headers: {
                    'X-API-KEY': env.serperApiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            }
        );

        const results: SearchResult[] = response.data.organic.slice(0, numResults).map((item) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            favicon: item.favicon || getFaviconUrl(item.link),
        }));

        logger.info(`Found ${results.length} search results`, CONTEXT);
        return results;
    } catch (error: any) {
        logger.error(`Search API failed: ${error.message}`, CONTEXT, error);
        // Fallback to mock on error
        return getMockResults(query);
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
const getMockResults = (query: string): SearchResult[] => {
    logger.debug(`Returning mock results for: "${query}"`, CONTEXT);
    return [
        {
            title: `Wikipedia - ${query}`,
            link: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`,
            snippet: `Learn about ${query} from Wikipedia, the free encyclopedia.`,
            favicon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico',
        },
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
