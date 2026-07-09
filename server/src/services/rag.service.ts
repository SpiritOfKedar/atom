import { Response } from 'express';
import { searchWeb } from './search.service';
import { extractRelevantContent, scrapeMultipleWithBudget } from './scrape.service';
import { streamCompletion, generateStandaloneQuery } from './llm.service';
import { AnswerStyle, ModelProvider, RAGContext, SearchResult, SearchType, ScrapedContent } from '../types';
import { logger } from '../utils/logger';
import { IMessage } from '../models/conversation.model';
import { rankSources } from './source-ranking.service';
import { optimizeQuery, suggestSearchType } from './query-optimization.service';
import { shouldSkipWebSearch } from './query-routing.service';
import { RankedSource } from '../types';
import { searchMemory, storeMemory, MemoryResult } from './vector-store.service';

const CONTEXT = 'RAGService';

interface RAGPipelineResult {
    sources: SearchResult[];
    ragContexts: RAGContext[];
    success: boolean;
}

/**
 * Sends a status update to the client via SSE.
 * Silently ignores write errors (e.g. client disconnected).
 */
const sendStatus = (res: Response, status: string): void => {
    try {
        if (!res.writableEnded) {
            res.write(JSON.stringify({ type: 'status', data: status }) + '\n');
        }
    } catch {
        // Client likely disconnected; ignore
    }
};

/**
 * Safe write helper — ignores errors from closed connections.
 */
const safeWrite = (res: Response, payload: Record<string, unknown>): void => {
    try {
        if (!res.writableEnded) {
            res.write(JSON.stringify(payload) + '\n');
        }
    } catch {
        // ignore
    }
};

