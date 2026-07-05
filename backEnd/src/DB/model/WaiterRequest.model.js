import mongoose, { Schema, model } from "mongoose";

const REQUEST_TYPES = [
  "call_waiter", "request_bill", "need_water", "need_cutlery",
  "need_napkins", "need_sauce", "need_assistance", "request_water_refill",
  "order_issue", "complaint", "request_manager", "other",
];

const REQUEST_STATUSES = ["pending", "acknowledged", "in_progress", "resolved", "cancelled", "escalated"];
const REQUEST_PRIORITIES = ["low", "medium", "high", "critical"];

const waiterRequestSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: "Table", required: true, index: true },
    tableNumber: { type: Number, required: true },
    tableSession: { type: Schema.Types.ObjectId, ref: "TableSession", default: null },
    visit: { type: Schema.Types.ObjectId, ref: "Visit", default: null },
    type: { type: String, enum: REQUEST_TYPES, required: true, index: true },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending", index: true },
    priority: { type: String, enum: REQUEST_PRIORITIES, default: "medium" },

    message: { type: String, default: "" },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    acknowledgedAt: { type: Date, default: null },

    inProgressBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    inProgressAt: { type: Date, default: null },

    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },

    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: "" },

    escalationCount: { type: Number, default: 0 },
    lastEscalatedAt: { type: Date, default: null },
    escalatedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

    reminderSentAt: { type: Date, default: null },
    responseTimeSeconds: { type: Number, default: 0 },
    resolutionTimeSeconds: { type: Number, default: 0 },
    source: { type: String, enum: ["customer", "staff", "system"], default: "customer" },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

waiterRequestSchema.index({ status: 1, createdAt: -1 });
waiterRequestSchema.index({ table: 1, status: 1 });
waiterRequestSchema.index({ assignedTo: 1, status: 1 });
waiterRequestSchema.index({ type: 1, status: 1 });
waiterRequestSchema.index({ escalationCount: 1, lastEscalatedAt: 1 });

const WaiterRequest = mongoose.models.WaiterRequest || model("WaiterRequest", waiterRequestSchema);

export { REQUEST_TYPES, REQUEST_STATUSES, REQUEST_PRIORITIES };
export default WaiterRequest;
