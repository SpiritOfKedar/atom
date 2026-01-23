import { Response } from 'express';
import { searchWeb } from './search.service';
import { scrapeMultiple } from './scrape.service';
import { streamCompletion } from './llm.service';
import { RAGContext, SearchResult } from '../types';
import { logger } from '../utils/logger';

const CONTEXT = 'RAGService';

interface RAGPipelineResult {
    sources: SearchResult[];
    success: boolean;
}

/**
 * Sends a status update to the client via SSE.
 */
const sendStatus = (res: Response, status: string): void => {
    res.write(JSON.stringify({ type: 'status', data: status }) + '\n');
};

/**
 * Runs the complete RAG pipeline:
 * 1. Search the web for relevant sources
 * 2. Scrape content from each source
 * 3. Stream LLM response with citations
 */
export const runRAGPipeline = async (
    query: string,
    res: Response
): Promise<RAGPipelineResult> => {
    logger.info(`Starting RAG pipeline for: "${query}"`, CONTEXT);

    // Step 1: Web Search
    sendStatus(res, 'Searching the web...');
    const searchResults = await searchWeb(query, 5);

    if (searchResults.length === 0) {
        throw new Error('No search results found');
    }

    // Send sources immediately so UI can render cards
    const sourcesPayload = searchResults.map((s) => ({
        title: s.title,
        link: s.link,
        favicon: s.favicon,
    }));
    res.write(JSON.stringify({ type: 'sources', data: sourcesPayload }) + '\n');
    logger.info(`Sent ${searchResults.length} sources to client`, CONTEXT);

    // Step 2: Scrape Content
    sendStatus(res, 'Reading sources...');
    const urls = searchResults.map((r) => r.link);
    const scrapedContents = await scrapeMultiple(urls);

    // Build RAG context
    const ragContexts: RAGContext[] = scrapedContents
        .filter((sc) => sc.success && sc.content.length > 50)
        .map((sc, index) => ({
            index: index + 1,
            title: sc.title || searchResults.find((sr) => sr.link === sc.url)?.title || 'Unknown',
            url: sc.url,
            content: sc.content,
        }));

    if (ragContexts.length === 0) {
        logger.warn('No valid content scraped, using search snippets as fallback', CONTEXT);
        // Fallback to search snippets
        searchResults.forEach((sr, index) => {
            ragContexts.push({
                index: index + 1,
                title: sr.title,
                url: sr.link,
                content: sr.snippet,
            });
        });
    }

    logger.info(`Built ${ragContexts.length} RAG contexts`, CONTEXT);

    // Step 3: Stream LLM Response
    sendStatus(res, 'Generating answer...');
    await streamCompletion(query, ragContexts, res);

    return {
        sources: searchResults,
        success: true,
    };
};
