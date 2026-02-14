import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Response } from 'express';
import { AnswerStyle, ModelProvider, RAGContext } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { IMessage } from '../models/conversation.model';

const CONTEXT = 'LLMService';

export const PROVIDER_MODELS: Record<ModelProvider, string> = {
    openai: 'gpt-4o-mini',
    claude: 'claude-3-5-haiku-latest',
    gemini: 'gemini-2.5-flash',
};

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

const getOpenAIClient = (): OpenAI => {
    if (!env.openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
    }
    return openaiClient;
};

const getAnthropicClient = (): Anthropic => {
    if (!env.anthropicApiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    if (!anthropicClient) {
        anthropicClient = new Anthropic({ apiKey: env.anthropicApiKey });
    }
    return anthropicClient;
};

const getGeminiClient = (): GoogleGenerativeAI => {
    if (!env.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    if (!geminiClient) {
        geminiClient = new GoogleGenerativeAI(env.geminiApiKey);
    }
    return geminiClient;
};

export const isProviderConfigured = (provider: ModelProvider): boolean => {
    switch (provider) {
        case 'openai':
            return Boolean(env.openaiApiKey);
        case 'claude':
            return Boolean(env.anthropicApiKey);
        case 'gemini':
            return Boolean(env.geminiApiKey);
        default:
            return false;
    }
};

export const resolveModelProvider = (preferred: ModelProvider = 'openai'): ModelProvider => {
    if (isProviderConfigured(preferred)) {
        return preferred;
    }

    const fallbackOrder: ModelProvider[] = ['openai', 'claude', 'gemini'];
    const fallback = fallbackOrder.find(isProviderConfigured);

    if (!fallback) {
        throw new Error('No LLM provider is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.');
    }

    logger.warn(
        `Requested provider "${preferred}" is not configured, falling back to "${fallback}"`,
        CONTEXT
    );
    return fallback;
};

interface CompletionOptions {
    provider?: ModelProvider;
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
}

export const completeText = async ({
    provider = 'openai',
    systemPrompt,
    userPrompt,
    temperature = 0.3,
    maxTokens = 1024,
}: CompletionOptions): Promise<{ text: string; provider: ModelProvider }> => {
    const activeProvider = resolveModelProvider(provider);
    const model = PROVIDER_MODELS[activeProvider];

    switch (activeProvider) {
        case 'openai': {
            const openai = getOpenAIClient();
            const response = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature,
                max_completion_tokens: maxTokens,
            });
            return {
                text: response.choices[0]?.message?.content?.trim() || '',
                provider: activeProvider,
            };
        }

        case 'claude': {
            const anthropic = getAnthropicClient();
            const response = await anthropic.messages.create({
                model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                temperature,
                max_tokens: maxTokens,
            });

            const text = response.content
                .filter((block: { type: string; text?: string }) => block.type === 'text')
                .map((block: { type: string; text?: string }) => block.text || '')
                .join('')
                .trim();

            return { text, provider: activeProvider };
        }

        case 'gemini': {
            const genAI = getGeminiClient();
            const modelClient = genAI.getGenerativeModel({ model });
            const response = await modelClient.generateContent({
                systemInstruction: systemPrompt,
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                },
            });

            return {
                text: response.response.text().trim(),
                provider: activeProvider,
            };
        }

        default:
            throw new Error(`Unsupported model provider: ${activeProvider}`);
    }
};

/**
 * Simulates streaming by chunking pre-completed text.
 * Only used as a last-resort fallback; prefer native streaming for each provider.
 */
const streamTextChunks = async (
    text: string,
    res: Response,
    onToken?: (token: string) => void
): Promise<void> => {
    // Chunk by sentence boundaries or newlines to preserve markdown/formatting
    const chunks = text.split(/(?<=[.!?\n])\s+/);
    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        res.write(JSON.stringify({ type: 'token', data: chunk + ' ' }) + '\n');
        if (onToken) {
            onToken(chunk + ' ');
        }
    }
};

/**
 * Generates a standalone, search-friendly query from a conversational follow-up.
 * Takes into account the previous conversation history.
 */
