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
      const roles = Array.isArray(decoded.role) ? decoded.role : decoded.role ? [decoded.role] : [];
      socket.roles = roles;
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

    // Super admins get a global room for platform-wide events (society registrations, etc.)
    const roles = socket.roles || (Array.isArray(socket.role) ? socket.role : socket.role ? [socket.role] : []);
    if (roles.includes("super_admin")) {
      socket.join("super_admin");
      logger.debug(`Super admin joined super_admin room: ${socket.userId}`);
    }

    socket.on("chat:typing", (data) => {
      if (data.groupId) {
        socket.to(`society:${socket.societyId}`).emit("chat:typing", { groupId: String(data.groupId), senderId: String(socket.userId), senderName: "Someone is typing" });
        // Fetch real name async
        const { User } = require("../modules/user/user.model");
        User.findById(socket.userId).select("name").lean().then((u) => {
          if (u) socket.to(`society:${socket.societyId}`).emit("chat:typing", { groupId: String(data.groupId), senderId: String(socket.userId), senderName: u.name });
        }).catch(() => {});
      } else if (data.receiverId) {
        const { User } = require("../modules/user/user.model");
        User.findById(socket.userId).select("name").lean().then((u) => {
          const name = u?.name || "Someone";
          io.to(String(data.receiverId)).emit("chat:typing", { senderId: String(socket.userId), senderName: name });
        }).catch(() => {
          io.to(String(data.receiverId)).emit("chat:typing", { senderId: String(socket.userId), senderName: "Someone" });
        });
      }
    });

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

function emitToSuperAdmins(event, data) {
  if (!io) return;
  io.to("super_admin").emit(event, data);
}

function emitSocietyChange(action, society) {
  if (!io || !society) return;
  const payload = {
    id: society._id,
    _id: society._id,
    status: society.status,
    action,
    society,
  };
  // Broadcast to super admins (pending approvals, global list)
  io.to("super_admin").emit("society:change", payload);
  // Also emit to society room for members (if active/suspended)
  if (society._id) {
    io.to(`society:${society._id}`).emit("society:change", payload);
  }
  // Generic fallback for legacy listeners
  io.to("super_admin").emit("societies:change", payload);
}

module.exports = { initSocket, getIO, emitToSociety, emitToUser, emitToSuperAdmins, emitSocietyChange };
