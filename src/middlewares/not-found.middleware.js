import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/app-error.js';

export const notFoundMiddleware = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, StatusCodes.NOT_FOUND));
};
