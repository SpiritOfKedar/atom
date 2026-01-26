import { Queue, QueueEvents } from 'bullmq';
import { getQueueConnection } from '../config/queue';
import { logger } from '../utils/logger';

const CONTEXT = 'ScraperQueue';
const QUEUE_NAME = 'scraper';

const connection = getQueueConnection();

export const scrapeQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 3600, // Keep for 1 hour
            count: 1000,
        },
        removeOnFail: {
            age: 24 * 3600, // Keep for 24 hours
        },
    },
});

export const scrapeQueueEvents = new QueueEvents(QUEUE_NAME, { connection });

scrapeQueue.on('error', (err) => {
    logger.error(`Queue error: ${err.message}`, CONTEXT, err);
});

export const addScrapeJob = async (urls: string[]) => {
    logger.info(`Adding scrape job for ${urls.length} URLs`, CONTEXT);
    return await scrapeQueue.add('scrape-urls', { urls });
};
