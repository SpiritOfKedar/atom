# Complete Implementation Prompt: Perplexity-Like Backend Features

## Project Context
You are working on an AI-powered search engine (Perplexity clone) that currently has basic RAG functionality. The codebase has:
- Basic web search via Serper API
- Simple web scraping with Cheerio
- Basic RAG pipeline (Search → Scrape → LLM)
- Streaming responses
- Conversation storage in MongoDB
- Clerk authentication

## Objective
Transform this basic RAG system into a sophisticated, Perplexity-like backend with intelligent search, context management, source ranking, and answer quality assessment.

---

## PHASE 1: CORE INTELLIGENCE (Priority: CRITICAL)

### 1.1 Multi-Turn Conversation Context
**Problem**: Each query is treated independently. No context from previous messages.

**Requirements**:
- Modify `chat.controller.ts` to fetch conversation history when `conversationId` is provided
- Pass last 6-8 messages to RAG pipeline
- Update `rag.service.ts` to accept `conversationHistory: IMessage[]` parameter
- Build enhanced query that includes conversation context
- Format: "Previous conversation:\n[user/assistant messages]\n\nCurrent question: [query]"
- Use enhanced query for web search to find contextually relevant results

**Files to modify**:
- `server/src/controllers/chat.controller.ts`
- `server/src/services/rag.service.ts`
- `server/src/services/llm.service.ts`

**Implementation details**:
```typescript
// In chat.controller.ts
- Fetch conversation if conversationId exists
- Extract last 6 messages (alternating user/assistant)
- Pass to runRAGPipeline(query, res, onToken, onSources, conversationHistory)

// In rag.service.ts
- Accept conversationHistory?: IMessage[] parameter
- Build context string from history
- Create enhancedQuery = context + current query
- Use enhancedQuery for searchWeb() call
```

---

### 1.2 Source Ranking and Relevance Scoring
**Problem**: Sources are used in search order, no intelligence about quality/relevance.

**Requirements**:
- Create new service: `server/src/services/source-ranking.service.ts`
- Implement ranking algorithm with three scores:
  - **Relevance Score (50% weight)**: Keyword matching, content quality, query alignment
  - **Freshness Score (20% weight)**: URL patterns, date detection, news domains
  - **Authority Score (30% weight)**: Domain reputation (edu, gov, wikipedia, etc.)
- Rank sources by total score (relevance * 0.5 + freshness * 0.2 + authority * 0.3)
- Sort sources descending by total score
- Use top-ranked sources first in RAG context

**Files to create**:
- `server/src/services/source-ranking.service.ts`

**Files to modify**:
- `server/src/services/rag.service.ts` (use ranking after scraping)
- `server/src/types/index.ts` (add RankedSource interface)

**Implementation details**:
```typescript
interface RankedSource extends SearchResult {
    relevanceScore: number;
    freshnessScore: number;
    authorityScore: number;
    totalScore: number;
}

export const rankSources = (
    searchResults: SearchResult[],
    scrapedContents: ScrapedContent[],
    query: string
): RankedSource[]

// Scoring functions:
- calculateRelevance(content, query): keyword density, match count
- calculateFreshness(url): check for dates, news domains, recent patterns
- calculateAuthority(url): domain whitelist (wikipedia, .edu, .gov, nature.com, etc.)
```

---

### 1.3 Query Expansion and Optimization
**Problem**: Direct user query may not be optimal for search engines.

**Requirements**:
- Create new service: `server/src/services/query-optimization.service.ts`
- Use LLM (gpt-4o-mini) to expand/refine queries
- Generate 2-3 improved search queries
- Select best query or combine multiple queries
- Handle ambiguous queries, add context, improve keywords
- Cache optimized queries to reduce LLM calls

**Files to create**:
- `server/src/services/query-optimization.service.ts`

**Files to modify**:
- `server/src/services/rag.service.ts` (optimize query before search)

