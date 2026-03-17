import { StatusCodes } from 'http-status-codes';
import { findInterviewByAccessToken } from '../repositories/interviews.repository.js';
import { AppError } from '../utils/app-error.js';

export const candidateInterviewMiddleware = async (req, _res, next) => {
  const { accessToken } = req.params;
  const interview = await findInterviewByAccessToken(accessToken);

  if (!interview) {
    return next(new AppError('Interview not found', StatusCodes.NOT_FOUND));
  }

  req.interview = interview;
  next();
};
