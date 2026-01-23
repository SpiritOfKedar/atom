import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const CONTEXT = 'QueryOptimizationService';

const openai = new OpenAI({
    apiKey: env.openaiApiKey,
});

/**
 * Cache entry for optimized queries.
 */
interface CacheEntry {
    optimizedQuery: string;
    timestamp: number;
}

/**
 * In-memory cache for optimized queries.
 * Key: hash of original query, Value: cache entry
 * TTL: 24 hours (86400000 ms)
 */
const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates a hash of the query for cache key.
 */
const hashQuery = (query: string): string => {
    return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
};

/**
 * Cleans up expired cache entries.
 */
const cleanupCache = (): void => {
    const now = Date.now();
    for (const [key, entry] of queryCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            queryCache.delete(key);
        }
    }
};

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
export const optimizeQuery = async (query: string): Promise<string> => {
    if (!query || query.trim().length === 0) {
        return query;
    }

    const trimmedQuery = query.trim();
    
    // Check cache first
    const cacheKey = hashQuery(trimmedQuery);
    const cached = queryCache.get(cacheKey);
    
    if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_TTL_MS) {
            logger.debug(`Cache hit for query: "${trimmedQuery.substring(0, 50)}..."`, CONTEXT);
            return cached.optimizedQuery;
        } else {
            // Expired, remove from cache
            queryCache.delete(cacheKey);
        }
    }

    // Cleanup old entries periodically (every 100 queries)
    if (queryCache.size > 0 && queryCache.size % 100 === 0) {
        cleanupCache();
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

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a search query optimization expert. Return only the improved query, no explanations.',
                },
                {
                    role: 'user',
                    content: optimizationPrompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 100,
        });

        const optimizedQuery = response.choices[0]?.message?.content?.trim() || trimmedQuery;

        // Validate: if LLM returned something very different or suspicious, use original
        if (optimizedQuery.length < trimmedQuery.length * 0.3 || optimizedQuery.length > trimmedQuery.length * 3) {
            logger.warn(
                `Optimized query seems invalid (length mismatch), using original`,
                CONTEXT
            );
            return trimmedQuery;
        }

        // Cache the result
        queryCache.set(cacheKey, {
            optimizedQuery,
            timestamp: Date.now(),
        });

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
    return Promise.all(queries.map(optimizeQuery));
};

/**
 * Clears the query optimization cache (useful for testing).
 */
export const clearCache = (): void => {
    queryCache.clear();
    logger.info('Query optimization cache cleared', CONTEXT);
};

/**
 * Gets cache statistics (useful for monitoring).
 */
export const getCacheStats = (): { size: number; maxAge: number } => {
    cleanupCache();
    const now = Date.now();
    let maxAge = 0;
    
    for (const entry of queryCache.values()) {
        const age = now - entry.timestamp;
        if (age > maxAge) {
            maxAge = age;
        }
    }
    
    return {
        size: queryCache.size,
        maxAge,
    };
};