export const generateStandaloneQuery = async (
    query: string,
    conversationHistory: IMessage[],
    provider: ModelProvider = 'openai'
): Promise<string> => {
    if (!conversationHistory || conversationHistory.length === 0) {
        return query;
    }

    logger.info(`Generating standalone query for: "${query.substring(0, 50)}..."`, CONTEXT);

    try {
        const historyText = conversationHistory
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const prompt = `Given the following conversation history and a follow-up question, rephrase the follow-up question into a standalone, search-engine-friendly query. 

CONVERSATION HISTORY:
${historyText}

FOLLOW-UP QUESTION:
${query}

REPHRASED QUERY:
(Provide only the final search query, no explanation or conversational fillers)`;

        const response = await completeText({
            provider,
            systemPrompt: 'You are an expert at turning conversational follow-up questions into standalone search queries. Return only the query string.',
            userPrompt: prompt,
            temperature: 0.1,
            maxTokens: 50,
        });

        const standaloneQuery = response.text || query;
        logger.info(`Standalone query generated: "${standaloneQuery}"`, CONTEXT);
        return standaloneQuery;

    } catch (error: any) {
        logger.error(`Failed to generate standalone query: ${error.message}`, CONTEXT);
        return query; // Fallback to original
    }
};

const SYSTEM_PROMPT = `You are a helpful AI research assistant that provides accurate, well-sourced answers based on the provided context.

Instructions:
1. Answer the user's question using ONLY the information from the provided sources.
2. ALWAYS cite your sources using the format [1], [2], etc. corresponding to the source numbers in the context.
3. If the sources don't contain enough information to fully answer the question, acknowledge this limitation clearly.
4. Use a neutral, informative tone similar to an encyclopedia.
5. Structure your response clearly with paragraphs. Use markdown formatting (bold, headers, lists) when it improves readability.
6. Never make up information not present in the sources.
7. If sources conflict with each other, mention the discrepancy and present both perspectives.
8. Sources labeled "Memory" contain information from your past interactions with this user — integrate naturally but still cite them.
9. Prioritize more recent information when sources have different dates.`;

/**
 * Builds a prompt for the LLM with the given context.
 * Separates memory contexts from web sources for clarity.
 */
const buildPrompt = (
    query: string,
    contexts: RAGContext[],
    conversationHistory?: IMessage[],
    answerStyle: AnswerStyle = 'detailed'
): string => {
    // Separate memory and web contexts
    const memoryContexts = contexts.filter((ctx) => ctx.url === 'memory://internal');
    const webContexts = contexts.filter((ctx) => ctx.url !== 'memory://internal');

    let contextSection = '';

    if (memoryContexts.length > 0) {
        const memorySection = memoryContexts
            .map((ctx) => `[${ctx.index}] ${ctx.title}\n${ctx.content}`)
            .join('\n\n');
        contextSection += `MEMORIES FROM PAST INTERACTIONS:\n${memorySection}\n\n---\n\n`;
    }

    if (webContexts.length > 0) {
        const webSection = webContexts
            .map((ctx) => `[${ctx.index}] "${ctx.title}" (${ctx.url})\n${ctx.content}`)
            .join('\n\n---\n\n');
        contextSection += `WEB SOURCES:\n${webSection}`;
    }

    const historySection =
        conversationHistory && conversationHistory.length > 0
            ? `Previous conversation:\n${conversationHistory
                .map((msg) => {
                    const speaker = msg.role === 'user' ? 'User' : 'Assistant';
                    return `${speaker}: ${msg.content}`;
                })
                .join('\n')}\n\n`
            : '';

    const introLine =
        conversationHistory && conversationHistory.length > 0
            ? 'Based on the following previous conversation and sources, answer the user\'s question.'
            : 'Based on the following sources, answer the user\'s question.';

    let styleInstructions: string;
    switch (answerStyle) {
        case 'concise':
            styleInstructions =
                'Provide a concise answer in 1-2 short paragraphs, focusing only on the most important points.';
            break;
        case 'bullet-points':
            styleInstructions =
                'Provide the answer primarily as a clear bullet-point list, grouping related points together. Each bullet should still include citations.';
            break;
        case 'detailed':
        default:
            styleInstructions =
                'Provide a detailed, comprehensive answer in 2-4 paragraphs, explaining the key concepts and context while remaining focused.';
            break;
    }

    return `${introLine}

${historySection}${contextSection}

USER QUESTION: ${query}

${styleInstructions}

Always include citations [1], [2], etc. to the relevant sources for any factual claims. Ensure every major claim has at least one citation.`;
};

