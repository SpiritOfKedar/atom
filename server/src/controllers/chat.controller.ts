import { Request, Response } from 'express';
import { runRAGPipeline } from '../services/rag.service';
import { ChatRequest } from '../types';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

const CONTEXT = 'ChatController';

/**
 * Handles POST /api/chat
 * Runs the RAG pipeline and streams the response.
 */
export const handleChat = async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body as ChatRequest;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required and must be a non-empty string' });
        return;
    }

    const sanitizedQuery = query.trim().substring(0, 500); // Limit query length
    logger.info(`Received chat request: "${sanitizedQuery.substring(0, 50)}..."`, CONTEXT);

    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Handle client disconnect
    req.on('close', () => {
        logger.debug('Client disconnected', CONTEXT);
    });

    try {
        await runRAGPipeline(sanitizedQuery, res);
        res.end();
    } catch (error: any) {
        logger.error(`Pipeline error: ${error.message}`, CONTEXT, error);

        // Try to send error if headers not yet flushed completely
        try {
            res.write(JSON.stringify({
                type: 'error',
                data: error.message || 'An unexpected error occurred'
            }) + '\n');
        } catch {
            // Response already closed
        }
        res.end();
    }
};

/**
 * Health check endpoint
 */
export const healthCheck = (_req: Request, res: Response): void => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'atom-search-api',
    });
};
