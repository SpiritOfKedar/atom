import { Worker, Job } from 'bullmq';
import { getQueueConnection } from '../config/queue';
import { scrapeMultiple } from '../services/scrape.service';
import { logger } from '../utils/logger';

const CONTEXT = 'ScraperWorker';
const QUEUE_NAME = 'scraper';

const processor = async (job: Job) => {
    const { urls } = job.data;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw new Error('Invalid job data: urls array is required');
    }

    logger.info(`Processing scrape job ${job.id} for ${urls.length} URLs`, CONTEXT);

    try {
        const results = await scrapeMultiple(urls);
        logger.info(`Scrape job ${job.id} completed. Scraped ${results.length} pages.`, CONTEXT);
        return results;
    } catch (error: any) {
        logger.error(`Scrape job ${job.id} failed: ${error.message}`, CONTEXT, error);
        throw error;
    }
};

let worker: Worker | null = null;

export const initScraperWorker = () => {
    if (worker) return worker;

    const connection = getQueueConnection();

    worker = new Worker(QUEUE_NAME, processor, {
        connection,
        concurrency: 5, // Process up to 5 jobs concurrently
    });

    worker.on('completed', (job) => {
        logger.debug(`Job ${job.id} completed`, CONTEXT);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed: ${err.message}`, CONTEXT);
    });

    logger.info('Scraper worker initialized', CONTEXT);
    return worker;
};
