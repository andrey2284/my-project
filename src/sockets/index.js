import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { findInterviewByRecruiterRoomToken } from '../repositories/interviews.repository.js';
import { setSocketServer } from '../services/socket-emitter.service.js';
import { logger } from '../utils/logger.js';

let io = null;

export const initializeSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    }
  });

  setSocketServer(io);

  const recruiterNamespace = io.of('/recruiter');

  recruiterNamespace.use(async (socket, next) => {
    try {
      const roomToken = socket.handshake.auth?.roomToken || socket.handshake.query?.roomToken;

      if (!roomToken || typeof roomToken !== 'string') {
        return next(new Error('roomToken is required'));
      }

      const interview = await findInterviewByRecruiterRoomToken(roomToken);

      if (!interview) {
        return next(new Error('Interview room not found'));
      }

      socket.data.interview = interview;
      next();
    } catch (error) {
      next(error);
    }
  });

  recruiterNamespace.on('connection', (socket) => {
    const interview = socket.data.interview;
    const roomName = `interview:${interview.id}`;

    socket.join(roomName);

    socket.emit('recruiter:joined', {
      interviewId: interview.id,
      status: interview.status,
      violationCount: interview.violation_count
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        {
          interviewId: interview.id,
          socketId: socket.id,
          reason
        },
        'Recruiter disconnected from interview room'
      );
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

export const getSocketServer = () => io;
