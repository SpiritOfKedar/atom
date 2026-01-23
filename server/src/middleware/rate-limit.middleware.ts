import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

const CONTEXT = 'RateLimit';

/**
 * Rate limiter for standard API requests.
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 requests per window
    message: {
        error: 'Too many requests from this IP, please try again after a minute'
    },
    handler: (req: Request, res: Response, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`, CONTEXT);
        res.status(options.statusCode).send(options.message);
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Stricter rate limiter for chat/search requests.
 */
export const chatLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Limit each IP to 100 chat requests per hour
    message: {
        error: 'Hourly chat limit exceeded, please try again later'
    },
    handler: (req: Request, res: Response, next, options) => {
        logger.warn(`Chat rate limit exceeded for IP: ${req.ip}`, CONTEXT);
        res.status(options.statusCode).send(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false,
});
