import { Response } from 'express';
import { searchWeb } from './search.service';
import { scrapeMultiple } from './scrape.service';
import { streamCompletion } from './llm.service';
import { RAGContext, SearchResult } from '../types';
import { logger } from '../utils/logger';
import { IMessage } from '../models/conversation.model';
import { rankSources } from './source-ranking.service';
import { optimizeQuery } from './query-optimization.service';
import { RankedSource } from '../types';

const CONTEXT = 'RAGService';

interface RAGPipelineResult {
    sources: SearchResult[];
    success: boolean;
}

/**
 * Builds an enhanced query string that incorporates recent conversation history.
 */
const buildEnhancedQuery = (query: string, conversationHistory?: IMessage[]): string => {
    if (!conversationHistory || conversationHistory.length === 0) {
        return query;
    }

    const historyLines = conversationHistory.map((msg) => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    });

    const historyText = historyLines.join('\n');

    return `Previous conversation:\n${historyText}\n\nCurrent question: ${query}`;
};

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
    conversationHistory?: IMessage[]
): Promise<RAGPipelineResult> => {
    logger.info(`Starting RAG pipeline for: "${query}"`, CONTEXT);

    // Step 1: Build enhanced query with conversation history (if any)
    let effectiveQuery = buildEnhancedQuery(query, conversationHistory);
    
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

    sendStatus(res, 'Searching the web...');
    const searchResults = await searchWeb(effectiveQuery, 5);

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
    const scrapedContents = await scrapeMultiple(urls);

    // Rank sources by relevance, freshness, and authority
    sendStatus(res, 'Ranking sources...');
    let rankedSources = rankSources(searchResults, scrapedContents, query);

    // Deduplicate sources by domain (keep highest-ranked from each domain)
    rankedSources = deduplicateSources(rankedSources);

    // Build RAG contexts from ranked sources (highest score first)
    const ragContexts: RAGContext[] = rankedSources
        .filter((rs) => {
            const scraped = scrapedContents.find(sc => sc.url === rs.link);
            const content = scraped?.content || rs.snippet;
            return content.length > 50;
        })
        .map((rs, index) => {
            const scraped = scrapedContents.find(sc => sc.url === rs.link);
            return {
                index: index + 1,
                title: scraped?.title || rs.title || 'Unknown',
                url: rs.link,
                content: scraped?.content || rs.snippet,
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

    // Update sources payload with ranked order
    const rankedSourcesPayload = rankedSources.map((rs) => ({
        title: rs.title,
        link: rs.link,
        favicon: rs.favicon,
        score: rs.totalScore, // Include score for debugging/UI
    }));
    
    // Re-send sources in ranked order
    res.write(JSON.stringify({ type: 'sources', data: rankedSourcesPayload }) + '\n');
    
    if (onSources) {
        onSources(rankedSourcesPayload);
    }

    logger.info(`Built ${ragContexts.length} RAG contexts`, CONTEXT);

    sendStatus(res, 'Generating answer...');
    await streamCompletion(query, ragContexts, res, onToken, conversationHistory);

    return {
        sources: rankedSources,
        success: true,
    };
};
