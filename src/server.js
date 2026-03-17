import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { initializeSocketServer } from './sockets/index.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);
initializeSocketServer(server);

server.listen(env.PORT, () => {
  logger.info(`HTTP server started on port ${env.PORT}`);
});
