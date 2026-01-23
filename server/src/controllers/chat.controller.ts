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

const CONTEXT = 'ChatController';

/**
 * Sends a status update to the client via SSE.
 */
const sendStatus = (res: Response, status: string): void => {
    res.write(JSON.stringify({ type: 'status', data: status }) + '\n');
};

/**
 * Handles POST /api/chat
 * Runs the RAG pipeline and streams the response.
 * Optionally saves to conversation if user is authenticated.
 */
export const handleChat = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { query, conversationId, searchType, answerStyle } = req.body as ExtendedChatRequest;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required and must be a non-empty string' });
        return;
    }

    const sanitizedQuery = query.trim().substring(0, 500);
    logger.info(`Received chat request: "${sanitizedQuery.substring(0, 50)}..."`, CONTEXT);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    req.on('close', () => {
        logger.debug('Client disconnected', CONTEXT);
    });

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
                    conversationHistory = messages.slice(-6);
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
            answerStyle
        );

        // Validate answer quality after streaming completes
        if (fullAnswer && result.ragContexts && result.ragContexts.length > 0) {
            try {
                sendStatus(res, 'Validating answer...');
                const validation = await validateAnswer(fullAnswer, result.ragContexts, sanitizedQuery);
                
                // Send validation result to client
                res.write(JSON.stringify({
                    type: 'validation',
                    data: {
                        isValid: validation.isValid,
                        confidence: validation.confidence,
                        issues: validation.issues,
                        summary: validation.summary,
                    }
                }) + '\n');
                
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
                    result.ragContexts
                );
                
                // Send follow-up questions to client
                res.write(JSON.stringify({
                    type: 'followUps',
                    data: followUpQuestions
                }) + '\n');
                
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

                    res.write(JSON.stringify({ type: 'conversationId', data: activeConversationId }) + '\n');
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

        try {
            res.write(JSON.stringify({
                type: 'error',
                data: error.message || 'An unexpected error occurred'
            }) + '\n');
        } catch {
        }
        res.end();
    }
};

/**
 * Health check endpoint
 */
export const healthCheck = (_req: Request, res: Response): void => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'atom-search-api',
    });
};
