import { Request, Response } from 'express';
import { runRAGPipeline } from '../services/rag.service';
import { ExtendedChatRequest } from '../types';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth.middleware';
import * as conversationService from '../services/conversation.service';
import { IMessage } from '../models/conversation.model';
import { validateAnswer } from '../services/answer-validation.service';
import { generateFollowUpQuestions } from '../services/llm.service';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { env } from '../config/env';

const CONTEXT = 'ChatController';

/**
 * Sends a status update to the client via SSE.
 * Silently ignores write errors (e.g. client disconnected).
 */
const sendStatus = (res: Response, status: string): void => {
    try {
        if (!res.writableEnded) {
            res.write(JSON.stringify({ type: 'status', data: status }) + '\n');
        }
    } catch {
        // ignore
    }
};

/**
 * Safe write helper — ignores errors from closed connections.
 */
const safeWrite = (res: Response, payload: Record<string, unknown>): void => {
    try {
        if (!res.writableEnded) {
            res.write(JSON.stringify(payload) + '\n');
        }
    } catch {
        // ignore
    }
};

/**
 * Maps internal errors to safe, user-facing messages.
 * Prevents leaking stack traces, connection strings, API key details, etc.
 */
const sanitizeErrorForClient = (error: any): string => {
    const message = (error?.message || '').toLowerCase();

    if (message.includes('api key') || message.includes('authentication') || message.includes('unauthorized')) {
        return 'A service authentication error occurred. Please try again later.';
    }
    if (message.includes('timeout') || message.includes('etimedout') || message.includes('econnreset')) {
        return 'The request timed out. Please try again.';
    }
    if (message.includes('rate limit') || message.includes('429')) {
        return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (message.includes('no search results')) {
        return 'No search results found for your query. Try rephrasing it.';
    }
    if (message.includes('mongo') || message.includes('redis') || message.includes('econnrefused')) {
        return 'A database error occurred. Please try again later.';
    }
    if (message.includes('no llm provider')) {
        return 'The AI service is temporarily unavailable. Please try again later.';
    }

    return 'An unexpected error occurred. Please try again.';
};

/**
 * Handles POST /api/chat
 * Runs the RAG pipeline and streams the response.
 * Optionally saves to conversation if user is authenticated.
 */
export const handleChat = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { query, conversationId, searchType, answerStyle, modelProvider } = req.body as ExtendedChatRequest;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required and must be a non-empty string' });
        return;
    }

    const sanitizedQuery = query.trim().substring(0, 500);
    const allowedProviders = ['openai', 'claude', 'gemini'] as const;
    const effectiveModelProvider =
        modelProvider && allowedProviders.includes(modelProvider)
            ? modelProvider
            : 'openai';

    logger.info(`Received chat request: "${sanitizedQuery.substring(0, 50)}..."`, CONTEXT);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    // Track client disconnection so the pipeline can abort early
    let clientDisconnected = false;
    req.on('close', () => {
        clientDisconnected = true;
        logger.debug('Client disconnected', CONTEXT);
    });

    const isClientConnected = (): boolean => !clientDisconnected;

    let activeConversationId = conversationId;
    let fullAnswer = '';
    let sources: any[] = [];
    let conversationHistory: IMessage[] | undefined;

    try {
        if (authReq.userId && conversationId) {
            try {
                const existingConversation = await conversationService.getConversationById(
                    conversationId,
                    authReq.userId
                );

                if (existingConversation?.messages?.length) {
                    const messages = existingConversation.messages;
                    // Keep last 6 messages but truncate each to avoid prompt blowup
                    const MAX_HISTORY_MSG_LENGTH = 500;
                    conversationHistory = messages.slice(-6).map((msg) => ({
                        ...msg,
                        content: msg.content.length > MAX_HISTORY_MSG_LENGTH
                            ? msg.content.substring(0, MAX_HISTORY_MSG_LENGTH) + '…'
                            : msg.content,
                    }));
                }
            } catch (historyError) {
                logger.error('Failed to load conversation history', CONTEXT, historyError as Error);
            }
        }

        const result = await runRAGPipeline(
            sanitizedQuery,
            res,
            (token: string) => {
                fullAnswer += token;
            },
            (sourcesData: any[]) => {
                sources = sourcesData;
            },
            conversationHistory,
            searchType,
            answerStyle,
            effectiveModelProvider,
            authReq.userId,
            isClientConnected
        );

        // Skip post-stream work if client disconnected
        if (clientDisconnected) {
            logger.info('Client disconnected, skipping post-stream operations', CONTEXT);
            res.end();
            return;
        }

        // Validate answer quality after streaming completes
        if (fullAnswer && result.ragContexts && result.ragContexts.length > 0) {
            try {
                sendStatus(res, 'Validating answer...');
                const validation = await validateAnswer(
                    fullAnswer,
                    result.ragContexts,
                    sanitizedQuery,
                    effectiveModelProvider
                );

                // Send validation result to client
                safeWrite(res, {
                    type: 'validation',
                    data: {
                        isValid: validation.isValid,
                        confidence: validation.confidence,
                        issues: validation.issues,
                        summary: validation.summary,
                    }
                });

                logger.info(
                    `Answer validation: isValid=${validation.isValid}, ` +
                    `confidence=${validation.confidence.toFixed(2)}`,
                    CONTEXT
                );
            } catch (validationError: any) {
                logger.warn(`Answer validation failed: ${validationError.message}`, CONTEXT);
                // Continue without validation
            }
        }

        // Generate follow-up questions
        if (fullAnswer && result.ragContexts && result.ragContexts.length > 0) {
            try {
                sendStatus(res, 'Generating follow-up questions...');
                const followUpQuestions = await generateFollowUpQuestions(
                    sanitizedQuery,
                    fullAnswer,
                    result.ragContexts,
                    effectiveModelProvider
                );

                // Send follow-up questions to client
                safeWrite(res, {
                    type: 'followUps',
                    data: followUpQuestions
                });

                logger.info(`Generated ${followUpQuestions.length} follow-up questions`, CONTEXT);
            } catch (followUpError: any) {
                logger.warn(`Follow-up question generation failed: ${followUpError.message}`, CONTEXT);
                // Continue without follow-up questions
            }
        }

        if (authReq.userId) {
            try {
                if (!activeConversationId) {
                    const title = sanitizedQuery.substring(0, 50) + (sanitizedQuery.length > 50 ? '...' : '');
                    const newConvo = await conversationService.createConversation({
                        clerkUserId: authReq.userId,
                        title,
                        initialMessage: { role: 'user', content: sanitizedQuery }
                    });
                    activeConversationId = (newConvo._id as any).toString();

                    safeWrite(res, { type: 'conversationId', data: activeConversationId });
                } else {
                    await conversationService.addMessageToConversation({
                        conversationId: activeConversationId,
                        clerkUserId: authReq.userId,
                        message: { role: 'user', content: sanitizedQuery }
                    });
                }

                await conversationService.addMessageToConversation({
                    conversationId: activeConversationId!,
                    clerkUserId: authReq.userId,
                    message: { role: 'assistant', content: fullAnswer, sources }
                });

                logger.info(`Saved conversation ${activeConversationId} for user ${authReq.userId}`, CONTEXT);
            } catch (saveError) {
                logger.error('Failed to save conversation', CONTEXT, saveError as Error);
            }
        }

        res.end();
    } catch (error: any) {
        logger.error(`Pipeline error: ${error.message}`, CONTEXT, error);

        // Sanitize error message before sending to client — never expose raw internal errors
        const clientMessage = sanitizeErrorForClient(error);
        try {
            safeWrite(res, {
                type: 'error',
                data: clientMessage
            });
        } catch {
        }
        res.end();
    }
};

