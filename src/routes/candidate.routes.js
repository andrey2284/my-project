import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { candidateInterviewMiddleware } from '../middlewares/candidate-interview.middleware.js';
import {
  bootstrapCandidateInterviewController,
  finishInterviewController,
  listCandidateQuestionsController,
  registerViolationController,
  startInterviewSessionController,
  submitAnswerController
} from '../controllers/candidate.controller.js';
import { VIOLATION_TYPES } from '../utils/proctoring.constants.js';

const startSessionSchema = z.object({
  cameraGranted: z.literal(true),
  deviceInfo: z.record(z.any()).optional().default({})
});

const submitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  answerText: z.string().min(1).max(10000)
});

const violationSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.enum([
    VIOLATION_TYPES.TAB_HIDDEN,
    VIOLATION_TYPES.WINDOW_BLUR,
    VIOLATION_TYPES.DEVTOOLS_SHORTCUT,
    VIOLATION_TYPES.COPY_ATTEMPT,
    VIOLATION_TYPES.CONTEXT_MENU,
    VIOLATION_TYPES.SYSTEM_SHORTCUT,
    VIOLATION_TYPES.FULLSCREEN_EXIT,
    VIOLATION_TYPES.CAMERA_LOST,
    VIOLATION_TYPES.OTHER
  ]),
  message: z.string().min(3).max(500),
  source: z.string().min(2).max(100).default('frontend'),
  payload: z.record(z.any()).optional().default({})
});

const finishSchema = z.object({
  sessionId: z.string().uuid().optional()
});

const router = Router();

router.use('/:accessToken', asyncHandler(candidateInterviewMiddleware));

router.get('/:accessToken', asyncHandler(bootstrapCandidateInterviewController));
router.post(
  '/:accessToken/session/start',
  validate(startSessionSchema),
  asyncHandler(startInterviewSessionController)
);
router.get('/:accessToken/questions', asyncHandler(listCandidateQuestionsController));
router.post(
  '/:accessToken/questions/:questionId/answer',
  validate(submitAnswerSchema),
  asyncHandler(submitAnswerController)
);
router.post(
  '/:accessToken/violations',
  validate(violationSchema),
  asyncHandler(registerViolationController)
);
router.post(
  '/:accessToken/finish',
  validate(finishSchema),
  asyncHandler(finishInterviewController)
);

export { router as candidateRoutes };
