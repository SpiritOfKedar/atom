import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';
import { env } from './config/env';
import { logger } from './utils/logger';
import { ApiError } from './utils/apiError';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { apiLimiter, chatLimiter } from './middleware/rate-limit.middleware';

const app: Application = express();

// Middleware
app.use(cors({
    origin: env.corsOrigin,
    credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Request ID tracing
app.use(requestIdMiddleware);

// Rate Limiting
app.use('/api', apiLimiter);
app.use('/api/chat', chatLimiter);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`, 'HTTP');
    next();
});

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
    res.json({
        name: 'Atom Search API',
        version: '1.0.0',
        endpoints: {
            chat: 'POST /api/chat',
            health: 'GET /api/health',
        },
    });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

// Global Error Handler
app.use((err: Error | ApiError, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err.message, 'ErrorHandler', err);

    if (err instanceof ApiError) {
        res.status(err.statusCode).json({ error: err.message });
    } else {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default app;
