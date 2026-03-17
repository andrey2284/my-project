import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

export const errorHandlerMiddleware = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      requestId: req.requestId,
      message: 'Validation failed',
      errors: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      requestId: req.requestId,
      message: error.message,
      details: error.details
    });
  }

  logger.error(
    {
      err: error,
      requestId: req.requestId
    },
    'Unhandled application error'
  );

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    requestId: req.requestId,
    message: 'Internal server error'
  });
};
