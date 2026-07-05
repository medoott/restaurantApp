/**
 * Standardized success response envelope.
 * All successful responses should use this format:
 * { success: true, message: string, data: object, meta?: object }
 *
 * @param {{ res: import('express').Response, message?: string, data?: object, meta?: object, status?: number }} [params]
 */
export const successResponse = ({
  res,
  message = "Done",
  data = {},
  meta,
  status = 200,
} = {}) => {
  if (res.req?.requestId) {
    res.setHeader("X-Request-Id", res.req.requestId);
  }
  const payload = {
    success: true,
    message,
    data: data !== undefined && data !== null ? data : {},
  };
  if (meta !== undefined && meta !== null) {
    payload.meta = meta;
  }
  return res.status(status).json(payload);
};

/**
 * Standardized paginated response envelope.
 * @param {{ res: import('express').Response, message?: string, items: Array, meta: object, status?: number }} [params]
 */
export const paginatedResponse = ({
  res,
  message = "Done",
  items = [],
  meta = {},
  status = 200,
} = {}) => {
  if (res.req?.requestId) {
    res.setHeader("X-Request-Id", res.req.requestId);
  }
  return res.status(status).json({
    success: true,
    message,
    data: items,
    meta,
  });
};
