const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { config } = require("../config");
const logger = require("../config/logger");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const clientSocietyId = socket.handshake.auth.societyId;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.userId = decoded.userId;
      socket.societyId = clientSocietyId || decoded.societyId;
      socket.role = decoded.role;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.debug(`User connected: ${socket.userId}`);

    if (socket.userId) {
      socket.join(String(socket.userId));
    }

    if (socket.societyId) {
      socket.join(`society:${socket.societyId}`);
    }

    socket.on("disconnect", () => {
      logger.debug(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

function emitToSociety(societyId, event, data) {
  if (!io) return;
  io.to(`society:${societyId}`).emit(event, data);
}

function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(userId).emit(event, data);
}

module.exports = { initSocket, getIO, emitToSociety, emitToUser };
