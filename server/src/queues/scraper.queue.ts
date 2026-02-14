import { Queue, QueueEvents } from 'bullmq';
import { getQueueConnection } from '../config/queue';
import { scrapeMultiple } from '../services/scrape.service';
import { logger } from '../utils/logger';

const CONTEXT = 'ScraperQueue';
const QUEUE_NAME = 'scraper';

let scrapeQueue: Queue | null = null;
let _scrapeQueueEvents: QueueEvents | null = null;
let queueAvailable = false;

/**
 * Lazily initializes BullMQ queue and events.
 * Returns false if Redis/BullMQ is unavailable.
 */
const ensureQueue = (): boolean => {
    if (queueAvailable && scrapeQueue) return true;

    try {
        const connection = getQueueConnection();

        scrapeQueue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: {
                    age: 3600,
                    count: 1000,
                },
                removeOnFail: {
                    age: 24 * 3600,
                },
            },
        });

        _scrapeQueueEvents = new QueueEvents(QUEUE_NAME, { connection });

        scrapeQueue.on('error', (err) => {
            logger.error(`Queue error: ${err.message}`, CONTEXT, err);
            queueAvailable = false;
        });

        queueAvailable = true;
        return true;
    } catch (err: any) {
        logger.warn(`BullMQ queue init failed: ${err.message}, will use direct scraping`, CONTEXT);
        queueAvailable = false;
        return false;
    }
};

/**
 * Adds a scrape job to the BullMQ queue, or falls back to direct scraping
 * if Redis/BullMQ is unavailable.
 *
 * Returns a job-like object whose `waitUntilFinished` resolves with scraped content.
 */
export const addScrapeJob = async (urls: string[]) => {
    if (ensureQueue() && scrapeQueue && _scrapeQueueEvents) {
        try {
            logger.info(`Adding scrape job for ${urls.length} URLs via BullMQ`, CONTEXT);
            const job = await scrapeQueue.add('scrape-urls', { urls });
            return {
                waitUntilFinished: (qe: QueueEvents) => job.waitUntilFinished(qe),
            };
        } catch (err: any) {
            logger.warn(`BullMQ add failed: ${err.message}, falling back to direct scraping`, CONTEXT);
            queueAvailable = false;
        }
    }

    // Direct fallback — no Redis needed
    logger.info(`Scraping ${urls.length} URLs directly (no queue)`, CONTEXT);
    const results = await scrapeMultiple(urls);
    return {
        waitUntilFinished: async () => results,
    };
};

/**
 * Returns the QueueEvents instance (may be null if queue unavailable).
 * The RAG pipeline calls `job.waitUntilFinished(scrapeQueueEvents)`.
 * When we fall back to direct scraping, waitUntilFinished ignores this argument.
 */
export const scrapeQueueEvents: QueueEvents = new Proxy({} as QueueEvents, {
    get(_target, _prop) {
        // Return the real QueueEvents if available, otherwise a no-op
        if (_scrapeQueueEvents) {
            return (_scrapeQueueEvents as any)[_prop];
        }
        return undefined;
    },
});
