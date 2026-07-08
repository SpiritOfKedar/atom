# Atom

Perplexity-style AI search engine. Searches the web in real time, scrapes and ranks sources, streams a cited answer via SSE.

**Next.js 16 · Express 5 · TypeScript · MongoDB · Redis**

## How It Works

```
Query → Optimize → Search (Serper) → Scrape (Cheerio/BullMQ) → Rank Sources → Stream LLM Answer → Validate → Store Memory
```

- **Multi-provider LLM** — NVIDIA NIM (GLM-5.2, Mistral Medium, Nemotron Ultra, MiniMax M3, DeepSeek V4), OpenAI GPT-4o-mini, Claude 3.5 Haiku, Gemini 2.5 Flash (native streaming for all)
- **Source ranking** — relevance, domain authority, freshness
- **Vector memory** — MongoDB Atlas Search for long-term recall across conversations (authenticated users only)
- **Answer validation** — post-generation hallucination check
- **Search modes** — web, news, academic

## Setup

```bash
git clone https://github.com/SpiritOfKedar/atom.git && cd atom
```

```bash
# Server
cd server && cp .env.example .env && npm install && npm run dev

# Client (in another terminal)
cd client && cp .env.example .env && npm install && npm run dev
```

Fill in your `.env` files — at minimum you need one LLM key (`NVIDIA_API_KEY` / `NVAPI_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`). `SERPER_API_KEY` is required in production. MongoDB required, Redis recommended in production.

## Production Deployment (Vercel + Railway/Render)

### Vercel (client)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Public URL of the Express API (e.g. `https://your-api.railway.app`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `SERPER_API_KEY` | Serper API key for Discover news feed |

In the Clerk dashboard, add your Vercel production (and preview) domains to allowed origins.

### Railway / Render (API)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | Set by platform (often injected automatically) |
| `CORS_ORIGIN` | Your Vercel app URL (e.g. `https://your-app.vercel.app`) |
| `MONGODB_URI` | MongoDB Atlas connection string (TLS, with credentials) |
| `REDIS_URL` | Managed Redis URL (recommended for cache, BullMQ, guest quotas) |
| `SERPER_API_KEY` | Serper API key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| At least one LLM key | `NVIDIA_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` |

**Build & start commands:**

```bash
npm run build
npm start
```

**Health probes:**

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready` (returns 503 if MongoDB is disconnected)

### MongoDB Atlas vector index

Vector memory requires a MongoDB Atlas Search vector index on the `memories` collection:

1. Create an Atlas cluster with authentication and network access (allow Railway/Render egress IPs).
2. In Atlas Search, create a **vector search** index on collection `memories`:
   - Index name: `vector_index`
   - Field: `embedding` (vector, dimensions matching your embedding model — OpenAI `text-embedding-3-small` uses 1536)
3. Confirm the index name matches [`server/src/services/vector-store.service.ts`](server/src/services/vector-store.service.ts).

### Guest access

- Unauthenticated users get `GUEST_MESSAGE_LIMIT` free chat requests (default: 2), enforced server-side by IP.
- Set `REQUIRE_AUTH_FOR_CHAT=true` in production to require sign-in for all chat requests.
- Vector memory is stored only for authenticated users.

## API

### `POST /api/chat`

```json
{
  "query": "What is quantum computing?",
  "searchType": "web | news | academic",
  "answerStyle": "concise | detailed | bullet-points",
  "modelProvider": "z-ai/glm-5.2 | mistralai/mistral-medium-3.5-128b | nvidia/nemotron-3-ultra-550b-a55b | minimaxai/minimax-m3 | deepseek-ai/deepseek-v4-pro | deepseek-ai/deepseek-v4-flash | openai | claude | gemini",
  "conversationId": "optional"
}
```

Returns SSE stream with events: `status`, `sources`, `token`, `validation`, `followUps`, `conversationId`, `error`.

Requires `Authorization: Bearer <token>` for saved conversations. Guests are rate-limited by IP.

### Other endpoints

- `GET /api/health` — liveness check
- `GET /api/health/ready` — readiness check (MongoDB)
- `GET /api/health/detailed` — dependency status (authenticated)
- `GET /api/conversations` — list conversations (authed)
- `GET /api/conversations/:id` — get conversation (authed)
- `DELETE /api/conversations/:id` — delete conversation (authed)

## Development scripts

| Package | Command | Description |
|---------|---------|-------------|
| server | `npm run dev` | Start API with nodemon |
| server | `npm run build` | Compile TypeScript to `dist/` |
| server | `npm start` | Run compiled production server |
| server | `npm test` | Run unit tests |
| client | `npm run dev` | Start Next.js dev server |
| client | `npm run build` | Production build |

## License

MIT — see [LICENSE](LICENSE).
