import mongoose, { Schema, model } from "mongoose";

const DELIVERY_STATUSES = [
  "pending_assignment",
  "assigned",
  "accepted",
  "picked_up",
  "delivered",
  "cancelled",
];

const deliverySchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    orderId: { type: String, required: true },
    tableNumber: { type: Number, default: null },
    waiter: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: DELIVERY_STATUSES,
      default: "pending_assignment",
      index: true,
    },
    assignedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    note: { type: String, default: "" },
    escalationCount: { type: Number, default: 0 },
    lastEscalatedAt: { type: Date, default: null },
    delayAlertSent: { type: Boolean, default: false },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
  },
  { timestamps: true },
);

deliverySchema.index({ waiter: 1, status: 1 });
deliverySchema.index({ status: 1, createdAt: 1 });
deliverySchema.index({ tableNumber: 1, status: 1 });
deliverySchema.index({ status: 1, assignedAt: 1 });
deliverySchema.index({ branchId: 1, status: 1 });

const Delivery = mongoose.models.Delivery || model("Delivery", deliverySchema);

export { DELIVERY_STATUSES };
export default Delivery;
