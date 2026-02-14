# ⚛️ Atom — AI-Powered Search Engine

A full-stack, Perplexity-style AI search engine built with **Next.js 16** and **Express 5**. Ask any question — Atom searches the web in real time, scrapes and ranks sources, and streams a cited answer using the LLM of your choice.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-5-000?logo=express)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Real-Time Web Search** | Searches Google via Serper.dev API with web, news, and academic modes |
| 🤖 **Multi-Provider LLM** | Choose between **OpenAI GPT-4o-mini**, **Claude 3.5 Haiku**, or **Gemini 2.5 Flash** |
| ⚡ **Native Streaming** | True token-by-token SSE streaming for all three providers |
| 📚 **Source Citations** | Every claim is cited with `[1]`, `[2]`, etc. linked to ranked sources |
| 🧠 **Long-Term Memory** | Vector-based memory via MongoDB Atlas Search remembers past conversations |
| 📊 **Source Ranking** | Sources scored by relevance (50%), authority (30%), and freshness (20%) |
| ✅ **Answer Validation** | LLM-powered post-generation validation checks for hallucinations |
| 💬 **Conversation History** | Persistent conversations with follow-up question generation |
| 🔒 **Authentication** | Optional Clerk auth for saving conversations and user memory |
| 🎨 **Modern UI** | Dark-mode interface with shadcn/ui, Framer Motion, and Tailwind CSS v4 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 Client                    │
│  React 19 · Tailwind v4 · shadcn/ui · Clerk Auth       │
└────────────────────────┬────────────────────────────────┘
                         │ SSE Stream
┌────────────────────────▼────────────────────────────────┐
│                  Express 5 API Server                   │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │  Search   │→ │  Scrape  │→ │  Source Ranking    │    │
│  │ (Serper)  │  │(Cheerio) │  │ Rel+Auth+Fresh     │    │
│  └──────────┘  └──────────┘  └─────────┬──────────┘    │
│                                         │               │
│  ┌──────────┐  ┌──────────┐  ┌─────────▼──────────┐    │
│  │  Memory  │→ │  Query   │→ │  LLM Streaming     │    │
│  │ (Vector) │  │ Optimize │  │ OpenAI/Claude/Gemini│    │
│  └──────────┘  └──────────┘  └────────────────────┘    │
│                                                         │
│  MongoDB · Redis · BullMQ · LangChain                   │
└─────────────────────────────────────────────────────────┘
```

### RAG Pipeline Flow

1. **Query Optimization** — LLM refines the user's query for better search results
2. **Memory Recall** — Vector similarity search retrieves relevant past interactions
3. **Web Search** — Serper.dev fetches top results (web / news / academic)
4. **Content Scraping** — Cheerio extracts and cleans page content (via BullMQ queue)
5. **Source Ranking** — Scores sources by relevance, domain authority, and freshness
6. **Context Building** — Top sources are deduplicated, query-relevant content extracted
7. **LLM Streaming** — Native streaming response with inline citations
8. **Answer Validation** — Post-generation check for hallucinations and unsupported claims
9. **Follow-Ups** — Generates contextual follow-up questions
10. **Memory Storage** — Stores Q&A pair as a vector embedding for future recall

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Express 5** | HTTP server with SSE streaming |
| **TypeScript 5.9** | Type safety across the codebase |
| **OpenAI SDK** | GPT-4o-mini completions + text-embedding-3-small |
| **Anthropic SDK** | Claude 3.5 Haiku with native streaming |
| **Google Generative AI** | Gemini 2.5 Flash with native streaming |
| **MongoDB + Mongoose** | Conversations, user data |
| **LangChain + MongoDB Atlas** | Vector search for long-term memory |
| **Redis + BullMQ** | Job queue for parallel web scraping |
| **Cheerio** | HTML parsing and content extraction |
| **Clerk** | JWT-based authentication |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | App Router, server components |
| **React 19** | UI rendering |
| **Tailwind CSS v4** | Styling |
| **shadcn/ui + Radix** | Component library |
| **Framer Motion** | Animations |
| **Clerk** | Auth UI components |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **MongoDB** — local or Atlas (required)
- **Redis** — optional, falls back to in-memory cache
- At least **one LLM API key** (OpenAI, Anthropic, or Gemini)

### Installation

```bash
# Clone
git clone https://github.com/your-username/atom.git
cd atom
```

**Server:**

```bash
cd server
cp .env.example .env        # ← fill in your API keys
npm install
npm run dev                  # starts on http://localhost:3001
```

**Client:**

```bash
cd client
cp .env.example .env         # ← fill in Clerk keys
npm install
npm run dev                  # starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) and start searching.

---

## ⚙️ Environment Variables

### Server (`server/.env`)

