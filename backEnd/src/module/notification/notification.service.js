import Notification from "../../DB/model/Notification.model.js";
import { getIO } from "../../config/socket.js";

export const createNotification = async ({
  type,
  title,
  message = "",
  priority = "medium",
  recipientId = null,
  roleTarget = null,
  senderId = null,
  metadata = {},
  expiresAt = null,
}) => {
  const notification = await Notification.create({
    type, title, message, priority,
    recipientId, roleTarget, senderId, metadata, expiresAt,
  });

  const io = getIO();
  if (io) {
    const payload = notification.toObject();
    if (recipientId) {
      io.to(`user:${recipientId}`).emit("notification:new", payload);
    }
    if (roleTarget) {
      io.to(`role:${roleTarget}`).emit("notification:new", payload);
    }
    io.emit("notification:new", payload);
  }

  return notification;
};

export const getNotifications = async (query = {}) => {
  const { userId, role, unreadOnly = false, limit = 50, skip = 0 } = query;
  const filter = {};

  if (userId) {
    filter.$or = [{ recipientId: userId }, { recipientId: null }];
  }
  if (role) {
    filter.$or = [...(filter.$or || []), { roleTarget: role }];
  }
  if (unreadOnly) {
    filter.read = false;
  }

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);

  return { items, total, unread, limit, skip };
};

export const acknowledgeNotification = async (id, userId) => {
  const notification = await Notification.findByIdAndUpdate(
    id,
    { read: true, acknowledgedAt: new Date(), acknowledgedBy: userId },
    { returnDocument: "after" },
  );
  if (!notification) throw new Error("Notification not found");
  return notification;
};

export const acknowledgeAll = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, read: false },
    { read: true, acknowledgedAt: new Date(), acknowledgedBy: userId },
  );
  return { modifiedCount: result.modifiedCount };
};

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipientId: userId, read: false });
};

export const deleteOldNotifications = async (days = 30) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return Notification.deleteMany({ createdAt: { $lt: cutoff }, read: true });
};
