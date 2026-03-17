import {
  bootstrapCandidateInterviewUseCase,
  finishInterviewUseCase,
  listCandidateQuestionsUseCase,
  startInterviewSessionUseCase,
  submitAnswerUseCase
} from '../services/interview.service.js';
import { registerViolationUseCase } from '../services/violation.service.js';

export const bootstrapCandidateInterviewController = async (req, res) => {
  const data = await bootstrapCandidateInterviewUseCase(req.interview);

  res.json({
    success: true,
    data
  });
};

export const startInterviewSessionController = async (req, res) => {
  const data = await startInterviewSessionUseCase({
    interview: req.interview,
    cameraGranted: req.body.cameraGranted,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? '',
    deviceInfo: req.body.deviceInfo ?? {}
  });

  res.json({
    success: true,
    data
  });
};

export const listCandidateQuestionsController = async (req, res) => {
  const data = await listCandidateQuestionsUseCase(req.interview.id);

  res.json({
    success: true,
    data
  });
};

export const submitAnswerController = async (req, res) => {
  const data = await submitAnswerUseCase({
    interview: req.interview,
    sessionId: req.body.sessionId,
    questionId: req.params.questionId,
    answerText: req.body.answerText
  });

  res.json({
    success: true,
    data
  });
};

export const registerViolationController = async (req, res) => {
  const data = await registerViolationUseCase({
    interview: req.interview,
    sessionId: req.body.sessionId,
    type: req.body.type,
    message: req.body.message,
    source: req.body.source,
    payload: req.body.payload ?? {}
  });

  res.json({
    success: true,
    data
  });
};

export const finishInterviewController = async (req, res) => {
  const data = await finishInterviewUseCase({
    interview: req.interview,
    sessionId: req.body.sessionId
  });

  res.json({
    success: true,
    data
  });
};
