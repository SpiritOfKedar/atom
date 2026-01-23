import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedContent } from '../types';
import { logger } from '../utils/logger';
import { getCachedScrapedContent, cacheScrapedContent } from './cache.service';
import { retry, retryMultiple } from '../utils/retry';

const CONTEXT = 'ScrapeService';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 3000;
const MAX_CONTENT_LENGTH_BASE = 1500; // Base characters per source
const MAX_CONTENT_LENGTH_TOP = 2500; // Max for top-ranked sources
const MAX_CONTENT_LENGTH_LOW = 1000; // Max for lower-ranked sources
const WORDS_PER_MINUTE = 200; // Average reading speed

/**
 * Extracts publication date from HTML.
 */
const extractPublishedDate = ($: cheerio.Root, url: string): Date | undefined => {
    try {
        // Try meta tags first
        const dateSelectors = [
            'meta[property="article:published_time"]',
            'meta[name="publish-date"]',
            'meta[name="date"]',
            'meta[property="og:published_time"]',
            'time[datetime]',
            'time[pubdate]',
        ];

        for (const selector of dateSelectors) {
            const dateStr = $(selector).attr('content') || $(selector).attr('datetime');
            if (dateStr) {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }

        // Try to find date in content (common patterns)
        const text = $('body').text();
        const datePatterns = [
            /(?:published|posted|updated).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
            /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
            /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                const date = new Date(match[1]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }

        // Try URL patterns (e.g., /2024/01/23/)
        const urlDateMatch = url.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
        if (urlDateMatch) {
            const date = new Date(`${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    } catch {
        // Ignore errors
    }

    return undefined;
};

/**
 * Extracts author information from HTML.
 */
const extractAuthor = ($: cheerio.Root): string | undefined => {
    try {
        // Try meta tags first
        const authorSelectors = [
            'meta[name="author"]',
            'meta[property="article:author"]',
            'meta[property="og:article:author"]',
            '[rel="author"]',
            '.author',
            '.byline',
            '[itemprop="author"]',
        ];

        for (const selector of authorSelectors) {
            const author = $(selector).attr('content') ||
                $(selector).attr('name') ||
                $(selector).text().trim();
            if (author && author.length > 0 && author.length < 100) {
                return author;
            }
        }

        // Try structured data
        const jsonLd = $('script[type="application/ld+json"]');
        for (let i = 0; i < jsonLd.length; i++) {
            try {
                const data = JSON.parse($(jsonLd[i]).html() || '{}');
                if (data.author?.name) {
                    return data.author.name;
                }
                if (Array.isArray(data.author) && data.author[0]?.name) {
                    return data.author[0].name;
                }
            } catch {
                // Ignore parse errors
            }
        }
    } catch {
        // Ignore errors
    }

    return undefined;
};

/**
 * Determines content category based on URL and domain patterns.
 */
const determineCategory = (url: string): 'news' | 'academic' | 'blog' | 'forum' | 'other' => {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname.toLowerCase();

        // News domains
        const newsDomains = ['news', 'reuters', 'bbc', 'cnn', 'nytimes', 'theguardian', 'washingtonpost'];
        if (newsDomains.some(domain => hostname.includes(domain)) || path.includes('/news/')) {
            return 'news';
        }

        // Academic domains
        if (hostname.endsWith('.edu') ||
            hostname.includes('scholar') ||
            hostname.includes('academic') ||
            hostname.includes('research') ||
            path.includes('/research/') ||
            path.includes('/paper/') ||
            path.includes('/publication/')) {
            return 'academic';
        }

        // Blog patterns
        if (path.includes('/blog/') ||
            path.includes('/post/') ||
            path.includes('/article/') ||
            hostname.includes('blog') ||
            hostname.includes('medium.com') ||
            hostname.includes('wordpress.com') ||
            hostname.includes('blogspot.com')) {
            return 'blog';
        }

        // Forum patterns
        if (path.includes('/forum/') ||
            path.includes('/discussion/') ||
            hostname.includes('reddit.com') ||
            hostname.includes('stackoverflow.com') ||
            hostname.includes('stackexchange.com')) {
            return 'forum';
        }

        return 'other';
    } catch {
        return 'other';
    }
};

/**
 * Calculates estimated reading time in minutes.
 */
const calculateReadingTime = (content: string): number => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / WORDS_PER_MINUTE);
    return Math.max(1, minutes); // At least 1 minute
};

/**
 * Scrapes and cleans content from a single URL.
 */
export const scrapePage = async (url: string): Promise<ScrapedContent> => {
    // Check cache first
    const cached = await getCachedScrapedContent(url);
    if (cached && cached.success) {
        logger.debug(`Cache hit for scrape: ${url}`, CONTEXT);
        return cached;
    }

    const result: ScrapedContent = {
        url,
        title: '',
        content: '',
        success: false,
    };

    try {
        logger.debug(`Scraping: ${url}`, CONTEXT);

        // Retry scraping with exponential backoff (2 attempts per URL)
        const { data } = await retry(
            async () => {
                return await axios.get<string>(url, {
                    headers: {
                        'User-Agent': USER_AGENT,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    },
                    timeout: TIMEOUT_MS,
                    maxRedirects: 3,
                });
            },
            {
                maxAttempts: 2,
                initialDelayMs: 500,
                maxDelayMs: 2000,
                backoffMultiplier: 2,
                retryableErrors: (error: any) => {
                    // Retry on network errors, timeouts, and 5xx/429 status codes
                    // Don't retry on 4xx (client errors) except 429 (rate limit)
                    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                        return true;
                    }
                    if (error.response) {
                        const status = error.response.status;
                        return status >= 500 || status === 429;
                    }
                    return error.message?.includes('timeout') || false;
                },
            }
        );

        const $ = cheerio.load(data);

        // Extract title
        result.title = $('title').first().text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            $('h1').first().text().trim() ||
            'Untitled';

        // Remove noise elements
        $('script, style, noscript, iframe, nav, footer, header, aside, form, button, svg, img').remove();
        $('[role="navigation"], [role="banner"], [role="contentinfo"], .nav, .footer, .header, .sidebar, .ad, .advertisement, .social-share').remove();

        // Extract main content
        let mainContent = '';

        // Try to find main content container first
        const contentSelectors = [
            'article',
            'main',
            '[role="main"]',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.content',
            '#content',
        ];

        for (const selector of contentSelectors) {
            const container = $(selector);
            if (container.length > 0) {
                mainContent = container.find('p').map((_, el) => $(el).text().trim()).get().join(' ');
                if (mainContent.length > 200) break;
            }
        }

        // Fallback to all paragraphs
        if (mainContent.length < 200) {
            mainContent = $('p').map((_, el) => $(el).text().trim()).get().join(' ');
        }

        // Clean up whitespace
        const rawContent = mainContent
            .replace(/\s+/g, ' ')
            .trim();

        // Use base extraction for now (will be optimized later with query context)
        result.content = rawContent.substring(0, MAX_CONTENT_LENGTH_BASE);

        if (result.content.length > 0) {
            result.success = true;

            // Extract enhanced metadata
            result.publishedDate = extractPublishedDate($, url);
            result.author = extractAuthor($);
            result.category = determineCategory(url);
            result.readingTime = calculateReadingTime(result.content);

            logger.debug(
                `Scraped ${result.content.length} chars from ${url} ` +
                `(category: ${result.category}, reading time: ${result.readingTime}min)`,
                CONTEXT
            );

            // Cache successful scrapes
            await cacheScrapedContent(url, result);
        } else {
            logger.warn(`No content extracted from ${url}`, CONTEXT);
        }

    } catch (error: any) {
        logger.error(`Failed to scrape ${url}: ${error.message}`, CONTEXT);
        result.content = `Unable to retrieve content from this source.`;
    }

    return result;
};

/**
 * Splits text into sentences.
 */
const splitIntoSentences = (text: string): string[] => {
    // Simple sentence splitting by common delimiters
    return text
        .split(/[.!?]+\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filter very short fragments
};

/**
 * Scores a sentence based on relevance to the query.
 */
const scoreSentence = (sentence: string, query: string): number => {
    const sentenceLower = sentence.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    let score = 0;

    // Exact phrase match (highest weight)
    if (sentenceLower.includes(queryLower)) {
        score += 50;
    }

    // Individual word matches
    const matchedWords = queryWords.filter(word => sentenceLower.includes(word)).length;
    score += (matchedWords / queryWords.length) * 30;

    // Keyword density (how many times query words appear)
    let totalOccurrences = 0;
    queryWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        const matches = sentence.match(regex);
        if (matches) {
            totalOccurrences += matches.length;
        }
    });
    score += Math.min(totalOccurrences * 5, 20);

    // Sentence length bonus (prefer medium-length sentences)
    const length = sentence.length;
    if (length >= 50 && length <= 300) {
        score += 10;
    } else if (length < 50 || length > 500) {
        score -= 5;
    }

    return score;
};

/**
 * Extracts the most relevant content from scraped text based on query.
 * Scores sentences by relevance and selects top sentences while maintaining order.
 * 
 * @param content - Full scraped content
 * @param query - Search query for relevance scoring
 * @param maxLength - Maximum characters to extract
 * @returns Extracted relevant content
 */
export const extractRelevantContent = (
    content: string,
    query: string,
    maxLength: number = MAX_CONTENT_LENGTH_BASE
): string => {
    if (!content || content.length === 0) {
        return content;
    }

    // If content is already short enough, return as-is
    if (content.length <= maxLength) {
        return content;
    }

    // Split into sentences
    const sentences = splitIntoSentences(content);

    if (sentences.length === 0) {
        // Fallback: just truncate
        return content.substring(0, maxLength);
    }

    // Score each sentence
    const scoredSentences = sentences.map(sentence => ({
        sentence,
        score: scoreSentence(sentence, query),
        originalIndex: sentences.indexOf(sentence),
    }));

    // Sort by score (descending), but keep track of original order
    scoredSentences.sort((a, b) => b.score - a.score);

    // Take top sentences, but try to maintain some order coherence
    const topSentences = scoredSentences.slice(0, 15); // Top 15 by score

    // Sort back by original index to maintain reading flow
    topSentences.sort((a, b) => a.originalIndex - b.originalIndex);

    // Build result, adding sentences until we hit maxLength
    let result = '';
    for (const { sentence } of topSentences) {
        const candidate = result ? `${result} ${sentence}` : sentence;
        if (candidate.length <= maxLength) {
            result = candidate;
        } else {
            // Try to fit as much as possible
            const remaining = maxLength - result.length;
            if (remaining > 50) {
                result = result ? `${result} ${sentence.substring(0, remaining - 1)}` : sentence.substring(0, remaining);
            }
            break;
        }
    }

    // If we still have space, add more sentences in order
    if (result.length < maxLength * 0.8 && scoredSentences.length > topSentences.length) {
        const remainingSentences = scoredSentences
            .slice(topSentences.length)
            .sort((a, b) => a.originalIndex - b.originalIndex);

        for (const { sentence } of remainingSentences) {
            const candidate = `${result} ${sentence}`;
            if (candidate.length <= maxLength) {
                result = candidate;
            } else {
                break;
            }
        }
    }

    return result.trim() || content.substring(0, maxLength);
};

/**
 * Scrapes multiple URLs in parallel using retry logic.
 */
export const scrapeMultiple = async (urls: string[]): Promise<ScrapedContent[]> => {
    logger.info(`Scraping ${urls.length} URLs in parallel`, CONTEXT);

    const results = await retryMultiple(urls, scrapePage, {
        maxAttempts: 2,
        initialDelayMs: 500,
    });

    return results.map((res) => {
        if (res.result) {
            return res.result;
        }
        return {
            url: res.item,
            title: 'Failed to load',
            content: 'Unable to retrieve content from this source.',
            success: false,
        };
    });
};