/**
 * Basic health check endpoint
 */
export const healthCheck = (_req: Request, res: Response): void => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'atom-search-api',
    });
};

/**
 * Detailed health check with dependency status
 */
export const detailedHealthCheck = async (_req: Request, res: Response): Promise<void> => {
    const healthData: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'atom-search-api',
        uptime: process.uptime(),
        dependencies: {
            mongodb: 'disconnected',
            redis: 'not_configured',
            openai: 'not_configured',
            claude: 'not_configured',
            gemini: 'not_configured',
            serper: 'not_configured',
        }
    };

    // Check MongoDB
    const mongoStatus = mongoose.connection.readyState;
    const mongoMap: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    healthData.dependencies.mongodb = mongoMap[mongoStatus] || 'unknown';
    if (mongoStatus !== 1) healthData.status = 'degraded';

    // Check Redis
    const redisClient = getRedisClient();
    if (redisClient) {
        healthData.dependencies.redis = redisClient.status || 'unknown';
        if (redisClient.status !== 'ready') healthData.status = 'degraded';
    } else if (env.redisUrl) {
        healthData.dependencies.redis = 'error';
        healthData.status = 'degraded';
    }

    // Check OpenAI Config
    if (env.openaiApiKey) {
        healthData.dependencies.openai = 'configured';
    }

    // Check Claude/Anthropic Config
    if (env.anthropicApiKey) {
        healthData.dependencies.claude = 'configured';
    }

    // Check Gemini Config
    if (env.geminiApiKey) {
        healthData.dependencies.gemini = 'configured';
    }

    // Check Serper Config
    if (env.serperApiKey) {
        healthData.dependencies.serper = 'configured';
    }

    res.json(healthData);
};
