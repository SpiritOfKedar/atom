import { Router } from 'express';
import chatRoutes from './chat.routes';

const router = Router();

router.use('/', chatRoutes);

export default router;
