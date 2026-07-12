import { AppError } from "./AppError.js";
import { logger } from "../logger.js";

/**
 * Wraps an async route handler so thrown errors are forwarded to Express error middleware.
 * Handles both sync throws and async rejections.
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} fn
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === "function") {
        result.catch((error) => next(wrapError(error)));
      }
    } catch (error) {
      next(wrapError(error));
    }
  };
};

function wrapError(error) {
  if (error instanceof AppError) return error;
  if (error?.statusCode && error?.message) {
    return new AppError(error.message, error.statusCode, error.details || null);
  }
  return new AppError(
    error?.message || "Internal server error",
    error?.statusCode || 500,
  );
}

/**
 * Global Express error handler.
 * Returns sanitized error messages — never leaks stack traces or internal details in production.
 */
export const globalErrorHandling = (error, req, res, _next) => {
  const statusCode =
    Number.isInteger(error?.statusCode) && error.statusCode > 0
      ? error.statusCode
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  const safeMessage =
    statusCode >= 500
      ? "Internal server error"
      : error?.message || "An error occurred";

  const payload = {
    success: false,
    message: safeMessage,
  };

  if (!isProduction && error?.details) {
    payload.details = error.details;
  }

  const logEntry = {
    requestId: req?.requestId,
    level: statusCode >= 500 ? "error" : "warn",
    timestamp: new Date().toISOString(),
    message: error?.message,
    path: req?.originalUrl,
    method: req?.method,
    statusCode,
    ...(!isProduction && { stack: error?.stack }),
  };

  if (statusCode >= 500) {
    logger.error(logEntry.message || "Unhandled server error", logEntry);
  } else if (statusCode >= 400) {
    logger.warn(logEntry.message || "Client error", logEntry);
  }

  res.setHeader("X-Request-Id", req?.requestId || "");
  return res.status(statusCode).json(payload);
};
