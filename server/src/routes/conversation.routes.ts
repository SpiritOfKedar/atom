import { Router } from 'express';
import { Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as conversationService from '../services/conversation.service';
import { logger } from '../utils/logger';

const router = Router();
const CONTEXT = 'ConversationRoutes';

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const conversations = await conversationService.getUserConversations(req.userId!);
        res.json({ conversations });
    } catch (error) {
        logger.error('Failed to fetch conversations', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const conversation = await conversationService.getConversationById(
            req.params.id as string,
            req.userId!
        );

        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.json({ conversation });
    } catch (error) {
        logger.error('Failed to fetch conversation', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, initialMessage } = req.body;

        if (!title) {
            res.status(400).json({ error: 'Title is required' });
            return;
        }

        const conversation = await conversationService.createConversation({
            clerkUserId: req.userId!,
            title,
            initialMessage
        });

        res.status(201).json({ conversation });
    } catch (error) {
        logger.error('Failed to create conversation', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

router.post('/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { role, content, sources } = req.body;

        if (!role || !content) {
            res.status(400).json({ error: 'Role and content are required' });
            return;
        }

        const conversation = await conversationService.addMessageToConversation({
            conversationId: req.params.id as string,
            clerkUserId: req.userId!,
            message: { role, content, sources }
        });

        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.json({ conversation });
    } catch (error) {
        logger.error('Failed to add message', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to add message' });
    }
});

router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title } = req.body;

        if (!title) {
            res.status(400).json({ error: 'Title is required' });
            return;
        }

        const conversation = await conversationService.updateConversationTitle(
            req.params.id as string,
            req.userId!,
            title
        );

        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.json({ conversation });
    } catch (error) {
        logger.error('Failed to update conversation', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to update conversation' });
    }
});

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const deleted = await conversationService.deleteConversation(
            req.params.id as string,
            req.userId!
        );

        if (!deleted) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Failed to delete conversation', CONTEXT, error as Error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

export default router;
