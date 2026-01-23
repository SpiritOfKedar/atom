# Atom - AI Search Engine

A RAG-powered AI search engine that provides real-time answers with source citations.

![Atom Search](https://img.shields.io/badge/Atom-AI%20Search-blue)

## Features

- 🔍 **Web Search** - Real-time search via Serper.dev API
- 📄 **Content Scraping** - Intelligent extraction from web pages
- 🤖 **AI Answers** - OpenAI GPT-4o-mini powered responses
- 📚 **Source Citations** - Every answer includes cited sources
- ⚡ **Streaming** - Real-time token streaming for fast responses
- 🎨 **Modern UI** - Dark mode with shadcn/ui components

## Tech Stack

### Backend
- Express.js with TypeScript
- OpenAI SDK for LLM integration
- Cheerio for web scraping
- Server-Sent Events (SSE) for streaming

### Frontend
- Next.js 16 with App Router
- Tailwind CSS v4
- shadcn/ui components
- React 19

## Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key
- Serper.dev API key (optional, uses mock data if not provided)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/atom.git
   cd atom
   ```

2. **Set up the server**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your API keys
   npm install
   npm run dev
   ```

3. **Set up the client**
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Server (`/server/.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `SERPER_API_KEY` | Serper.dev API key | No (uses mock) |
| `PORT` | Server port | No (default: 3001) |
| `CORS_ORIGIN` | Allowed CORS origin | No (default: localhost) |

## Project Structure

```
atom/
├── client/                 # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # Utilities
└── server/                # Express backend
    └── src/
        ├── config/        # Environment config
        ├── controllers/   # Request handlers
        ├── routes/        # API routes
        ├── services/      # Business logic
        ├── types/         # TypeScript types
        └── utils/         # Helpers
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Run RAG pipeline (SSE stream) |
| GET | `/api/health` | Health check |

## License

MIT
