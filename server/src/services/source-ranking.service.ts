import { SearchResult, ScrapedContent, RankedSource } from '../types';
import { logger } from '../utils/logger';

const CONTEXT = 'SourceRankingService';

/**
 * Authority domains that are considered highly credible.
 */
const AUTHORITY_DOMAINS = new Set([
    'wikipedia.org',
    'edu',
    'gov',
    'nature.com',
    'science.org',
    'nih.gov',
    'cdc.gov',
    'who.int',
    'un.org',
    'ieee.org',
    'acm.org',
    'arxiv.org',
    'pubmed.ncbi.nlm.nih.gov',
    'scholar.google.com',
    'researchgate.net',
]);

/**
 * News domains that indicate fresh content.
 */
const NEWS_DOMAINS = new Set([
    'reuters.com',
    'bbc.com',
    'cnn.com',
    'theguardian.com',
    'nytimes.com',
    'washingtonpost.com',
    'wsj.com',
    'bloomberg.com',
    'techcrunch.com',
    'theverge.com',
]);

/**
 * Calculates relevance score based on keyword matching and content quality.
 * Weight: 50%
 */
const calculateRelevanceScore = (
    content: string,
    title: string,
    snippet: string,
    query: string
): number => {
    const queryLower = query.toLowerCase();
    const primaryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const queryWords = primaryWords.length > 0
        ? primaryWords
        : queryLower.split(/\s+/).filter(w => w.length > 0);
    const denominator = Math.max(queryWords.length, 1);
    
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();
    const snippetLower = snippet.toLowerCase();
    
    let score = 0;
    
    // Title matches are most important
    const titleMatches = queryWords.filter(word => titleLower.includes(word)).length;
    score += (titleMatches / denominator) * 40;
    
    // Snippet matches
    const snippetMatches = queryWords.filter(word => snippetLower.includes(word)).length;
    score += (snippetMatches / denominator) * 30;
    
    // Content matches (keyword density)
    const contentMatches = queryWords.filter(word => contentLower.includes(word)).length;
    score += (contentMatches / denominator) * 20;
    
    // Exact phrase match bonus
    if (contentLower.includes(queryLower) || titleLower.includes(queryLower)) {
        score += 10;
    }
    
    // Content quality: longer content is generally better (up to a point)
    const contentLengthScore = Math.min(content.length / 500, 1) * 10;
    score += contentLengthScore;
    
    return Math.min(score, 100);
};

/**
 * Calculates freshness score based on URL patterns and domain type.
 * Weight: 20%
 */
const calculateFreshnessScore = (url: string, content: string): number => {
    let score = 0;
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // News domains are likely fresh
        const isNewsDomain = Array.from(NEWS_DOMAINS).some(domain => hostname.includes(domain));
        if (isNewsDomain) {
            score += 40;
        }
        
        // Check for date patterns in URL (e.g., /2024/, /2025/, /jan-2025/)
        const datePatterns = [
            /\/(20\d{2})\//,           // /2024/
            /\/(20\d{2})-(0[1-9]|1[0-2])/, // /2024-01/
            /\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_\s]?(20\d{2})/i,
        ];
        
        for (const pattern of datePatterns) {
            if (pattern.test(url)) {
                score += 30;
                break;
            }
        }
        
        // Check for date patterns in content
        const contentDatePatterns = [
            /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+20\d{2}/i,
            /\d{1,2}\/\d{1,2}\/20\d{2}/,
            /20\d{2}-\d{2}-\d{2}/,
        ];
        
        for (const pattern of contentDatePatterns) {
            if (pattern.test(content)) {
                score += 20;
                break;
            }
        }
        
        // Recent keywords in content
        const currentYear = new Date().getFullYear();
        const recentKeywords = ['recent', 'latest', 'new', 'updated', String(currentYear), String(currentYear - 1), 'this year', 'this month'];
        const hasRecentKeywords = recentKeywords.some(keyword => 
            content.toLowerCase().includes(keyword)
        );
        if (hasRecentKeywords) {
            score += 10;
        }
        
    } catch {
        // Invalid URL, no freshness bonus
    }
    
    return Math.min(score, 100);
};

/**
 * Calculates authority score based on domain reputation.
 * Weight: 30%
 */
const calculateAuthorityScore = (url: string): number => {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Check for exact authority domain matches
        for (const domain of AUTHORITY_DOMAINS) {
            if (hostname.includes(domain)) {
                return 100; // Maximum authority score
            }
        }
        
        // Check for TLD-based authority
        if (hostname.endsWith('.edu')) {
            return 90;
        }
        if (hostname.endsWith('.gov')) {
            return 95;
        }
        if (hostname.endsWith('.org')) {
            return 60; // .org is somewhat authoritative
        }
        
        // Check for subdomain patterns (e.g., news.bbc.com, www.nature.com)
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            const domain = parts.slice(-2).join('.');
            if (AUTHORITY_DOMAINS.has(domain)) {
                return 100;
            }
        }
        
        // Wikipedia subdomains
        if (hostname.includes('wikipedia')) {
            return 100;
        }
        
        // Default: moderate authority for unknown domains
        return 40;
        
    } catch {
        return 30; // Invalid URL, low authority
    }
};

/**
 * Ranks sources by combining relevance, freshness, and authority scores.
 * 
 * @param searchResults - Original search results
 * @param scrapedContents - Scraped content for each source
 * @param query - Original search query
 * @returns Ranked sources sorted by total score (descending)
 */
export const rankSources = (
    searchResults: SearchResult[],
    scrapedContents: ScrapedContent[],
    query: string
): RankedSource[] => {
    logger.info(`Ranking ${searchResults.length} sources for query: "${query}"`, CONTEXT);
    
    const ranked: RankedSource[] = searchResults.map((result, index) => {
        const scraped = scrapedContents.find(sc => sc.url === result.link);
        const content = scraped?.content || result.snippet;
        const title = scraped?.title || result.title;
        
        const relevanceScore = calculateRelevanceScore(
            content,
            title,
            result.snippet,
            query
        );
        
        const freshnessScore = calculateFreshnessScore(result.link, content);
        const authorityScore = calculateAuthorityScore(result.link);
        
        // Weighted total: relevance (50%) + freshness (20%) + authority (30%)
        const totalScore = 
            relevanceScore * 0.5 +
            freshnessScore * 0.2 +
            authorityScore * 0.3;
        
        const rankedSource: RankedSource = {
            ...result,
            relevanceScore: Math.round(relevanceScore * 100) / 100,
            freshnessScore: Math.round(freshnessScore * 100) / 100,
            authorityScore: Math.round(authorityScore * 100) / 100,
            totalScore: Math.round(totalScore * 100) / 100,
            scrapedContent: scraped?.content,
        };
        
        return rankedSource;
    });
    
    // Sort by total score (descending)
    ranked.sort((a, b) => b.totalScore - a.totalScore);
    
    logger.info(
        `Ranked sources. Top score: ${ranked[0]?.totalScore.toFixed(2)}, ` +
        `Bottom score: ${ranked[ranked.length - 1]?.totalScore.toFixed(2)}`,
        CONTEXT
    );
    
    // Log top 3 for debugging
    if (logger.debug) {
        ranked.slice(0, 3).forEach((source, idx) => {
            logger.debug(
                `#${idx + 1}: ${source.title.substring(0, 50)}... ` +
                `(rel: ${source.relevanceScore}, fresh: ${source.freshnessScore}, ` +
                `auth: ${source.authorityScore}, total: ${source.totalScore})`,
                CONTEXT
            );
        });
    }
    
    return ranked;
};
