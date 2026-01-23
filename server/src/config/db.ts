import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/atom';

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGODB_URI);
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
