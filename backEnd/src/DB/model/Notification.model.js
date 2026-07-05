import mongoose, { Schema, model } from "mongoose";

const NOTIFICATION_PRIORITIES = ["low", "medium", "high", "critical"];
const NOTIFICATION_TYPES = [
  "new_order", "order_accepted", "order_ready", "order_served", "order_paid",
  "waiter_call", "waiter_bill", "waiter_water", "waiter_cutlery", "waiter_assistance",
  "waiter_assigned", "waiter_escalated",
  "task_assigned", "task_completed",
  "inventory_alert", "shortage_alert",
  "shift_reminder",
  "manager_alert",
  "system",
];

const notificationSchema = new Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "medium",
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    roleTarget: { type: String, default: null, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    read: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    metadata: {
      orderId: { type: String, default: null },
      tableNumber: { type: Number, default: null },
      requestId: { type: Schema.Types.ObjectId, default: null },
      taskId: { type: Schema.Types.ObjectId, default: null },
      url: { type: String, default: null },
    },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ roleTarget: 1, read: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = mongoose.models.Notification || model("Notification", notificationSchema);

export { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES };
export default Notification;