const toIsoDateString = (value: unknown): string | undefined => {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

/**
 * Removes duplicate sources from the same domain, keeping only the first (highest-ranked) occurrence.
 */
const deduplicateSources = (sources: RankedSource[]): RankedSource[] => {
    const seenDomains = new Set<string>();
    const deduplicated: RankedSource[] = [];

    for (const source of sources) {
        try {
            const urlObj = new URL(source.link);
            const domain = urlObj.hostname.toLowerCase();

            // Remove www. prefix for comparison
            const normalizedDomain = domain.startsWith('www.')
                ? domain.substring(4)
                : domain;

            if (!seenDomains.has(normalizedDomain)) {
                seenDomains.add(normalizedDomain);
                deduplicated.push(source);
            } else {
                logger.debug(`Deduplicated source from ${domain}: ${source.title.substring(0, 50)}`, CONTEXT);
            }
        } catch {
            // Invalid URL, keep it (shouldn't happen but safe fallback)
            deduplicated.push(source);
        }
    }

    if (deduplicated.length < sources.length) {
        logger.info(
            `Deduplicated ${sources.length} sources to ${deduplicated.length} unique domains`,
            CONTEXT
        );
    }

    return deduplicated;
};

const buildMemoryContexts = (memories: MemoryResult[]): RAGContext[] => {
    let contextIndex = 1;
    return memories.map((mem) => ({
        index: contextIndex++,
        title: `Memory: ${mem.metadata?.date ? new Date(mem.metadata.date).toLocaleDateString() : 'Past Interaction'}`,
        url: 'memory://internal',
        content: mem.content,
    }));
};

const runDirectCompletion = async (
    query: string,
    res: Response,
    memories: MemoryResult[],
    onToken?: (token: string) => void,
    conversationHistory?: IMessage[],
    answerStyle: AnswerStyle = 'detailed',
    modelProvider: ModelProvider = 'mistralai/mistral-medium-3.5-128b',
    userId?: string,
    memoryEnabled = false,
    effectiveQuery?: string
): Promise<RAGPipelineResult> => {
    const ragContexts = buildMemoryContexts(memories);

    sendStatus(res, 'Generating answer...');
    const fullAnswer = await streamCompletion(
        query,
        ragContexts,
        res,
        onToken,
        conversationHistory,
        answerStyle,
        modelProvider,
        'direct'
    );

    if (memoryEnabled && userId && fullAnswer && fullAnswer.length > 50) {
        storeMemory(userId, `Q: ${effectiveQuery || query}\nA: ${fullAnswer}`, {
            tags: ['conversation', 'direct'],
        }).catch((err) => logger.error(`Failed to store memory: ${err.message}`, CONTEXT));
    }

    return {
        sources: [],
        ragContexts,
        success: true,
    };
};

/**
 * Runs the complete RAG pipeline:
 * 1. Search the web for relevant sources
 * 2. Scrape content from each source
 * 3. Stream LLM response with citations
 */
export const runRAGPipeline = async (
    query: string,
    res: Response,
    onToken?: (token: string) => void,
    onSources?: (sources: any[]) => void,
    conversationHistory?: IMessage[],
    searchType?: SearchType,
    answerStyle: AnswerStyle = 'detailed',
    modelProvider: ModelProvider = 'mistralai/mistral-medium-3.5-128b',
    userId?: string,
    isClientConnected?: () => boolean
): Promise<RAGPipelineResult> => {
    // Helper: check if the client is still listening; abort early if not
    const shouldContinue = (): boolean => !isClientConnected || isClientConnected();

    logger.info(`Starting RAG pipeline for: "${query}"`, CONTEXT);

    // Determine search type if not provided
    const effectiveSearchType = searchType || suggestSearchType(query);
    if (effectiveSearchType !== 'web') {
        logger.info(`Using ${effectiveSearchType} search strategy`, CONTEXT);
    }

    // Step 1: Handle conversation history to get a standalone search query
    let effectiveQuery = query;
    if (conversationHistory && conversationHistory.length > 0) {
        sendStatus(res, 'Analyzing follow-up question...');
        try {
            effectiveQuery = await generateStandaloneQuery(query, conversationHistory, modelProvider);
        } catch (error: any) {
            logger.warn(`Standalone query generation failed: ${error.message}`, CONTEXT);
            // Continue with original query
        }
    }

    // Step 2: Optimize the query using LLM
    sendStatus(res, 'Optimizing query...');
    try {
        const optimizedQuery = await optimizeQuery(effectiveQuery, modelProvider);
        if (optimizedQuery !== effectiveQuery) {
            logger.debug(
                `Query optimized: "${effectiveQuery.substring(0, 60)}..." -> "${optimizedQuery.substring(0, 60)}..."`,
                CONTEXT
            );
            effectiveQuery = optimizedQuery;
        }
    } catch (error: any) {
        logger.warn(`Query optimization failed, using original: ${error.message}`, CONTEXT);
        // Continue with unoptimized query
    }

    // Step 3: Retrieve Long-term Memory (Vector Search) — authenticated users only
    const memoryEnabled = Boolean(userId) && modelProvider === 'openai';
    const memories = memoryEnabled ? await searchMemory(userId!, effectiveQuery) : [];
    if (memories.length > 0) {
        logger.info(`Retrieved ${memories.length} memories for query`, CONTEXT);
        sendStatus(res, 'Recalling past interactions...');
    } else if (!memoryEnabled) {
        logger.debug(
            `Skipping vector memory for provider=${modelProvider} (OpenAI embeddings only)`,
            CONTEXT
        );
    }

    if (shouldSkipWebSearch(query, effectiveQuery)) {
        if (!shouldContinue()) {
            logger.info('Client disconnected before direct completion, aborting pipeline', CONTEXT);
            return { sources: [], ragContexts: [], success: false };
        }

        return runDirectCompletion(
            query,
            res,
            memories,
            onToken,
            conversationHistory,
            answerStyle,
            modelProvider,
            userId,
            memoryEnabled,
            effectiveQuery
        );
    }

    const searchStatusMessage = effectiveSearchType === 'news'
        ? 'Searching news...'
        : effectiveSearchType === 'academic'
            ? 'Searching academic sources...'
            : 'Searching the web...';

    if (!shouldContinue()) {
        logger.info('Client disconnected before search, aborting pipeline', CONTEXT);
        return { sources: [], ragContexts: [], success: false };
    }

    sendStatus(res, searchStatusMessage);
    let searchResults = await searchWeb(effectiveQuery, 5, effectiveSearchType);

    // Specialized strategies can still return empty; one more plain-web attempt.
    if (searchResults.length === 0 && effectiveSearchType !== 'web') {
        logger.warn(
            `${effectiveSearchType} search empty after service fallbacks, retrying web search`,
            CONTEXT
        );
        sendStatus(res, 'Searching the web...');
        searchResults = await searchWeb(effectiveQuery, 5, 'web');
    }

    if (searchResults.length === 0) {
        logger.info('No search results found, falling back to direct LLM completion', CONTEXT);

        if (!shouldContinue()) {
            logger.info('Client disconnected before direct completion fallback, aborting pipeline', CONTEXT);
            return { sources: [], ragContexts: [], success: false };
        }

        return runDirectCompletion(
            query,
            res,
            memories,
            onToken,
            conversationHistory,
            answerStyle,
            modelProvider,
            userId,
            memoryEnabled,
            effectiveQuery
        );
    }

    // Send initial sources (will be re-sent after ranking)
    const initialSourcesPayload = searchResults.map((s) => ({
        title: s.title,
        link: s.link,
        favicon: s.favicon,
    }));
    safeWrite(res, { type: 'sources', data: initialSourcesPayload });
    logger.info(`Sent ${searchResults.length} initial sources to client`, CONTEXT);

    sendStatus(res, 'Reading sources...');
    const urls = searchResults.map((r) => r.link);

    // Direct scrape with a soft time budget — skip BullMQ hop so TTFT stays low.
    // Pages that miss the budget fall back to Serper snippets (already available).
    const scrapedContents = await scrapeMultipleWithBudget(urls);

    // Rank sources by relevance, freshness, and authority
    sendStatus(res, 'Ranking sources...');
    let rankedSources = rankSources(searchResults, scrapedContents, query);

    // Deduplicate sources by domain (keep highest-ranked from each domain)
    rankedSources = deduplicateSources(rankedSources);

    // Build RAG contexts from ranked sources (highest score first)
    const ragContexts: RAGContext[] = [...buildMemoryContexts(memories)];
    let contextIndex = ragContexts.length + 1;
    // Use intelligent content extraction with different max lengths based on rank
    const webContexts = rankedSources
        .filter((rs) => {
            const scraped = scrapedContents.find(sc => sc.url === rs.link);
            const content = scraped?.content || rs.snippet;
            return content.length > 50;
        })
        .map((rs, index) => {
            const scraped = scrapedContents.find(sc => sc.url === rs.link);
            const rawContent = scraped?.content || rs.snippet;

            // Top 2 sources get more content (2500 chars), others get less (1000-1500)
            const maxLength = index < 2 ? 2500 : index < 3 ? 1500 : 1000;

            // Extract most relevant content based on query
            const optimizedContent = extractRelevantContent(rawContent, query, maxLength);

            return {
                index: contextIndex++,
                title: scraped?.title || rs.title || 'Unknown',
                url: rs.link,
                content: optimizedContent,
            };
        });

    ragContexts.push(...webContexts);

    if (webContexts.length === 0) {
        logger.warn('No valid content scraped, using search snippets as fallback', CONTEXT);
        rankedSources.forEach((rs) => {
            ragContexts.push({
                index: contextIndex++,
                title: rs.title,
                url: rs.link,
                content: rs.snippet,
            });
        });
    }

    // Update sources payload with ranked order and enhanced metadata
    const rankedSourcesPayload = rankedSources.map((rs) => {
        const scraped = scrapedContents.find(sc => sc.url === rs.link);
        return {
            title: rs.title,
            link: rs.link,
            favicon: rs.favicon,
            score: rs.totalScore, // Include score for debugging/UI
            publishedDate: toIsoDateString(scraped?.publishedDate),
            author: scraped?.author,
            category: scraped?.category,
            readingTime: scraped?.readingTime,
        };
    });

    // Re-send sources in ranked order
    safeWrite(res, { type: 'sources', data: rankedSourcesPayload });

    if (onSources) {
        onSources(rankedSourcesPayload);
    }

    logger.info(`Built ${ragContexts.length} RAG contexts`, CONTEXT);

    if (!shouldContinue()) {
        logger.info('Client disconnected before LLM streaming, aborting pipeline', CONTEXT);
        return { sources: rankedSources, ragContexts, success: false };
    }

    sendStatus(res, 'Generating answer...');
    const fullAnswer = await streamCompletion(
        query,
        ragContexts,
        res,
        onToken,
        conversationHistory,
        answerStyle,
        modelProvider
    );

    // Save to Memory (authenticated users only)
    if (memoryEnabled && userId && fullAnswer && fullAnswer.length > 50) {
        storeMemory(userId, `Q: ${effectiveQuery}\nA: ${fullAnswer}`, {
            tags: ['conversation', effectiveSearchType],
        }).catch(err => logger.error(`Failed to store memory: ${err.message}`, CONTEXT));
    }

    return {
        sources: rankedSources,
        ragContexts,
        success: true,
    };
};
