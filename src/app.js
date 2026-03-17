import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { routes } from './routes/index.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware.js';

const app = express();

app.disable('x-powered-by');

app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.requestId
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGIN.includes('*') || env.CORS_ORIGIN.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export { app };
