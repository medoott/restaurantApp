import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { parseAuthorizationHeader, resolveTokenSecret } from "../util/security/token.js";

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

    const authToken = socket.handshake.auth?.token || socket.handshake.query?.token || "";
    const { scheme } = parseAuthorizationHeader(authToken);
    const token = authToken;

    const verifySocketToken = () => {
      if (!token) return null;
      try {
        const signature = process.env.TOKEN_SIGNATURE;
        return jwt.verify(token, resolveTokenSecret(signature), { algorithms: ["HS256"] });
      } catch {
        return null;
      }
    };

    socket.on("track-order", (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on("user:register", (userId) => {
      if (!userId) return;
      const decoded = verifySocketToken();
      if (!decoded) {
        socket.emit("auth:error", { message: "Invalid or expired token" });
        return;
      }
      if (decoded.id === userId) {
        socket.join(`user:${userId}`);
        if (decoded.branchId) {
          socket.join(`${BRANCH_ROOM_PREFIX}${decoded.branchId}`);
        }
      } else {
        socket.emit("auth:error", { message: "Token does not match user" });
      }
    });

    socket.on("user:role", (roleName) => {
      if (!roleName) return;
      const decoded = verifySocketToken();
      if (!decoded) return;
      if (decoded.role === roleName) {
        socket.join(`role:${roleName}`);
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
