const STRIP_TAGS = /<[^>]*>/g;
const STRIP_SCRIPT = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STRIP_ON_EVENT = /\son\w+\s*=\s*["'][^"']*["']/gi;
const STRIP_JAVASCRIPT_PROTOCOL = /javascript\s*:/gi;

export function sanitize(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(STRIP_SCRIPT, "")
    .replace(STRIP_ON_EVENT, "")
    .replace(STRIP_JAVASCRIPT_PROTOCOL, "")
    .replace(STRIP_TAGS, "")
    .trim();
}

export function sanitizeObject(obj, maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) return obj;
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, maxDepth, currentDepth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitize(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
