import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { adminRoutes } from './admin.routes.js';
import { candidateRoutes } from './candidate.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/admin', adminRoutes);
router.use('/candidate/interviews', candidateRoutes);

export { router as routes };