/**
 * Streams a response from the active LLM provider to the Express response object.
 * Uses native streaming APIs for all providers (OpenAI, Claude, Gemini).
 */
export const streamCompletion = async (
    query: string,
    contexts: RAGContext[],
    res: Response,
    onToken?: (token: string) => void,
    conversationHistory?: IMessage[],
    answerStyle: AnswerStyle = 'detailed',
    provider: ModelProvider = 'openai'
): Promise<string> => {
    const prompt = buildPrompt(query, contexts, conversationHistory, answerStyle);
    const activeProvider = resolveModelProvider(provider);
    const model = PROVIDER_MODELS[activeProvider];

    logger.info(`Streaming completion for query: "${query.substring(0, 50)}..."`, CONTEXT);
    logger.debug(`Context count: ${contexts.length}`, CONTEXT);
    logger.debug(`Using provider=${activeProvider}, model=${model}`, CONTEXT);

    try {
        let fullContent = '';

        // Safe write helper to avoid crashes on client disconnect
        const writeToken = (token: string): void => {
            try {
                if (!res.writableEnded) {
                    res.write(JSON.stringify({ type: 'token', data: token }) + '\n');
                }
            } catch {
                // Client disconnected; we still accumulate fullContent for storage
            }
        };

        if (activeProvider === 'openai') {
            const openai = getOpenAIClient();
            const stream = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                stream: true,
                temperature: 0.3,
                max_completion_tokens: 2048,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    fullContent += content;
                    writeToken(content);
                    if (onToken) {
                        onToken(content);
                    }
                }
            }
        } else if (activeProvider === 'claude') {
            const anthropic = getAnthropicClient();
            const stream = anthropic.messages.stream({
                model,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2048,
            });

            for await (const event of stream) {
                if (
                    event.type === 'content_block_delta' &&
                    event.delta.type === 'text_delta'
                ) {
                    const text = event.delta.text;
                    if (text) {
                        fullContent += text;
                        writeToken(text);
                        if (onToken) {
                            onToken(text);
                        }
                    }
                }
            }
        } else if (activeProvider === 'gemini') {
            const genAI = getGeminiClient();
            const modelClient = genAI.getGenerativeModel({ model });
            const result = await modelClient.generateContentStream({
                systemInstruction: SYSTEM_PROMPT,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                },
            });

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    fullContent += text;
                    writeToken(text);
                    if (onToken) {
                        onToken(text);
                    }
                }
            }
        } else {
            // Fallback: complete then chunk
            const completion = await completeText({
                provider: activeProvider,
                systemPrompt: SYSTEM_PROMPT,
                userPrompt: prompt,
                temperature: 0.3,
                maxTokens: 2048,
            });
            fullContent = completion.text;
            await streamTextChunks(fullContent, res, onToken);
        }

        logger.info(`Streaming completed successfully (${fullContent.length} chars)`, CONTEXT);
        return fullContent;
    } catch (error: any) {
        logger.error(`LLM streaming failed: ${error.message}`, CONTEXT, error);
        throw error;
    }
};

/**
 * Non-streaming completion for testing purposes.
 */
export const getCompletion = async (
    query: string,
    contexts: RAGContext[],
    answerStyle: AnswerStyle = 'detailed',
    provider: ModelProvider = 'openai'
): Promise<string> => {
    const prompt = buildPrompt(query, contexts, undefined, answerStyle);

    const response = await completeText({
        provider,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.3,
        maxTokens: 1024,
    });

    return response.text || '';
};

