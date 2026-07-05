import * as dotenv from "dotenv";
import http from "node:http";
import mongoose from "mongoose";
import createApp from "./src/config/app.js";
import connectedDB from "./src/DB/connection.js";
import { initSocket, getIO } from "./src/config/socket.js";
import { validateEnv } from "./src/config/env.js";
import developerRoutes from "./src/module/developer/developer.controller.js";
import { seedRoles } from "./src/module/rbac/seedRoles.js";

dotenv.config();
validateEnv();

const PORT = process.env.PORT || 3000;
const app = createApp();
app.use("/developer", developerRoutes);
const server = http.createServer(app);
initSocket(server);

const startServer = async () => {
  try {
    await connectedDB();
    console.log("Seeding roles...");
    await seedRoles();
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      const io = getIO();
      if (io) io.close();
      server.close(async () => {
        try {
          await mongoose.disconnect();
        } finally {
          process.exit(0);
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
