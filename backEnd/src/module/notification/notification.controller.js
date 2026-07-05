import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import * as notificationService from "./notification.service.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications({
    userId: req.user?._id,
    role: req.user?.role,
    unreadOnly: req.query.unreadOnly === "true",
    limit: Math.min(Number(req.query.limit) || 50, 100),
    skip: Number(req.query.skip) || 0,
  });
  successResponse({ res, data: result, status: 200 });
});

export const acknowledgeNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.acknowledgeNotification(req.params.id, req.user?._id);
  successResponse({ res, data: notification, status: 200 });
});

export const acknowledgeAllNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.acknowledgeAll(req.user?._id);
  successResponse({ res, data: result, status: 200 });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user?._id);
  successResponse({ res, data: { count }, status: 200 });
});
