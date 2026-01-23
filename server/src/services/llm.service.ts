import OpenAI from 'openai';
import { Response } from 'express';
import { RAGContext } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const CONTEXT = 'LLMService';

const openai = new OpenAI({
    apiKey: env.openaiApiKey,
});

const SYSTEM_PROMPT = `You are a helpful AI research assistant that provides accurate, well-sourced answers based on the provided context.

Instructions:
1. Answer the user's question using ONLY the information from the provided sources.
2. ALWAYS cite your sources using the format [1], [2], etc.
3. Be concise but comprehensive. Aim for 2-3 paragraphs.
4. If the sources don't contain enough information, acknowledge this limitation.
5. Use a neutral, informative tone similar to an encyclopedia.
6. Structure your response with clear paragraphs for readability.
7. Never make up information not present in the sources.`;

/**
 * Builds a prompt for the LLM with the given context.
 */
const buildPrompt = (query: string, contexts: RAGContext[]): string => {
    const contextSection = contexts
        .map((ctx) => `[${ctx.index}] "${ctx.title}" (${ctx.url})\n${ctx.content}`)
        .join('\n\n---\n\n');

    return `Based on the following sources, answer the user's question.

SOURCES:
${contextSection}

USER QUESTION: ${query}

Provide a well-structured answer with citations [1], [2], etc. to the relevant sources.`;
};

/**
 * Streams a response from OpenAI to the Express response object.
 */
export const streamCompletion = async (
    query: string,
    contexts: RAGContext[],
    res: Response
): Promise<void> => {
    const prompt = buildPrompt(query, contexts);

    logger.info(`Streaming completion for query: "${query.substring(0, 50)}..."`, CONTEXT);
    logger.debug(`Context count: ${contexts.length}`, CONTEXT);

    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Cost-effective model, can be changed to gpt-4o
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            stream: true,
            temperature: 0.3, // Lower temp for more factual responses
            max_tokens: 1024,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                res.write(JSON.stringify({ type: 'token', data: content }) + '\n');
            }
        }

        logger.info('Streaming completed successfully', CONTEXT);
    } catch (error: any) {
        logger.error(`OpenAI streaming failed: ${error.message}`, CONTEXT, error);
        throw error;
    }
};

/**
 * Non-streaming completion for testing purposes.
 */
export const getCompletion = async (
    query: string,
    contexts: RAGContext[]
): Promise<string> => {
    const prompt = buildPrompt(query, contexts);

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || '';
};
