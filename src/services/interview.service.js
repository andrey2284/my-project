import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { withTransaction } from '../config/database.js';
import {
  createInterview,
  findInterviewById,
  lockInterviewById,
  updateInterviewStatus,
  listInterviews
} from '../repositories/interviews.repository.js';
import {
  createSession,
  findActiveSessionByInterviewId,
  findSessionById,
  touchSession,
  closeActiveSessionsForInterview
} from '../repositories/sessions.repository.js';
import { createQuestions, listQuestionsByInterviewId, findQuestionById } from '../repositories/questions.repository.js';
import { upsertAnswer, listAnswersByInterviewId, countAnswersByInterviewId } from '../repositories/answers.repository.js';
import { generateInterviewQuestions } from './question-generation.service.js';
import { emitToInterviewRoom } from './socket-emitter.service.js';
import { AppError } from '../utils/app-error.js';
import { TERMINAL_STATUSES } from '../utils/proctoring.constants.js';

const candidateInterviewView = (interview) => ({
  id: interview.id,
  candidateName: interview.candidate_name,
  candidateEmail: interview.candidate_email,
  positionTitle: interview.position_title,
  status: interview.status,
  totalQuestions: interview.total_questions,
  maxViolations: interview.max_violations,
  violationCount: interview.violation_count,
  startedAt: interview.started_at,
  finishedAt: interview.finished_at
});

const adminInterviewView = (interview) => ({
  id: interview.id,
  candidateName: interview.candidate_name,
  candidateEmail: interview.candidate_email,
  positionTitle: interview.position_title,
  companyContext: interview.company_context,
  status: interview.status,
  totalQuestions: interview.total_questions,
  maxViolations: interview.max_violations,
  violationCount: interview.violation_count,
  accessToken: interview.access_token,
  recruiterRoomToken: interview.recruiter_room_token,
  candidateLink: `${env.PUBLIC_CANDIDATE_BASE_URL.replace(/\/$/, '')}/interview/${interview.access_token}`,
  startedAt: interview.started_at,
  finishedAt: interview.finished_at,
  createdAt: interview.created_at,
  updatedAt: interview.updated_at,
  metadata: interview.metadata
});

const sanitizeCandidateQuestions = (questions) =>
  questions.map((question) => ({
    id: question.id,
    order: question.order_no,
    title: question.title,
    prompt: question.prompt,
    category: question.category,
    createdAt: question.created_at
  }));

export const createInterviewUseCase = async (payload) => {
  const interview = await createInterview(payload);
  return adminInterviewView(interview);
};

export const listInterviewsUseCase = async () => {
  const interviews = await listInterviews();
  return interviews.map(adminInterviewView);
};

export const getInterviewDetailsUseCase = async (interviewId) => {
  const interview = await findInterviewById(interviewId);

  if (!interview) {
    throw new AppError('Interview not found', StatusCodes.NOT_FOUND);
  }

  const [questions, answers] = await Promise.all([
    listQuestionsByInterviewId(interviewId),
    listAnswersByInterviewId(interviewId)
  ]);

  return {
    interview: adminInterviewView(interview),
    questions: questions.map((question) => ({
      id: question.id,
      order: question.order_no,
      title: question.title,
      prompt: question.prompt,
      category: question.category,
      expectedSignals: question.expected_signals,
      source: question.source,
      model: question.model,
      createdAt: question.created_at
    })),
    answers: answers.map((answer) => ({
      id: answer.id,
      questionId: answer.question_id,
      sessionId: answer.session_id,
      order: answer.order_no,
      title: answer.title,
      prompt: answer.prompt,
      category: answer.category,
      answerText: answer.answer_text,
      createdAt: answer.created_at,
      updatedAt: answer.updated_at
    }))
  };
};

export const bootstrapCandidateInterviewUseCase = async (interview) => {
  const questions = await listQuestionsByInterviewId(interview.id);

  return {
    interview: candidateInterviewView(interview),
    questions: sanitizeCandidateQuestions(questions)
  };
};

