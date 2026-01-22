"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize OpenAI
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
});
// Mock Search Function
const searchWeb = async (query) => {
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
const scrapePage = async (url) => {
    try {
        const { data } = await axios_1.default.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 5000
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
            .map((_, el) => $(el).text())
            .get()
            .join(' ')
            .substring(0, 800);
        return text.replace(/\s+/g, ' ').trim() + '...';
    }
    catch (error) {
        console.error(`Failed to scrape ${url}:`, error.message);
        return "Failed to load content.";
    }
};
app.post('/api/chat', async (req, res) => {
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
        const contexts = await Promise.all(searchResults.map(async (result) => {
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
    }
    catch (error) {
        console.error('Pipeline Error:', error);
        res.write(JSON.stringify({ type: 'error', data: 'An error occurred during processing.' }));
        res.end();
    }
});
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
