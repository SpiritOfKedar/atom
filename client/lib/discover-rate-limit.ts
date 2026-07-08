const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

export function isDiscoverRateLimited(clientKey: string): boolean {
    const now = Date.now();
    let entry = store.get(clientKey);

    if (!entry || now - entry.windowStart >= WINDOW_MS) {
        entry = { count: 0, windowStart: now };
        store.set(clientKey, entry);
    }

    entry.count += 1;
    return entry.count > MAX_REQUESTS;
}

export function getClientKeyFromRequest(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || 'unknown';
}
