import { StatusCodes } from 'http-status-codes';
import { withTransaction } from '../config/database.js';
import { lockInterviewById, updateInterviewStatus } from '../repositories/interviews.repository.js';
import { findSessionById, touchSession, closeActiveSessionsForInterview } from '../repositories/sessions.repository.js';
import { createViolation } from '../repositories/violations.repository.js';
import { emitToInterviewRoom } from './socket-emitter.service.js';
import { AppError } from '../utils/app-error.js';

export const registerViolationUseCase = async ({
  interview,
  sessionId,
  type,
  message,
  source,
  payload
}) => {
  const result = await withTransaction(async (client) => {
    const lockedInterview = await lockInterviewById(interview.id, client);

    if (!lockedInterview) {
      throw new AppError('Interview not found', StatusCodes.NOT_FOUND);
    }

    if (['completed', 'failed', 'cancelled'].includes(lockedInterview.status)) {
      throw new AppError(`Interview is already ${lockedInterview.status}`, StatusCodes.CONFLICT);
    }

    const session = await findSessionById(sessionId, client);
    if (!session || session.interview_id !== lockedInterview.id || session.ended_at) {
      throw new AppError('Active session not found', StatusCodes.BAD_REQUEST);
    }

    await touchSession(sessionId, client);

    const nextViolationCount = Number(lockedInterview.violation_count) + 1;

    const violation = await createViolation(
      {
        interviewId: lockedInterview.id,
        sessionId,
        type,
        message,
        source,
        payload,
        countSnapshot: nextViolationCount
      },
      client
    );

    let updatedInterview = await updateInterviewStatus(
      lockedInterview.id,
      lockedInterview.status,
      { violationCount: nextViolationCount },
      client
    );

    let terminated = false;
    if (nextViolationCount >= lockedInterview.max_violations) {
      terminated = true;
      await closeActiveSessionsForInterview(lockedInterview.id, client);
      updatedInterview = await updateInterviewStatus(
        lockedInterview.id,
        'failed',
        {
          violationCount: nextViolationCount,
          finishedAt: new Date()
        },
        client
      );
    }

    return {
      violation,
      interview: updatedInterview,
      terminated
    };
  });

  emitToInterviewRoom(interview.id, 'interview:violation', {
    interviewId: interview.id,
    status: result.interview.status,
    violationCount: result.interview.violation_count,
    violation: {
      id: result.violation.id,
      type: result.violation.type,
      message: result.violation.message,
      source: result.violation.source,
      payload: result.violation.payload,
      createdAt: result.violation.created_at
    }
  });

  if (result.terminated) {
    emitToInterviewRoom(interview.id, 'interview:failed', {
      interviewId: interview.id,
      status: result.interview.status,
      violationCount: result.interview.violation_count,
      finishedAt: result.interview.finished_at
    });
  }

  return {
    status: result.interview.status,
    violationCount: result.interview.violation_count,
    maxViolations: result.interview.max_violations,
    terminated: result.terminated,
    violation: {
      id: result.violation.id,
      type: result.violation.type,
      message: result.violation.message,
      source: result.violation.source,
      payload: result.violation.payload,
      createdAt: result.violation.created_at
    }
  };
};
