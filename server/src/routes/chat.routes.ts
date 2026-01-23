import { Router } from 'express';
import { handleChat, healthCheck } from '../controllers/chat.controller';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Main chat endpoint
router.post('/chat', handleChat);

export default router;