| Variable | Description | Required |
|----------|-------------|:--------:|
| `OPENAI_API_KEY` | OpenAI API key | ✱ |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | ✱ |
| `GEMINI_API_KEY` | Google Gemini API key | ✱ |
| `SERPER_API_KEY` | Serper.dev search API key | No (uses mock) |
| `MONGODB_URI` | MongoDB connection string | No (default: `localhost`) |
| `REDIS_URL` | Redis connection URL | No (in-memory fallback) |
| `CLERK_SECRET_KEY` | Clerk secret key | No (auth disabled) |
| `PORT` | Server port | No (default: `3001`) |
| `CORS_ORIGIN` | Allowed frontend origin | No (default: `localhost:3000`) |
| `NODE_ENV` | `development` or `production` | No (default: `development`) |

> ✱ At least **one** LLM provider key is required.

### Client (`client/.env`)

| Variable | Description | Required |
|----------|-------------|:--------:|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route | No (default: `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route | No (default: `/sign-up`) |

> ⚠️ **Never commit `.env` files.** Both are covered by `.gitignore`. Use the `.env.example` templates.

---

## 📁 Project Structure

```
atom/
├── client/                      # Next.js 16 frontend
│   ├── app/
│   │   ├── chat/               # Main chat page
│   │   ├── discover/           # News discovery page
│   │   ├── landing/            # Landing page
│   │   ├── sign-in/            # Clerk sign-in
│   │   ├── sign-up/            # Clerk sign-up
│   │   └── api/discover/       # News API route
│   ├── components/             # React components
│   │   ├── chat-interface.tsx   # Core chat UI with streaming
│   │   ├── sidebar.tsx          # Conversation sidebar
│   │   ├── source-carousel.tsx  # Source cards carousel
│   │   └── ui/                  # shadcn/ui primitives
│   └── lib/                    # Utilities & API helpers
│
└── server/                      # Express 5 backend
    └── src/
        ├── config/              # DB, Redis, queue, env config
        ├── controllers/         # HTTP request handlers
        ├── middleware/           # Auth, rate-limit, request-id
        ├── models/              # Mongoose schemas
        ├── queues/              # BullMQ job definitions
        ├── routes/              # Express route definitions
        ├── services/
        │   ├── rag.service.ts           # Core RAG pipeline orchestrator
        │   ├── llm.service.ts           # Multi-provider LLM abstraction
        │   ├── search.service.ts        # Web search (Serper.dev)
        │   ├── scrape.service.ts        # Content scraping (Cheerio)
        │   ├── source-ranking.service.ts # Relevance/authority/freshness scoring
        │   ├── query-optimization.service.ts # LLM-based query refinement
        │   ├── answer-validation.service.ts  # Hallucination detection
        │   ├── vector-store.service.ts  # Memory via vector search
        │   ├── cache.service.ts         # Redis + in-memory cache
        │   └── conversation.service.ts  # Conversation CRUD
        ├── types/               # TypeScript type definitions
        ├── utils/               # Logger, retry, error classes
        └── workers/             # BullMQ worker processes
```

---

## 📡 API Reference

### `POST /api/chat`

Runs the full RAG pipeline and streams the response via SSE.

**Request Body:**
```json
{
  "query": "What is quantum computing?",
  "searchType": "web",
  "answerStyle": "detailed",
  "modelProvider": "openai",
  "conversationId": "optional-id-for-follow-ups"
}
```

| Field | Type | Options |
|-------|------|---------|
| `query` | `string` | Required, max 500 chars |
| `searchType` | `string` | `web` · `news` · `academic` |
| `answerStyle` | `string` | `concise` · `detailed` · `bullet-points` |
| `modelProvider` | `string` | `openai` · `claude` · `gemini` |
| `conversationId` | `string` | For continuing a conversation |

**SSE Response Events:**

| Event Type | Payload | Description |
|------------|---------|-------------|
| `status` | `string` | Pipeline progress updates |
| `sources` | `Source[]` | Ranked source list with metadata |
| `token` | `string` | Streamed answer tokens |
| `validation` | `object` | Answer quality validation result |
| `followUps` | `string[]` | Suggested follow-up questions |
| `conversationId` | `string` | ID for follow-up requests |
| `error` | `string` | Error message (sanitized) |

### `GET /api/health`

Basic health check. Returns `{ status: "ok" }`.

### `GET /api/health/detailed`

Detailed dependency status. **Requires authentication.**

### `GET /api/conversations`

List user's conversations. **Requires authentication.**

### `GET /api/conversations/:id`

Get a specific conversation. **Requires authentication.**

### `DELETE /api/conversations/:id`

Delete a conversation. **Requires authentication.**

---

## 🔒 Security

- All API keys loaded from environment variables, never hardcoded
- `.env` files excluded from version control via `.gitignore`
- Internal error messages sanitized before reaching clients
- Detailed health endpoint protected behind authentication
- Rate limiting on all API routes (`express-rate-limit`)
- Request ID tracing for debugging
- CORS restricted to configured origin
- Clerk JWT verification for authenticated endpoints

---

## 📜 License

MIT