/**
 * Generates relevant follow-up questions based on the query, answer, and sources.
 * 
 * @param query - Original user query
 * @param answer - Generated answer
 * @param sources - RAG contexts used
 * @returns Array of 3-4 follow-up questions
 */
export const generateFollowUpQuestions = async (
    query: string,
    answer: string,
    sources: RAGContext[],
    provider: ModelProvider = 'openai'
): Promise<string[]> => {
    logger.info(`Generating follow-up questions for query: "${query.substring(0, 50)}..."`, CONTEXT);

    try {
        const sourcesSummary = sources
            .slice(0, 3) // Use top 3 sources for context
            .map((src, idx) => `[${idx + 1}] ${src.title}`)
            .join('\n');

        const prompt = `You are a helpful assistant that generates relevant follow-up questions.

ORIGINAL QUESTION: ${query}

ANSWER PROVIDED:
${answer.substring(0, 500)}${answer.length > 500 ? '...' : ''}

SOURCES USED:
${sourcesSummary}

Generate 3-4 specific, actionable follow-up questions that:
1. Are directly related to the original question and answer
2. Help users explore the topic deeper
3. Are specific and answerable (not too broad)
4. Build naturally on the information provided
5. Are concise (one sentence each)

Return a JSON object with a "questions" array containing the follow-up questions.
Example format: {"questions": ["Question 1?", "Question 2?", "Question 3?"]}`;

        const response = await completeText({
            provider,
            systemPrompt: 'You are a helpful assistant that generates relevant follow-up questions. Return only a JSON object with a "questions" array.',
            userPrompt: prompt,
            temperature: 0.7,
            maxTokens: 200,
        });

        const responseText = response.text || '{}';

        try {
            // Strip markdown code fences if present (LLMs often wrap JSON in ```json...```)
            const cleanedText = responseText
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();

            const parsed = JSON.parse(cleanedText);

            // Handle different possible response formats
            let questions: string[] = [];

            if (Array.isArray(parsed)) {
                questions = parsed;
            } else if (parsed.questions && Array.isArray(parsed.questions)) {
                questions = parsed.questions;
            } else if (parsed.followUpQuestions && Array.isArray(parsed.followUpQuestions)) {
                questions = parsed.followUpQuestions;
            } else {
                // Try to extract questions from any array property
                const arrayKeys = Object.keys(parsed).filter(key => Array.isArray(parsed[key]));
                if (arrayKeys.length > 0) {
                    questions = parsed[arrayKeys[0]];
                }
            }

            // Filter and validate questions
            questions = questions
                .filter((q: any) => typeof q === 'string' && q.trim().length > 10)
                .map((q: string) => q.trim())
                .slice(0, 4); // Max 4 questions

            if (questions.length === 0) {
                logger.warn('No valid follow-up questions generated, using defaults', CONTEXT);
                // Fallback to generic questions
                questions = [
                    `Tell me more about ${query}`,
                    `What are the key points about ${query}?`,
                    `Are there any recent developments related to ${query}?`,
                ];
            }

            logger.info(`Generated ${questions.length} follow-up questions`, CONTEXT);
            return questions;

        } catch (parseError: any) {
            logger.warn(`Failed to parse follow-up questions JSON: ${parseError.message}`, CONTEXT);

            // Fallback: try to extract questions from plain text
            const text = responseText.trim();
            if (text.startsWith('[') && text.endsWith(']')) {
                try {
                    const questions = JSON.parse(text);
                    if (Array.isArray(questions)) {
                        return questions.slice(0, 4);
                    }
                } catch {
                    // Ignore
                }
            }

            // Final fallback
            return [
                `Tell me more about ${query}`,
                `What are the main aspects of ${query}?`,
                `Can you provide more details about ${query}?`,
            ];
        }

    } catch (error: any) {
        logger.error(`Follow-up question generation failed: ${error.message}`, CONTEXT, error);

        // Return generic fallback questions
        return [
            `Tell me more about ${query}`,
            `What are the key points about ${query}?`,
            `Are there any related topics to ${query}?`,
        ];
    }
};
