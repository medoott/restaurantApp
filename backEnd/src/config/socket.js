import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { resolveTokenSecret } from "../util/security/token.js";

let io = null;

const BRANCH_ROOM_PREFIX = "branch:";

export const initSocket = (server) => {
  const allowedOrigins = (
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((o) => o.trim());

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("track-order", (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on("user:register", (userId) => {
      if (!userId) return;
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.emit("auth:error", { message: "Authentication required to register user" });
        return;
      }
      try {
        const decoded = jwt.verify(token, resolveTokenSecret(process.env.TOKEN_SIGNATURE), { algorithms: ['HS256'] });
        if (decoded.id === userId) {
          socket.join(`user:${userId}`);
          if (decoded.branchId) {
            socket.join(`${BRANCH_ROOM_PREFIX}${decoded.branchId}`);
          }
        } else {
          socket.emit("auth:error", { message: "Token does not match user" });
        }
      } catch {
        socket.emit("auth:error", { message: "Invalid or expired token" });
      }
    });

    socket.on("user:role", (roleName) => {
      if (!roleName) return;
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return;
      try {
        const decoded = jwt.verify(token, resolveTokenSecret(process.env.TOKEN_SIGNATURE), { algorithms: ['HS256'] });
        if (decoded.role === roleName) {
          socket.join(`role:${roleName}`);
        }
      } catch {
        // silently ignore invalid tokens
      }
    });

    socket.on("employee:status", (data) => {
      if (data && data.userId) {
        socket.broadcast.emit("employee:statusChanged", data);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocket first.");
  }
  return io;
};
