import { Router } from 'express';
import { handleChat, healthCheck, detailedHealthCheck } from '../controllers/chat.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', healthCheck);
router.get('/health/detailed', detailedHealthCheck);

router.post('/chat', optionalAuth, handleChat);

export default router;
