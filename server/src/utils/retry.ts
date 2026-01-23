import { logger } from './logger';

const CONTEXT = 'RetryUtil';

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors?: (error: any) => boolean;
}

/**
 * Default retry options.
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
};

/**
 * Calculates delay for exponential backoff.
 */
const calculateDelay = (attempt: number, options: RetryOptions): number => {
    const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    return Math.min(delay, options.maxDelayMs);
};

/**
 * Checks if an error is retryable.
 */
const isRetryableError = (error: any, options: RetryOptions): boolean => {
    // Network errors, timeouts, and 5xx errors are retryable
    if (options.retryableErrors) {
        return options.retryableErrors(error);
    }

    // Default: retry on network errors, timeouts, and 5xx status codes
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
    }

    if (error.response) {
        const status = error.response.status;
        // Retry on 5xx errors and 429 (rate limit)
        return status >= 500 || status === 429;
    }

    // Retry on timeout errors
    if (error.message && error.message.includes('timeout')) {
        return true;
    }

    return false;
};

/**
 * Retries an async function with exponential backoff.
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export const retry = async <T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> => {
    const retryOptions: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry if error is not retryable
            if (!isRetryableError(error, retryOptions)) {
                logger.debug(
                    `Error not retryable: ${error.message}, stopping retries`,
                    CONTEXT
                );
                throw error;
            }

            // Don't retry on last attempt
            if (attempt >= retryOptions.maxAttempts) {
                logger.warn(
                    `Max retry attempts (${retryOptions.maxAttempts}) reached for error: ${error.message}`,
                    CONTEXT
                );
                break;
            }

            const delay = calculateDelay(attempt, retryOptions);
            logger.debug(
                `Retry attempt ${attempt}/${retryOptions.maxAttempts} after ${delay}ms. Error: ${error.message}`,
                CONTEXT
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};

/**
 * Retries multiple operations in parallel, continuing with successful ones.
 * Useful for scraping multiple URLs where some may fail.
 * 
 * @param items - Array of items to process
 * @param fn - Function to execute for each item
 * @param options - Retry options per item
 * @returns Array of results (successful) and errors (failed)
 */
export const retryMultiple = async <T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    options: Partial<RetryOptions> = {}
): Promise<Array<{ item: T; result?: R; error?: any }>> => {
    const results = await Promise.allSettled(
        items.map(async (item) => {
            try {
                const result = await retry(() => fn(item), options);
                return { item, result };
            } catch (error: any) {
                return { item, error };
            }
        })
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return { item: items[index], error: result.reason };
    });
};
