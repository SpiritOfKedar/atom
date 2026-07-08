import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { env, isProd } from '../config/env';
import {
    guestLimitMessage,
    incrementGuestUsage,
    isGuestLimitExceeded,
} from '../services/guest-quota.service';
import { logger } from '../utils/logger';

const CONTEXT = 'GuestQuotaMiddleware';

/**
 * Enforces auth or guest message limits for chat.
 * Must run after optionalAuth so req.userId is set when authenticated.
 */
export const enforceGuestQuota = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (req.userId) {
        return next();
    }

    if (env.requireAuthForChat && isProd) {
        res.status(401).json({ error: 'Authentication required to use chat' });
        return;
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
        if (await isGuestLimitExceeded(clientIp)) {
            logger.warn(`Guest limit exceeded for IP: ${clientIp}`, CONTEXT);
            res.status(429).json({ error: guestLimitMessage() });
            return;
        }

        await incrementGuestUsage(clientIp);
        next();
    } catch (error) {
        logger.error('Guest quota check failed', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};
