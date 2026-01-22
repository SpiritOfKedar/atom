import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Stream } from 'openai/streaming';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
});

interface SearchResult {
    title: string;
    link: string;
    favicon: string;
}

interface ScrapedContent extends SearchResult {
    content: string;
}

// Mock Search Function
const searchWeb = async (query: string): Promise<SearchResult[]> => {
    // Simulating a search delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
        {
            title: 'Real-Time Search Engine - Wikipedia',
            link: 'https://en.wikipedia.org/wiki/Real-time_search',
            favicon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico'
        },
        {
            title: 'How to Build a RAG Pipeline with Node.js',
            link: 'https://example.com/rag-pipeline-node',
            favicon: 'https://example.com/favicon.ico'
        },
        {
            title: 'Express.js Documentation',
            link: 'https://expressjs.com/',
            favicon: 'https://expressjs.com/images/favicon.png'
        },
        {
            title: 'OpenAI API Reference',
            link: 'https://platform.openai.com/docs/api-reference',
            favicon: 'https://platform.openai.com/favicon.ico'
        }
    ];
};

const scrapePage = async (url: string): Promise<string> => {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 2000
        });
        const $ = cheerio.load(data);

        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();

        // Explicitly cast to string to satisfy strict null checks if necessary, 
        // though .text() usually returns string. 
        // .map() return type in cheerio can be tricky, ensuring we handle it.
        const text = $('body p')
            .map((_: number, el: any) => $(el).text())
            .get()
            .join(' ')
            .substring(0, 800);

        return text.replace(/\s+/g, ' ').trim() + '...';
    } catch (error: any) {
        console.error(`Failed to scrape ${url}:`, error.message);
        return "Failed to load content.";
    }
};

app.post('/api/chat', async (req: Request, res: Response) => {
    const { query } = req.body;

    if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
    }

    // Set headers for SSE-like streaming
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    try {
        // 1. Search
        const searchResults = await searchWeb(query);

        // 2. Scrape Parallel
        const contexts: ScrapedContent[] = await Promise.all(searchResults.map(async (result) => {
            const content = await scrapePage(result.link);
            return { ...result, content };
        }));

        // 3. Send Sources Metadata immediately
        const sourcesData = searchResults.map(s => ({ title: s.title, link: s.link, favicon: s.favicon }));
        res.write(JSON.stringify({ type: 'sources', data: sourcesData }) + '\n');

        // 4. Synthesize and Stream
        const prompt = `
    Based on the following context, answer the user query. 
    Cite sources as [1], [2], etc. corresponding to the order they are provided.
    
    Context:
    ${contexts.map((c, i) => `[${i + 1}] Title: ${c.title}\nURL: ${c.link}\nContent: ${c.content}`).join('\n\n')}
    
    User Query: ${query}
    `;

        const stream = await openai.chat.completions.create({
            model: 'gpt-4o', // or gpt-3.5-turbo
            messages: [{ role: 'user', content: prompt }],
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(JSON.stringify({ type: 'token', data: content }) + '\n');
            }
        }

        res.end();

    } catch (error) {
        console.error('Pipeline Error:', error);
        res.write(JSON.stringify({ type: 'error', data: 'An error occurred during processing.' }));
        res.end();
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
