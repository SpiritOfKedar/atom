import { getRedisClient } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const CONTEXT = 'GuestQuota';
const GUEST_KEY_PREFIX = 'guest:';
const GUEST_TTL_SECONDS = 24 * 60 * 60;

interface MemoryEntry {
    count: number;
    resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

const getClientIp = (ip: string | undefined): string => {
    return ip || 'unknown';
};

/**
 * Returns current guest usage count for an IP (0 if none).
 */
export const getGuestUsage = async (ip: string): Promise<number> => {
    const clientIp = getClientIp(ip);
    const redis = getRedisClient();

    if (redis) {
        try {
            const value = await redis.get(`${GUEST_KEY_PREFIX}${clientIp}`);
            return value ? parseInt(value, 10) : 0;
        } catch (error: any) {
            logger.warn(`Redis guest quota read failed: ${error.message}`, CONTEXT);
        }
    }

    const entry = memoryStore.get(clientIp);
    if (!entry || entry.resetAt < Date.now()) {
        return 0;
    }
    return entry.count;
};

/**
 * Increments guest usage and returns the new count.
 */
export const incrementGuestUsage = async (ip: string): Promise<number> => {
    const clientIp = getClientIp(ip);
    const redis = getRedisClient();

    if (redis) {
        try {
            const key = `${GUEST_KEY_PREFIX}${clientIp}`;
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, GUEST_TTL_SECONDS);
            }
            return count;
        } catch (error: any) {
            logger.warn(`Redis guest quota incr failed: ${error.message}`, CONTEXT);
        }
    }

    const now = Date.now();
    let entry = memoryStore.get(clientIp);
    if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + GUEST_TTL_SECONDS * 1000 };
        memoryStore.set(clientIp, entry);
    }
    entry.count += 1;
    return entry.count;
};

export const isGuestLimitExceeded = async (ip: string): Promise<boolean> => {
    const usage = await getGuestUsage(ip);
    return usage >= env.guestMessageLimit;
};

export const guestLimitMessage = (): string =>
    `Guest search limit reached (${env.guestMessageLimit} free searches). Please sign in to continue.`;
