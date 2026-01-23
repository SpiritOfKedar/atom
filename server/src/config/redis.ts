import { logger } from '../utils/logger';

const CONTEXT = 'RedisConfig';

let Redis: any = null;
let redisClient: any = null;

/**
 * Attempts to initialize Redis client.
 * Returns null if Redis is not available (graceful degradation).
 */
export const initRedis = async (): Promise<any> => {
    if (redisClient) {
        return redisClient;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        logger.info('REDIS_URL not set, using in-memory cache', CONTEXT);
        return null;
    }

    try {
        // Dynamic import to avoid requiring ioredis if not installed
        Redis = require('ioredis');
        
        redisClient = new Redis(redisUrl, {
            retryStrategy: (times: number) => {
                if (times > 3) {
                    logger.warn('Redis connection failed after 3 retries, using in-memory cache', CONTEXT);
                    return null; // Stop retrying
                }
                return Math.min(times * 50, 2000);
            },
            maxRetriesPerRequest: 2,
        });

        redisClient.on('error', (err: Error) => {
            logger.error(`Redis error: ${err.message}`, CONTEXT, err);
        });

        redisClient.on('connect', () => {
            logger.info('Redis connected successfully', CONTEXT);
        });

        // Test connection
        await redisClient.ping();
        logger.info('Redis initialized successfully', CONTEXT);
        
        return redisClient;
    } catch (error: any) {
        logger.warn(`Redis initialization failed: ${error.message}, using in-memory cache`, CONTEXT);
        return null;
    }
};

/**
 * Gets the Redis client if available, null otherwise.
 */
export const getRedisClient = (): any => {
    return redisClient;
};

/**
 * Closes Redis connection.
 */
export const closeRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info('Redis connection closed', CONTEXT);
    }
};
