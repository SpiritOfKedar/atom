import { Response } from 'express';
import { searchWeb } from './search.service';
import { extractRelevantContent } from './scrape.service';
import { addScrapeJob, scrapeQueueEvents } from '../queues/scraper.queue';
import { streamCompletion, generateStandaloneQuery } from './llm.service';
import { AnswerStyle, RAGContext, SearchResult, SearchType, ScrapedContent } from '../types';
import { logger } from '../utils/logger';
import { IMessage } from '../models/conversation.model';
import { rankSources } from './source-ranking.service';
import { optimizeQuery, suggestSearchType } from './query-optimization.service';
import { RankedSource } from '../types';

const CONTEXT = 'RAGService';

interface RAGPipelineResult {
    sources: SearchResult[];
    ragContexts: RAGContext[];
    success: boolean;
}

/**
 * Sends a status update to the client via SSE.
 */
const sendStatus = (res: Response, status: string): void => {
    res.write(JSON.stringify({ type: 'status', data: status }) + '\n');
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
    answerStyle: AnswerStyle = 'detailed'
): Promise<RAGPipelineResult> => {
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
            effectiveQuery = await generateStandaloneQuery(query, conversationHistory);
        } catch (error: any) {
            logger.warn(`Standalone query generation failed: ${error.message}`, CONTEXT);
            // Continue with original query
        }
    }

    // Step 2: Optimize the query using LLM
    sendStatus(res, 'Optimizing query...');
    try {
        const optimizedQuery = await optimizeQuery(effectiveQuery);
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

    const searchStatusMessage = effectiveSearchType === 'news'
        ? 'Searching news...'
        : effectiveSearchType === 'academic'
            ? 'Searching academic sources...'
            : 'Searching the web...';

    sendStatus(res, searchStatusMessage);
    const searchResults = await searchWeb(effectiveQuery, 5, effectiveSearchType);

    if (searchResults.length === 0) {
        throw new Error('No search results found');
    }

    // Send initial sources (will be re-sent after ranking)
    const initialSourcesPayload = searchResults.map((s) => ({
        title: s.title,
        link: s.link,
        favicon: s.favicon,
    }));
    res.write(JSON.stringify({ type: 'sources', data: initialSourcesPayload }) + '\n');
    logger.info(`Sent ${searchResults.length} initial sources to client`, CONTEXT);

    sendStatus(res, 'Reading sources...');
    const urls = searchResults.map((r) => r.link);

    // Add scrape job to queue and wait for completion
    const job = await addScrapeJob(urls);
    const scrapedContents = await job.waitUntilFinished(scrapeQueueEvents) as ScrapedContent[];

    // Rank sources by relevance, freshness, and authority
    sendStatus(res, 'Ranking sources...');
    let rankedSources = rankSources(searchResults, scrapedContents, query);

    // Deduplicate sources by domain (keep highest-ranked from each domain)
    rankedSources = deduplicateSources(rankedSources);

    // Build RAG contexts from ranked sources (highest score first)
    // Use intelligent content extraction with different max lengths based on rank
    const ragContexts: RAGContext[] = rankedSources
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
                index: index + 1,
                title: scraped?.title || rs.title || 'Unknown',
                url: rs.link,
                content: optimizedContent,
            };
        });

    if (ragContexts.length === 0) {
        logger.warn('No valid content scraped, using search snippets as fallback', CONTEXT);
        rankedSources.forEach((rs, index) => {
            ragContexts.push({
                index: index + 1,
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
            publishedDate: scraped?.publishedDate?.toISOString(),
            author: scraped?.author,
            category: scraped?.category,
            readingTime: scraped?.readingTime,
        };
    });

    // Re-send sources in ranked order
    res.write(JSON.stringify({ type: 'sources', data: rankedSourcesPayload }) + '\n');

    if (onSources) {
        onSources(rankedSourcesPayload);
    }

    logger.info(`Built ${ragContexts.length} RAG contexts`, CONTEXT);

    sendStatus(res, 'Generating answer...');
    await streamCompletion(query, ragContexts, res, onToken, conversationHistory, answerStyle);

    return {
        sources: rankedSources,
        ragContexts,
        success: true,
    };
};
