import mongoose, { Schema, model } from "mongoose";

const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled", "escalated"];
const TASK_PRIORITIES = ["low", "medium", "high", "critical"];
const TASK_CATEGORIES = [
  "deliver_order", "serve_table", "assist_customer",
  "prepare_order", "prepare_drink", "prepare_dessert",
  "process_payment", "print_receipt", "close_table",
  "restock_item", "check_inventory",
  "waiter_call", "bill_request", "customer_request",
  "cleaning", "other",
];

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, enum: TASK_CATEGORIES, default: "other", index: true },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    tableNumber: { type: Number, default: null },
    orderId: { type: String, default: null },
    requestId: { type: Schema.Types.ObjectId, default: null },
    escalationCount: { type: Number, default: 0 },
    escalatedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    dueBy: { type: Date, default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1, priority: -1, createdAt: 1 });
taskSchema.index({ tableNumber: 1, status: 1 });
taskSchema.index({ dueBy: 1, status: 1 });

const Task = mongoose.models.Task || model("Task", taskSchema);

export { TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES };
export default Task;
