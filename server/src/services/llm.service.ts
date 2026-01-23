import OpenAI from 'openai';
import { Response } from 'express';
import { AnswerStyle, RAGContext } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { IMessage } from '../models/conversation.model';

const CONTEXT = 'LLMService';

const openai = new OpenAI({
    apiKey: env.openaiApiKey,
});

/**
 * Generates a standalone, search-friendly query from a conversational follow-up.
 * Takes into account the previous conversation history.
 */
export const generateStandaloneQuery = async (
    query: string,
    conversationHistory: IMessage[]
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

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at turning conversational follow-up questions into standalone search queries. Return only the query string.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            max_tokens: 50,
        });

        const standaloneQuery = response.choices[0]?.message?.content?.trim() || query;
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
2. ALWAYS cite your sources using the format [1], [2], etc.
3. If the sources don't contain enough information, acknowledge this limitation.
4. Use a neutral, informative tone similar to an encyclopedia.
5. Structure your response clearly for readability.
6. Never make up information not present in the sources.`;

/**
 * Builds a prompt for the LLM with the given context.
 */
const buildPrompt = (
    query: string,
    contexts: RAGContext[],
    conversationHistory?: IMessage[],
    answerStyle: AnswerStyle = 'detailed'
): string => {
    const contextSection = contexts
        .map((ctx) => `[${ctx.index}] "${ctx.title}" (${ctx.url})\n${ctx.content}`)
        .join('\n\n---\n\n');

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
                'Provide a detailed answer in 2-4 paragraphs, explaining the key concepts and context while remaining focused.';
            break;
    }

    return `${introLine}

${historySection}SOURCES:
${contextSection}

USER QUESTION: ${query}

${styleInstructions}

Always include citations [1], [2], etc. to the relevant sources for any factual claims.`;
};

/**
 * Streams a response from OpenAI to the Express response object.
 */
export const streamCompletion = async (
    query: string,
    contexts: RAGContext[],
    res: Response,
    onToken?: (token: string) => void,
    conversationHistory?: IMessage[],
    answerStyle: AnswerStyle = 'detailed'
): Promise<void> => {
    const prompt = buildPrompt(query, contexts, conversationHistory, answerStyle);

    logger.info(`Streaming completion for query: "${query.substring(0, 50)}..."`, CONTEXT);
    logger.debug(`Context count: ${contexts.length}`, CONTEXT);

    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 1024,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                res.write(JSON.stringify({ type: 'token', data: content }) + '\n');
                if (onToken) {
                    onToken(content);
                }
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
    contexts: RAGContext[],
    answerStyle: AnswerStyle = 'detailed'
): Promise<string> => {
    const prompt = buildPrompt(query, contexts, undefined, answerStyle);

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
    sources: RAGContext[]
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

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that generates relevant follow-up questions. Return only a JSON object with a "questions" array.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 200,
            response_format: { type: 'json_object' },
        });

        const responseText = response.choices[0]?.message?.content || '{}';

        try {
            const parsed = JSON.parse(responseText);

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
