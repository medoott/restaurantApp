const DANGEROUS_MONGO_KEY_PATTERN = /^\$/;

function deepSanitize(obj, depth = 0) {
  if (depth > 20) return obj;
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => deepSanitize(v, depth + 1));

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_MONGO_KEY_PATTERN.test(key)) continue;
    sanitized[key] = deepSanitize(value, depth + 1);
  }
  return sanitized;
}

export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === "object" && !Object.isFrozen(req.query)) {
    const keys = Object.keys(req.query);
    for (const key of keys) {
      try {
        req.query[key] = deepSanitize(req.query[key]);
      } catch {
        // skip non-writable query properties
      }
    }
  }
  if (req.params && typeof req.params === "object") {
    req.params = deepSanitize(req.params);
  }
  next();
}
