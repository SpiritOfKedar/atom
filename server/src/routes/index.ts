import { Router } from 'express';
import chatRoutes from './chat.routes';
import conversationRoutes from './conversation.routes';

const router = Router();

router.use('/', chatRoutes);
router.use('/conversations', conversationRoutes);

export default router;
