import { logger } from '../utils/logger';

const CONTEXT = 'QueryRoutingService';

/**
 * Patterns for questions that don't benefit from web search — meta questions
 * about Atom itself, greetings, or general assistant behavior.
 */
const SKIP_SEARCH_PATTERNS: RegExp[] = [
    /\bwhat\s+(llm|model|ai)\b.*\b(using|you|this|are|running|powering)\b/i,
    /\bwhich\s+(llm|model|ai)\b/i,
    /\bcurrent\s+(llm|model)\b/i,
    /^who\s+are\s+you\b/i,
    /^what\s+can\s+you\s+do\b/i,
    /^how\s+do\s+you\s+work\b/i,
    /^what\s+is\s+atom\b/i,
    /\b(hello|hi|hey|thanks|thank\s+you|good\s+(morning|afternoon|evening))\b/i,
    /\bhelp\s+me\s+(use|with)\s+(this|atom)\b/i,
    /\bwho\s+made\s+(you|atom)\b/i,
    /\bwhat\s+are\s+you\b/i,
];

/**
 * Returns true when the query is conversational/meta and should be answered
 * directly by the LLM without a web search step.
 */
export const shouldSkipWebSearch = (query: string, optimizedQuery?: string): boolean => {
    const candidates = [query, optimizedQuery].filter(
        (q): q is string => Boolean(q && q.trim())
    );

    for (const text of candidates) {
        const normalized = text.trim();
        if (SKIP_SEARCH_PATTERNS.some((pattern) => pattern.test(normalized))) {
            logger.info(`Skipping web search for meta/conversational query: "${normalized.substring(0, 60)}"`, CONTEXT);
            return true;
        }
    }

    return false;
};