**Implementation details**:
```typescript
export const optimizeQuery = async (query: string): Promise<string> => {
    // Use LLM to expand query
    // Return improved query
    // Cache results
}

// Prompt: "Given this search query, generate an improved version that would find better results. Return only the improved query."
```

---

### 1.4 Source Deduplication
**Problem**: Duplicate sources from same domain can appear.

**Requirements**:
- Implement domain-based deduplication
- Keep only first occurrence from each domain
- Optionally: content similarity detection (future enhancement)
- Apply deduplication after ranking, before RAG context building

**Files to modify**:
- `server/src/services/rag.service.ts` (add deduplication step)

**Implementation details**:
```typescript
export const deduplicateSources = (sources: RankedSource[]): RankedSource[] => {
    const seenDomains = new Set<string>();
    return sources.filter(source => {
        const domain = new URL(source.link).hostname;
        if (seenDomains.has(domain)) return false;
        seenDomains.add(domain);
        return true;
    });
}
```

---

## PHASE 2: QUALITY IMPROVEMENTS (Priority: HIGH)

### 2.1 Context Window Optimization
**Problem**: Fixed 1500 chars per source, no intelligent extraction.

**Requirements**:
- Create intelligent content extraction in `scrape.service.ts`
- Score sentences by relevance to query
- Extract top 10-15 most relevant sentences
- Maintain coherence (keep sentences in order when possible)
- Increase max content length to 2000-2500 chars for top sources
- Use less content for lower-ranked sources

**Files to modify**:
- `server/src/services/scrape.service.ts`

**Implementation details**:
```typescript
export const extractRelevantContent = (
    content: string, 
    query: string, 
    maxLength: number
): string => {
    // Split into sentences
    // Score each sentence by keyword matches
    // Sort by score
    // Take top sentences maintaining order
    // Return up to maxLength
}
```

---

### 2.2 Answer Quality Validation
**Problem**: No validation that answer is well-supported by sources.

**Requirements**:
- Create new service: `server/src/services/answer-validation.service.ts`
- Use LLM to validate answer against sources
- Check for unsupported claims
- Calculate confidence score (0-1)
- Flag potential hallucinations
- Return validation result with issues list

**Files to create**:
- `server/src/services/answer-validation.service.ts`

**Files to modify**:
- `server/src/services/rag.service.ts` (validate after streaming)
- `server/src/controllers/chat.controller.ts` (include validation in response)

**Implementation details**:
```typescript
interface ValidationResult {
    isValid: boolean;
    confidence: number;
    issues: string[];
    supportedClaims: number;
    totalClaims: number;
}

export const validateAnswer = async (
    answer: string,
    sources: RAGContext[]
): Promise<ValidationResult>
```

---

### 2.3 Caching Layer
**Problem**: No caching, repeated queries hit APIs every time.

**Requirements**:
- Install Redis client: `npm install ioredis @types/ioredis`
- Create new service: `server/src/services/cache.service.ts`
- Cache search results (TTL: 1 hour)
- Cache scraped content (TTL: 6 hours)
- Cache optimized queries (TTL: 24 hours)
- Cache final answers (TTL: 1 hour)
- Use query hash as cache key
- Add cache hit/miss logging

**Files to create**:
- `server/src/services/cache.service.ts`
- `server/src/config/redis.ts`

**Files to modify**:
- `server/src/services/search.service.ts` (check cache first)
- `server/src/services/scrape.service.ts` (check cache first)
- `server/src/services/query-optimization.service.ts` (check cache first)
- `server/src/services/rag.service.ts` (cache final results)
- `server/src/config/env.ts` (add REDIS_URL)

**Dependencies to add**:
```json
"ioredis": "^5.3.2",
"@types/ioredis": "^5.0.0"
```

---

## PHASE 3: ADVANCED FEATURES (Priority: MEDIUM)

### 3.1 Follow-Up Question Generation
**Problem**: No suggested follow-up questions after answer.

