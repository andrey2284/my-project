import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { adminAuthMiddleware } from '../middlewares/admin-auth.middleware.js';
import {
  createInterviewController,
  getInterviewDetailsController,
  listInterviewsController,
  listViolationsController
} from '../controllers/admin.controller.js';
import { env } from '../config/env.js';

const createInterviewSchema = z.object({
  candidateName: z.string().min(2).max(150),
  candidateEmail: z.string().email(),
  positionTitle: z.string().min(3).max(150).default('Network Engineer (Junior)'),
  companyContext: z.string().max(2000).optional().default(''),
  totalQuestions: z.number().int().min(1).max(20).optional().default(env.DEFAULT_TOTAL_QUESTIONS),
  maxViolations: z.number().int().min(1).max(20).optional().default(env.DEFAULT_MAX_VIOLATIONS),
  metadata: z.record(z.any()).optional().default({})
});

const router = Router();

router.use(adminAuthMiddleware);

router.get('/interviews', asyncHandler(listInterviewsController));
router.post(
  '/interviews',
  validate(createInterviewSchema),
  asyncHandler(createInterviewController)
);
router.get('/interviews/:interviewId', asyncHandler(getInterviewDetailsController));
router.get('/interviews/:interviewId/violations', asyncHandler(listViolationsController));

export { router as adminRoutes };
