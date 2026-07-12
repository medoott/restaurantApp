import mongoose from "mongoose";
import { logger } from "../util/logger.js";

const MAX_DB_RETRIES = Number.parseInt(process.env.DB_CONNECT_RETRIES || "5", 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.DB_RETRY_DELAY_MS || "2000", 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectedDB = async () => {
  if (!process.env.DB_URL) {
    throw new Error("Missing DB_URL");
  }

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);
  mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("error", (error) => logger.error("MongoDB connection error", { error: error.message }));

  let attempt = 0;
  while (attempt < MAX_DB_RETRIES) {
    try {
      await mongoose.connect(process.env.DB_URL, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4,
        autoIndex: process.env.NODE_ENV !== "production",
      });
      logger.info("Connected to DB");
      return;
    } catch (error) {
      attempt += 1;
      logger.warn(`MongoDB connection attempt ${attempt} failed.`, { error: error.message, attempt });
      if (attempt >= MAX_DB_RETRIES) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
};

export default connectedDB;
