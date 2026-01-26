import { ConnectionOptions } from 'bullmq';
import { logger } from '../utils/logger';

const CONTEXT = 'QueueConfig';

export const getQueueConnection = (): ConnectionOptions => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            username: url.username || undefined,
        };
    } catch (error: any) {
        logger.error(`Invalid REDIS_URL: ${error.message}`, CONTEXT);
        return {
            host: 'localhost',
            port: 6379,
        };
    }
};
