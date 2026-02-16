# Atom

Perplexity-style AI search engine. Searches the web in real time, scrapes and ranks sources, streams a cited answer via SSE.

**Next.js 16 · Express 5 · TypeScript · MongoDB · Redis**

## How It Works

```
Query → Optimize → Search (Serper) → Scrape (Cheerio/BullMQ) → Rank Sources → Stream LLM Answer → Validate → Store Memory
```

- **Multi-provider LLM** — OpenAI GPT-4o-mini, Claude 3.5 Haiku, Gemini 2.5 Flash (native streaming for all)
- **Source ranking** — relevance, domain authority, freshness
- **Vector memory** — MongoDB Atlas Search for long-term recall across conversations
- **Answer validation** — post-generation hallucination check
- **Search modes** — web, news, academic

## Setup

```bash
git clone https://github.com/your-username/atom.git && cd atom
```

```bash
# Server
cd server && cp .env.example .env && npm install && npm run dev

# Client (in another terminal)
cd client && cp .env.example .env && npm install && npm run dev
```

Fill in your `.env` files — at minimum you need one LLM key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`). `SERPER_API_KEY` for real search (falls back to mock without it). MongoDB required, Redis optional.

## API

### `POST /api/chat`

```json
{
  "query": "What is quantum computing?",
  "searchType": "web | news | academic",
  "answerStyle": "concise | detailed | bullet-points",
  "modelProvider": "openai | claude | gemini",
  "conversationId": "optional"
}
```

Returns SSE stream with events: `status`, `sources`, `token`, `validation`, `followUps`, `conversationId`, `error`.

### Other endpoints

- `GET /api/health` — health check
- `GET /api/conversations` — list conversations (authed)
- `GET /api/conversations/:id` — get conversation (authed)
- `DELETE /api/conversations/:id` — delete conversation (authed)

## License

MIT