export const startInterviewSessionUseCase = async ({ interview, cameraGranted, ipAddress, userAgent, deviceInfo }) => {
  if (!cameraGranted) {
    throw new AppError('Camera access is required to start the interview', StatusCodes.FORBIDDEN);
  }

  if (TERMINAL_STATUSES.has(interview.status)) {
    throw new AppError(`Interview is already ${interview.status}`, StatusCodes.CONFLICT);
  }

  const result = await withTransaction(async (client) => {
    const lockedInterview = await lockInterviewById(interview.id, client);

    if (!lockedInterview) {
      throw new AppError('Interview not found', StatusCodes.NOT_FOUND);
    }

    if (TERMINAL_STATUSES.has(lockedInterview.status)) {
      throw new AppError(`Interview is already ${lockedInterview.status}`, StatusCodes.CONFLICT);
    }

    let session = await findActiveSessionByInterviewId(lockedInterview.id, client);
    if (!session) {
      session = await createSession(
        {
          interviewId: lockedInterview.id,
          cameraVerified: true,
          ipAddress,
          userAgent,
          deviceInfo
        },
        client
      );
    }

    let updatedInterview = lockedInterview;
    if (lockedInterview.status === 'pending') {
      updatedInterview = await updateInterviewStatus(
        lockedInterview.id,
        'in_progress',
        { startedAt: new Date() },
        client
      );
    }

    let questions = await listQuestionsByInterviewId(lockedInterview.id, client);
    if (!questions.length) {
      const generatedQuestions = await generateInterviewQuestions({
        positionTitle: lockedInterview.position_title,
        companyContext: lockedInterview.company_context,
        totalQuestions: lockedInterview.total_questions
      });

      questions = await createQuestions(lockedInterview.id, generatedQuestions, client);
    }

    return {
      interview: updatedInterview,
      session,
      questions
    };
  });

  emitToInterviewRoom(interview.id, 'interview:started', {
    interviewId: interview.id,
    status: result.interview.status,
    startedAt: result.interview.started_at
  });

  return {
    interview: candidateInterviewView(result.interview),
    session: {
      id: result.session.id,
      cameraVerified: result.session.camera_verified,
      startedAt: result.session.started_at
    },
    questions: sanitizeCandidateQuestions(result.questions)
  };
};

export const listCandidateQuestionsUseCase = async (interviewId) => {
  const questions = await listQuestionsByInterviewId(interviewId);
  return sanitizeCandidateQuestions(questions);
};

export const submitAnswerUseCase = async ({ interview, sessionId, questionId, answerText }) => {
  if (TERMINAL_STATUSES.has(interview.status)) {
    throw new AppError(`Interview is already ${interview.status}`, StatusCodes.CONFLICT);
  }

  const [question, session] = await Promise.all([
    findQuestionById(questionId),
    findSessionById(sessionId)
  ]);

  if (!question || question.interview_id !== interview.id) {
    throw new AppError('Question not found for this interview', StatusCodes.NOT_FOUND);
  }

  if (!session || session.interview_id !== interview.id || session.ended_at) {
    throw new AppError('Active session not found', StatusCodes.BAD_REQUEST);
  }

  const answer = await upsertAnswer({
    interviewId: interview.id,
    questionId,
    sessionId,
    answerText
  });

  await touchSession(sessionId);

  const answersCount = await countAnswersByInterviewId(interview.id);

  emitToInterviewRoom(interview.id, 'interview:answer_submitted', {
    interviewId: interview.id,
    questionId,
    order: question.order_no,
    answersCount
  });

  return {
    id: answer.id,
    questionId: answer.question_id,
    sessionId: answer.session_id,
    answerText: answer.answer_text,
    createdAt: answer.created_at,
    updatedAt: answer.updated_at
  };
};

export const finishInterviewUseCase = async ({ interview, sessionId }) => {
  if (interview.status === 'failed') {
    throw new AppError('Interview already failed', StatusCodes.CONFLICT);
  }

  const result = await withTransaction(async (client) => {
    const lockedInterview = await lockInterviewById(interview.id, client);

    if (!lockedInterview) {
      throw new AppError('Interview not found', StatusCodes.NOT_FOUND);
    }

    if (lockedInterview.status === 'completed') {
      return lockedInterview;
    }

    if (sessionId) {
      const session = await findSessionById(sessionId, client);
      if (!session || session.interview_id !== interview.id) {
        throw new AppError('Session not found', StatusCodes.BAD_REQUEST);
      }
      await touchSession(sessionId, client);
    }

    await closeActiveSessionsForInterview(interview.id, client);

    return updateInterviewStatus(
      interview.id,
      'completed',
      {
        finishedAt: new Date()
      },
      client
    );
  });

  emitToInterviewRoom(interview.id, 'interview:completed', {
    interviewId: interview.id,
    status: result.status,
    finishedAt: result.finished_at
  });

  return candidateInterviewView(result);
};
