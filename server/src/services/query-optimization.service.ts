import { logger } from '../utils/logger';
import { getCachedOptimizedQuery, cacheOptimizedQuery } from './cache.service';
import { ModelProvider, SearchType } from '../types';
import { completeText } from './llm.service';

const CONTEXT = 'QueryOptimizationService';

/**
 * Optimizes a search query using LLM to improve search results.
 * 
 * The LLM will:
 * - Expand ambiguous queries with context
 * - Add relevant keywords
 * - Improve query structure for search engines
 * - Handle abbreviations and acronyms
 * 
 * @param query - Original user query
 * @returns Optimized query string
 */
export const optimizeQuery = async (
    query: string,
    provider: ModelProvider = 'openai'
): Promise<string> => {
    if (!query || query.trim().length === 0) {
        return query;
    }

    const trimmedQuery = query.trim();
    
    // Check cache first (Redis with in-memory fallback)
    const cachedOptimized = await getCachedOptimizedQuery(trimmedQuery);
    if (cachedOptimized) {
        logger.debug(`Cache hit for query: "${trimmedQuery.substring(0, 50)}..."`, CONTEXT);
        return cachedOptimized;
    }

    logger.info(`Optimizing query: "${trimmedQuery.substring(0, 50)}..."`, CONTEXT);

    try {
        const optimizationPrompt = `You are a search query optimization expert. Your task is to improve search queries to get better, more relevant results from search engines.

Given a user's search query, generate an improved version that:
1. Adds relevant context and keywords that would help find better results
2. Clarifies ambiguous terms
3. Expands abbreviations and acronyms when helpful
4. Maintains the original intent and meaning
5. Is optimized for web search engines (not conversational)

IMPORTANT RULES:
- Return ONLY the improved query, nothing else
- Do not add quotes around the query
- Do not add explanations or commentary
- Keep it concise (prefer 5-15 words)
- If the query is already optimal, return it unchanged or with minimal improvements

Original query: "${trimmedQuery}"

Improved query:`;

        const response = await completeText({
            provider,
            systemPrompt: 'You are a search query optimization expert. Return only the improved query, no explanations.',
            userPrompt: optimizationPrompt,
            temperature: 0.3,
            maxTokens: 100,
        });

        const optimizedQuery = response.text || trimmedQuery;

        // Validate: if LLM returned something very different or suspicious, use original
        if (optimizedQuery.length < trimmedQuery.length * 0.3 || optimizedQuery.length > trimmedQuery.length * 3) {
            logger.warn(
                `Optimized query seems invalid (length mismatch), using original`,
                CONTEXT
            );
            return trimmedQuery;
        }

        // Cache the result
        await cacheOptimizedQuery(trimmedQuery, optimizedQuery);

        logger.info(
            `Query optimized: "${trimmedQuery.substring(0, 40)}..." -> "${optimizedQuery.substring(0, 40)}..."`,
            CONTEXT
        );

        return optimizedQuery;

    } catch (error: any) {
        logger.error(`Query optimization failed: ${error.message}`, CONTEXT, error);
        // Fallback to original query on error
        return trimmedQuery;
    }
};

/**
 * Optimizes multiple queries in parallel (for future use).
 */
export const optimizeQueries = async (queries: string[]): Promise<string[]> => {
    return Promise.all(queries.map((query) => optimizeQuery(query)));
};

/**
 * Suggests an appropriate search type based on the query.
 * Uses simple heuristics to determine if query is news-related, academic, or general web.
 */
export const suggestSearchType = (query: string): SearchType => {
    const queryLower = query.toLowerCase();
    
    // News-related keywords
    const currentYear = new Date().getFullYear();
    const newsKeywords = [
        'news', 'latest', 'recent', 'breaking', 'update', 'announcement',
        'today', 'yesterday', 'this week', 'this month', String(currentYear), String(currentYear - 1),
        'happened', 'occurred', 'reported', 'published'
    ];
    
    // Academic/research keywords
    const academicKeywords = [
        'research', 'study', 'paper', 'thesis', 'dissertation', 'analysis',
        'academic', 'scholar', 'university', 'journal', 'publication',
        'methodology', 'findings', 'hypothesis', 'theory', 'experiment'
    ];
    
    const hasNewsKeywords = newsKeywords.some(keyword => queryLower.includes(keyword));
    const hasAcademicKeywords = academicKeywords.some(keyword => queryLower.includes(keyword));
    
    if (hasNewsKeywords && !hasAcademicKeywords) {
        return 'news';
    } else if (hasAcademicKeywords) {
        return 'academic';
    }
    
    return 'web'; // Default
};
