import crypto from "node:crypto";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "../routes.js";
import { globalErrorHandling } from "../util/error/error.js";
import { sanitizeInput } from "../middleware/sanitize.middleware.js";

import { maintenanceMiddleware } from "../middleware/maintenance.middleware.js";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];

const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);

  const rawOrigins = (process.env.CORS_ORIGIN || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAnyOrigin = rawOrigins.includes("*");

  if (allowAnyOrigin && process.env.NODE_ENV === "production") {
    console.error("=====================================================================");
    console.error("CRITICAL: CORS wildcard '*' is not allowed in production.");
    console.error("Set CORS_ORIGIN to explicit allowed origins (comma-separated).");
    console.error("=====================================================================");
    process.exit(1);
  }

  const allowedOrigins = allowAnyOrigin ? DEFAULT_ORIGINS : rawOrigins;

  app.disable("x-powered-by");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  app.use((req, _res, next) => {
    req.requestId = crypto.randomUUID();
    next();
  });

  if (process.env.NODE_ENV !== "test") {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000"),
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests, please try again later." },
    });
    app.use(limiter);

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many authentication attempts, please try again later." },
    });
    app.use("/auth", authLimiter);
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));

  app.use(sanitizeInput);

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(maintenanceMiddleware);
  app.use(routes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Page not found" });
  });

  app.use(globalErrorHandling);

  return app;
};

export default createApp;
