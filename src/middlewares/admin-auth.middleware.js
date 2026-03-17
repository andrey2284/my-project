import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

export const adminAuthMiddleware = (req, _res, next) => {
  const providedKey = req.header('x-admin-key');

  if (!providedKey || providedKey !== env.ADMIN_API_KEY) {
    return next(new AppError('Unauthorized', StatusCodes.UNAUTHORIZED));
  }

  next();
};
