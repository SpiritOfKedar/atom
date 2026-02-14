import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const clerkClient = createClerkClient({
    secretKey: env.clerkSecretKey
});

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization token required' });
            return;
        }

        const token = authHeader.split(' ')[1];

        const payload = await verifyToken(token, {
            secretKey: env.clerkSecretKey!,
        });

        req.userId = payload.sub;
        next();
    } catch (error) {
        logger.error('Auth verification failed', 'AuthMiddleware', error as Error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = await verifyToken(token, {
                secretKey: env.clerkSecretKey!,
            });
            req.userId = payload.sub;
        }

        next();
    } catch (error) {
        next();
    }
};
