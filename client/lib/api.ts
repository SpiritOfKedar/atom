const DEFAULT_API_URL = 'http://localhost:3001';

/**
 * Base URL for the Atom API (no trailing slash).
 * Set NEXT_PUBLIC_API_URL in production (e.g. https://api.example.com).
 */
export function getApiBaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
    return url.replace(/\/$/, '');
}

/** API base including /api prefix */
export function getApiUrl(): string {
    return `${getApiBaseUrl()}/api`;
}
