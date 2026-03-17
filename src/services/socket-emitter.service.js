let socketServer = null;

export const setSocketServer = (io) => {
  socketServer = io;
};

export const emitToInterviewRoom = (interviewId, event, payload) => {
  if (!socketServer) {
    return;
  }

  socketServer.to(`interview:${interviewId}`).emit(event, payload);
};
