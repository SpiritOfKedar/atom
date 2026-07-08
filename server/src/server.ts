import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './utils/logger';
import { initRedis, closeRedis } from './config/redis';
import { initScraperWorker, closeScraperWorker } from './workers/scraper.worker';

let httpServer: http.Server | null = null;

const startServer = async (): Promise<void> => {
    try {
        await connectDB();
        await initRedis();
        initScraperWorker();

        httpServer = app.listen(env.port, (err?: Error) => {
            if (err) {
                logger.error(`Failed to bind to port ${env.port}: ${err.message}`, 'Server', err);
                process.exit(1);
            }

            logger.info(`🚀 Server running on port ${env.port}`, 'Server');
            logger.info(`📡 Environment: ${env.nodeEnv}`, 'Server');
            logger.info(`🔗 CORS Origin: ${env.corsOrigin}`, 'Server');

            if (!env.serperApiKey && env.nodeEnv === 'development') {
                logger.warn('SERPER_API_KEY not set - using mock search results in development', 'Server');
            }
        });
    } catch (error) {
        logger.error('Failed to start server', 'Server', error as Error);
        process.exit(1);
    }
};

const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`, 'Server');

    const forceExit = setTimeout(() => {
        logger.error('Forced shutdown after timeout', 'Server');
        process.exit(1);
    }, 10000);

    try {
        if (httpServer) {
            await new Promise<void>((resolve, reject) => {
                httpServer!.close((err) => (err ? reject(err) : resolve()));
            });
        }
        await closeScraperWorker();
        await closeRedis();
        await disconnectDB();
        clearTimeout(forceExit);
        logger.info('Shutdown complete', 'Server');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown', 'Server', error as Error);
        clearTimeout(forceExit);
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error) => {
    logger.error(`Unhandled Rejection: ${reason.message}`, 'Process', reason);
});

process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught Exception: ${error.message}`, 'Process', error);
    process.exit(1);
});

startServer();
