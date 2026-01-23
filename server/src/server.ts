import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
    try {
        await connectDB();

        app.listen(env.port, () => {
            logger.info(`🚀 Server running on http://localhost:${env.port}`, 'Server');
            logger.info(`📡 Environment: ${env.nodeEnv}`, 'Server');
            logger.info(`🔗 CORS Origin: ${env.corsOrigin}`, 'Server');

            if (!env.serperApiKey) {
                logger.warn('SERPER_API_KEY not set - using mock search results', 'Server');
            }
        });
    } catch (error) {
        logger.error('Failed to start server', 'Server', error as Error);
        process.exit(1);
    }
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason: Error) => {
    logger.error(`Unhandled Rejection: ${reason.message}`, 'Process', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught Exception: ${error.message}`, 'Process', error);
    process.exit(1);
});

startServer();
