import { Router } from 'express';
import { handleChat, healthCheck, detailedHealthCheck } from '../controllers/chat.controller';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', healthCheck);
router.get('/health/detailed', requireAuth, detailedHealthCheck);

router.post('/chat', optionalAuth, handleChat);

export default router;