**Requirements**:
- Generate 3-4 relevant follow-up questions after answer
- Use LLM to create contextually relevant questions
- Questions should be specific and actionable
- Send follow-up questions as separate SSE event
- Display in UI as clickable suggestions

**Files to modify**:
- `server/src/services/llm.service.ts` (add generateFollowUpQuestions function)
- `server/src/services/rag.service.ts` (generate after answer)
- `server/src/controllers/chat.controller.ts` (send follow-ups to client)
- `client/app/page.tsx` (display follow-up questions)

**Implementation details**:
```typescript
export const generateFollowUpQuestions = async (
    query: string,
    answer: string,
    sources: RAGContext[]
): Promise<string[]> => {
    // Use LLM to generate 3-4 follow-up questions
    // Return array of questions
}

// Send as: { type: 'followUps', data: ['question1', 'question2', ...] }
```

---

### 3.2 Multiple Search Strategies
**Problem**: Only one search type (general web search).

**Requirements**:
- Add search type parameter: 'web' | 'news' | 'academic' | 'social'
- Modify Serper API calls to support different search types
- Add search type selection in query optimization
- Allow user to specify search type (future: UI toggle)
- Combine results from multiple strategies if needed

**Files to modify**:
- `server/src/services/search.service.ts` (add searchType parameter)
- `server/src/services/rag.service.ts` (support multiple strategies)
- `server/src/types/index.ts` (add SearchType enum)

**Implementation details**:
```typescript
type SearchType = 'web' | 'news' | 'academic';

export const searchWeb = async (
    query: string, 
    numResults: number = 5,
    searchType: SearchType = 'web'
): Promise<SearchResult[]>
```

---

### 3.3 Enhanced Source Metadata
**Problem**: Limited source information (title, link, favicon only).

**Requirements**:
- Extract publication date from pages
- Extract author information
- Extract domain category (news, academic, blog, etc.)
- Extract reading time estimate
- Store in source metadata
- Display in UI (optional)

**Files to modify**:
- `server/src/services/scrape.service.ts` (extract metadata)
- `server/src/types/index.ts` (enhance SearchResult interface)
- `server/src/models/conversation.model.ts` (update ISource interface)

**Implementation details**:
```typescript
interface EnhancedSource extends SearchResult {
    publishedDate?: Date;
    author?: string;
    category?: 'news' | 'academic' | 'blog' | 'forum' | 'other';
    readingTime?: number; // minutes
}
```

---

### 3.4 Answer Summarization Options
**Problem**: Fixed answer format, no customization.

**Requirements**:
- Add answer style parameter: 'concise' | 'detailed' | 'bullet-points'
- Modify LLM prompt based on style
- Allow user preference (future: UI setting)
- Default to 'detailed' for now

**Files to modify**:
- `server/src/services/llm.service.ts` (add style parameter)
- `server/src/services/rag.service.ts` (pass style to LLM)
- `server/src/types/index.ts` (add AnswerStyle type)

---

## PHASE 4: INFRASTRUCTURE (Priority: MEDIUM)

### 4.1 Error Recovery and Retry Logic
**Problem**: Single failure points, no retry mechanisms.

**Requirements**:
- Add retry logic for search API calls (3 attempts with exponential backoff)
- Add retry logic for scraping (2 attempts per URL)
- Graceful degradation: if some sources fail, continue with successful ones
- Better error messages for users
- Log retry attempts

**Files to modify**:
- `server/src/services/search.service.ts` (add retry wrapper)
- `server/src/services/scrape.service.ts` (add retry per URL)
- `server/src/utils/retry.ts` (create retry utility)

---

### 4.2 Rate Limiting and Request Management
**Problem**: No protection against abuse, no rate limiting.

**Requirements**:
- Install: `npm install express-rate-limit`
- Add rate limiting middleware
- Limit: 20 requests per minute per IP
- Limit: 100 requests per hour per authenticated user
- Return 429 status with retry-after header
- Log rate limit violations

