import crypto from 'crypto';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redis';

const CONTEXT = 'CacheService';

/**
 * Cache entry interface.
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

/**
 * In-memory cache fallback (used when Redis is not available).
 */
const memoryCache = new Map<string, CacheEntry<any>>();
const MAX_MEMORY_CACHE_SIZE = 500;

/**
 * Generates a cache key from a string.
 */
const generateKey = (prefix: string, value: string): string => {
    const hash = crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
    return `${prefix}:${hash}`;
};

/**
 * Gets a value from cache (Redis or memory).
 */
export const get = async <T>(key: string): Promise<T | null> => {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            const cached = await redis.get(key);
            if (cached) {
                logger.debug(`Cache hit (Redis): ${key.substring(0, 50)}`, CONTEXT);
                return JSON.parse(cached);
            }
        } catch (error: any) {
            logger.warn(`Redis get failed: ${error.message}, falling back to memory`, CONTEXT);
        }
    }
    
    // Fallback to memory cache
    const entry = memoryCache.get(key);
    if (entry) {
        const age = Date.now() - entry.timestamp;
        if (age < entry.ttl) {
            logger.debug(`Cache hit (memory): ${key.substring(0, 50)}`, CONTEXT);
            return entry.data;
        } else {
            // Expired, remove it
            memoryCache.delete(key);
        }
    }
    
    return null;
};

/**
 * Sets a value in cache (Redis or memory).
 */
export const set = async <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
            logger.debug(`Cache set (Redis): ${key.substring(0, 50)}, TTL: ${ttlSeconds}s`, CONTEXT);
            return;
        } catch (error: any) {
            logger.warn(`Redis set failed: ${error.message}, falling back to memory`, CONTEXT);
        }
    }
    
    // Fallback to memory cache
    memoryCache.set(key, {
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000,
    });
    
    // Cleanup expired entries and enforce max size
    if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
        cleanupMemoryCache();
        // If still over limit after cleanup, evict oldest entries
        if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
            const entriesToRemove = memoryCache.size - MAX_MEMORY_CACHE_SIZE;
            const iterator = memoryCache.keys();
            for (let i = 0; i < entriesToRemove; i++) {
                const key = iterator.next().value;
                if (key) memoryCache.delete(key);
            }
        }
    }
};

/**
 * Deletes a value from cache.
 */
export const del = async (key: string): Promise<void> => {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            await redis.del(key);
            return;
        } catch (error: any) {
            logger.warn(`Redis del failed: ${error.message}`, CONTEXT);
        }
    }
    
    memoryCache.delete(key);
};

/**
 * Cleans up expired entries from memory cache.
 */
const cleanupMemoryCache = (): void => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
        const age = now - entry.timestamp;
        if (age >= entry.ttl) {
            memoryCache.delete(key);
        }
    }
};

/**
 * Cache search results.
 */
export const cacheSearchResults = async (query: string, results: any[]): Promise<void> => {
    const key = generateKey('search', query);
    const ttl = parseInt(process.env.CACHE_TTL_SEARCH || '3600', 10); // 1 hour default
    await set(key, results, ttl);
};

/**
 * Get cached search results.
 */
export const getCachedSearchResults = async (query: string): Promise<any[] | null> => {
    const key = generateKey('search', query);
    return await get<any[]>(key);
};

/**
 * Cache scraped content.
 */
export const cacheScrapedContent = async (url: string, content: any): Promise<void> => {
    const key = generateKey('scrape', url);
    const ttl = parseInt(process.env.CACHE_TTL_SCRAPE || '21600', 10); // 6 hours default
    await set(key, content, ttl);
};

/**
 * Get cached scraped content.
 */
export const getCachedScrapedContent = async (url: string): Promise<any | null> => {
    const key = generateKey('scrape', url);
    return await get<any>(key);
};

/**
 * Cache optimized query.
 */
export const cacheOptimizedQuery = async (originalQuery: string, optimizedQuery: string): Promise<void> => {
    const key = generateKey('query', originalQuery);
    const ttl = parseInt(process.env.CACHE_TTL_QUERY || '86400', 10); // 24 hours default
    await set(key, optimizedQuery, ttl);
};

/**
 * Get cached optimized query.
 */
export const getCachedOptimizedQuery = async (originalQuery: string): Promise<string | null> => {
    const key = generateKey('query', originalQuery);
    return await get<string>(key);
};

/**
 * Cache final answer.
 */
export const cacheAnswer = async (query: string, answer: string, sources: any[]): Promise<void> => {
    const key = generateKey('answer', query);
    const ttl = parseInt(process.env.CACHE_TTL_ANSWER || '3600', 10); // 1 hour default
    await set(key, { answer, sources }, ttl);
};

/**
 * Get cached answer.
 */
export const getCachedAnswer = async (query: string): Promise<{ answer: string; sources: any[] } | null> => {
    const key = generateKey('answer', query);
    return await get<{ answer: string; sources: any[] }>(key);
};

/**
 * Get cache statistics.
 */
export const getCacheStats = async (): Promise<{
    type: 'redis' | 'memory';
    size: number;
}> => {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            const info = await redis.info('keyspace');
            return {
                type: 'redis',
                size: memoryCache.size, // Approximate
            };
        } catch {
            // Fall through to memory stats
        }
    }
    
    cleanupMemoryCache();
    return {
        type: 'memory',
        size: memoryCache.size,
    };
};
