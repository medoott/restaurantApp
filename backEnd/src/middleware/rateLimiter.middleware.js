import rateLimit from "express-rate-limit";
import { getSettings } from "../module/settings/settings.service.js";

export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Please wait before placing another order." },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  skip: () => process.env.NODE_ENV === "test",
});

export const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many session requests. Please try again later." },
  keyGenerator: (req) => req.ip,
  skip: () => process.env.NODE_ENV === "test",
});

export const waiterRequestLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Please wait a moment before sending another request." },
  keyGenerator: (req) => req.ip,
  skip: () => process.env.NODE_ENV === "test",
});

let cachedRateLimit = null;
let rateLimitCacheTime = 0;
const RATE_LIMIT_CACHE_TTL = 60000;

async function getCachedRateLimit() {
  const now = Date.now();
  if (cachedRateLimit !== null && now - rateLimitCacheTime <= RATE_LIMIT_CACHE_TTL) {
    return cachedRateLimit;
  }
  try {
    const result = await Promise.race([
      getSettings(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("settings timeout")), 2000)),
    ]);
    cachedRateLimit = parseInt(result?.api?.rateLimit || 300);
    rateLimitCacheTime = now;
  } catch {
    if (cachedRateLimit === null) cachedRateLimit = 300;
  }
  return cachedRateLimit;
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: async () => getCachedRateLimit(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: () => process.env.NODE_ENV === "test",
});
