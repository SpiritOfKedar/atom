import { NextResponse } from 'next/server';

const SERPER_API_URL = 'https://google.serper.dev/news';

const TOPIC_QUERIES: Record<string, string> = {
    'Top': 'breaking news today',
    'Tech & Science': 'technology science news today',
    'Finance': 'stock market finance business news today',
    'Arts & Culture': 'arts culture entertainment news today',
    'Sports': 'sports news today',
    'World': 'world news today',
    'Politics': 'politics government news today',
    'Health': 'health medical news today',
};

interface SerperNewsResult {
    title: string;
    link: string;
    snippet: string;
    date?: string;
    source: string;
    imageUrl?: string;
}

interface SerperNewsResponse {
    news: SerperNewsResult[];
}

/**
 * Fetches the og:image from an article URL.
 * Returns null on any failure (timeout, parse error, missing tag).
 */
async function fetchOgImage(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Atom/1.0)',
            },
        });
        clearTimeout(timeout);

        if (!res.ok) return null;

        // Only read the first 20KB — og:image is always in <head>
        const reader = res.body?.getReader();
        if (!reader) return null;

        let html = '';
        const decoder = new TextDecoder();
        while (html.length < 20000) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
        }
        reader.cancel();

        // Match og:image meta tag
        const match = html.match(
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        ) || html.match(
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
        );

        return match?.[1] || null;
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'Top';
    const topic = searchParams.get('topic') || '';

    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'SERPER_API_KEY not configured' }, { status: 500 });
    }

    try {
        const query = topic
            ? TOPIC_QUERIES[topic] || `${topic} news today`
            : TOPIC_QUERIES[tab] || 'trending news today';

        const res = await fetch(SERPER_API_URL, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                num: 12,
                gl: 'us',
                hl: 'en',
            }),
        });

        if (!res.ok) {
            console.error('Serper news API failed:', res.status);
            return NextResponse.json({ error: 'Failed to fetch news' }, { status: 502 });
        }

        const json: SerperNewsResponse = await res.json();

        if (!json.news || json.news.length === 0) {
            return NextResponse.json({ hero: null, items: [] });
        }

        // Fetch OG images in parallel for all articles
        const ogImages = await Promise.all(
            json.news.map((article) => fetchOgImage(article.link))
        );

        const items = json.news.map((article, i) => ({
            title: article.title,
            description: article.snippet || '',
            imageUrl: ogImages[i] || article.imageUrl || null,
            source: article.source,
            sourceIcon: getFaviconUrl(article.link),
            timeAgo: article.date || 'Recently',
            link: article.link,
            category: topic || tab,
        }));

        // Hero = first item with an image
        let heroIndex = items.findIndex((item) => item.imageUrl);
        if (heroIndex === -1) heroIndex = 0;

        const hero = items[heroIndex];
        const listItems = items.filter((_, i) => i !== heroIndex);

        return NextResponse.json({
            hero,
            items: listItems,
        });
    } catch (error) {
        console.error('Discover API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function getFaviconUrl(link: string): string {
    try {
        const url = new URL(link);
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch {
        return '';
    }
}
