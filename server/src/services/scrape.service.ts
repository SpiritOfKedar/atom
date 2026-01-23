import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedContent } from '../types';
import { logger } from '../utils/logger';

const CONTEXT = 'ScrapeService';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 3000;
const MAX_CONTENT_LENGTH = 1500; // Characters per source

/**
 * Scrapes and cleans content from a single URL.
 */
export const scrapePage = async (url: string): Promise<ScrapedContent> => {
    const result: ScrapedContent = {
        url,
        title: '',
        content: '',
        success: false,
    };

    try {
        logger.debug(`Scraping: ${url}`, CONTEXT);

        const { data } = await axios.get<string>(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: TIMEOUT_MS,
            maxRedirects: 3,
        });

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
        result.content = mainContent
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, MAX_CONTENT_LENGTH);

        if (result.content.length > 0) {
            result.success = true;
            logger.debug(`Scraped ${result.content.length} chars from ${url}`, CONTEXT);
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
 * Scrapes multiple URLs in parallel.
 */
export const scrapeMultiple = async (urls: string[]): Promise<ScrapedContent[]> => {
    logger.info(`Scraping ${urls.length} URLs in parallel`, CONTEXT);

    const results = await Promise.allSettled(urls.map(scrapePage));

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return {
            url: urls[index],
            title: 'Failed to load',
            content: 'Unable to retrieve content from this source.',
            success: false,
        };
    });
};
