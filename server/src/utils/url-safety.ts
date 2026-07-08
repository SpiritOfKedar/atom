import { URL } from 'url';
import { ApiError } from './apiError';

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    'metadata.google.internal',
    'metadata',
]);

const PRIVATE_IPV4_PATTERNS = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
];

const isPrivateIpv4 = (hostname: string): boolean =>
    PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));

const isPrivateIpv6 = (hostname: string): boolean => {
    const lower = hostname.toLowerCase();
    return (
        lower === '::1' ||
        lower.startsWith('fc') ||
        lower.startsWith('fd') ||
        lower.startsWith('fe80')
    );
};

const isBlockedHostname = (hostname: string): boolean => {
    const lower = hostname.toLowerCase().replace(/\.$/, '');
    if (BLOCKED_HOSTNAMES.has(lower)) return true;
    if (lower.endsWith('.localhost')) return true;
    if (isPrivateIpv4(lower)) return true;
    if (isPrivateIpv6(lower)) return true;
    return false;
};

/**
 * Returns true if the URL is safe to fetch (public HTTP/HTTPS only).
 */
export const isUrlSafeForFetch = (rawUrl: string): boolean => {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }
        if (!parsed.hostname) return false;
        if (isBlockedHostname(parsed.hostname)) return false;
        return true;
    } catch {
        return false;
    }
};

/**
 * Throws ApiError if URL is not safe for server-side fetching.
 */
export const assertUrlSafeForFetch = (rawUrl: string): void => {
    if (!isUrlSafeForFetch(rawUrl)) {
        throw ApiError.badRequest('URL is not allowed for fetching');
    }
};
