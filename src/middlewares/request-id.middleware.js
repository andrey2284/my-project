import { createRequestId } from '../utils/request-context.js';

export const requestIdMiddleware = (req, _res, next) => {
  req.requestId = createRequestId();
  next();
};