**Files to create**:
- `server/src/middleware/rate-limit.middleware.ts`

**Files to modify**:
- `server/src/app.ts` (add rate limiting)

---

### 4.3 Request Tracing and Monitoring
**Problem**: No request IDs, hard to trace issues.

**Requirements**:
- Add request ID middleware (UUID)
- Include request ID in all logs
- Return request ID in error responses
- Add performance timing for each pipeline stage
- Log pipeline stage durations

**Files to create**:
- `server/src/middleware/request-id.middleware.ts`

**Files to modify**:
- `server/src/app.ts` (add middleware)
- `server/src/utils/logger.ts` (include request ID)
- All services (log with request ID)

---

### 4.4 Health Check Enhancement
**Problem**: Basic health check doesn't verify dependencies.

**Requirements**:
- Check MongoDB connection status
- Check Redis connection status (if implemented)
- Check OpenAI API connectivity
- Check Serper API connectivity
- Return detailed health status
- Add `/api/health/detailed` endpoint

**Files to modify**:
- `server/src/controllers/chat.controller.ts` (enhance healthCheck)

---

## IMPLEMENTATION ORDER

### Week 1: Core Intelligence
1. Multi-turn conversation context
2. Source ranking and relevance scoring
3. Query expansion and optimization
4. Source deduplication

### Week 2: Quality Improvements
5. Context window optimization
6. Answer quality validation
7. Caching layer (Redis)

### Week 3: Advanced Features
8. Follow-up question generation
9. Multiple search strategies
10. Enhanced source metadata

### Week 4: Infrastructure
11. Error recovery and retry logic
12. Rate limiting
13. Request tracing
14. Enhanced health checks

---

## TECHNICAL REQUIREMENTS

### Dependencies to Add
```json
{
  "ioredis": "^5.3.2",
  "@types/ioredis": "^5.0.0",
  "express-rate-limit": "^7.1.5",
  "uuid": "^9.0.1",
  "@types/uuid": "^9.0.6"
}
```

### Environment Variables to Add
```env
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20
CACHE_TTL_SEARCH=3600
CACHE_TTL_SCRAPE=21600
CACHE_TTL_ANSWER=3600
```

### Code Style Requirements
- Use TypeScript strict mode
- Add JSDoc comments for all new functions
- Follow existing code patterns and naming conventions
- Add error handling for all async operations
- Use logger instead of console.log
- Add type definitions for all new interfaces

### Testing Requirements
- Test multi-turn conversations with context
- Test source ranking with various queries
- Test query optimization with ambiguous queries
- Test caching hit/miss scenarios
- Test error recovery and retry logic
- Test rate limiting

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ Conversation history is used in search queries
- ✅ Sources are ranked by relevance/authority/freshness
- ✅ Queries are optimized before searching
- ✅ Duplicate sources are removed

### Phase 2 Complete When:
- ✅ Most relevant content is extracted from sources
- ✅ Answers are validated against sources
- ✅ Caching reduces API calls by 40%+

### Phase 3 Complete When:
- ✅ Follow-up questions are generated and displayed
- ✅ Multiple search types are supported
- ✅ Enhanced source metadata is extracted

### Phase 4 Complete When:
- ✅ Retry logic handles transient failures
- ✅ Rate limiting prevents abuse
- ✅ Request tracing enables debugging
- ✅ Health checks verify all dependencies

---

## NOTES

1. **Backward Compatibility**: Ensure existing API endpoints continue to work
2. **Performance**: All new features should not significantly slow down response times
3. **Error Handling**: Graceful degradation - if new features fail, fall back to basic functionality
4. **Logging**: Add comprehensive logging for debugging and monitoring
5. **Documentation**: Update README.md with new features and environment variables

---

## START IMPLEMENTATION

Begin with Phase 1, Feature 1.1 (Multi-Turn Conversation Context). This is the foundation for all other improvements. Work through each feature systematically, testing as you go.

Good luck! 🚀
