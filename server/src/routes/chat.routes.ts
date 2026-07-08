import { Router } from 'express';
import { handleChat, healthCheck, detailedHealthCheck } from '../controllers/chat.controller';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware';
import { enforceGuestQuota } from '../middleware/guest-quota.middleware';
import { readinessCheck } from '../controllers/chat.controller';

const router = Router();

router.get('/health', healthCheck);
router.get('/health/ready', readinessCheck);
router.get('/health/detailed', requireAuth, detailedHealthCheck);

router.post('/chat', optionalAuth, enforceGuestQuota, handleChat);

export default router;
