import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Storage for request ID that can be accessed anywhere in the call chain
export const requestContext = new AsyncLocalStorage<string>();

/**
 * Middleware that adds a unique request ID to each request.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Set in response headers
    res.setHeader('x-request-id', requestId);

    // Attach to request object for express use
    (req as any).requestId = requestId;

    // Run the rest of the request within the context
    requestContext.run(requestId, () => {
        next();
    });
};

/**
 * Helper to get the current request ID from anywhere.
 */
export const getRequestId = (): string | undefined => {
    return requestContext.getStore();
};
