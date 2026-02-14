import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(env.mongodbUri);
        logger.info('MongoDB connected successfully', 'Database');
    } catch (error) {
        logger.error('MongoDB connection failed', 'Database', error as Error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected', 'Database');
});

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', 'Database', err);
});
