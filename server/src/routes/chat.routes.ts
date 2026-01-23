import { Router } from 'express';
import { handleChat, healthCheck } from '../controllers/chat.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', healthCheck);

router.post('/chat', optionalAuth, handleChat);

export default router;
