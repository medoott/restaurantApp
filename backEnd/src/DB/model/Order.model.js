import mongoose, { Schema, model } from "mongoose";

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "ReadyForPickup",
  "BeingDelivered",
  "Served",
  "Dining",
  "BillRequested",
  "PaymentInProgress",
  "Paid",
  "Cleaning",
  "Cancelled",
  "Rejected",
  "Reopened",
  "Refunded",
  "Modified",
];

const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partially_paid"];

const orderSchema = new Schema(
  {
    id: { type: String, unique: true, index: true },
    visitId: { type: Schema.Types.ObjectId, ref: "Visit", default: null, index: true },
    visitNumber: { type: String, default: "" },
    customer: { type: String, default: "" },
    code: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    itemsDetail: [{
      id: String,
      name: String,
      qty: Number,
      price: Number,
      notes: { type: String, default: "" },
      customization: [
        {
          optionName: String,
          selection: String,
          priceAdjustment: { type: Number, default: 0 },
        },
      ],
      allergens: [{ type: String }],
      category: { type: String, default: "" },
      prepTimeMinutes: { type: Number, default: 0 },
      originalPrice: { type: Number, default: 0 },
    }],
    payment: { type: String, default: "Cash" },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
    },
    total: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Pending",
    },
    priority: { type: String, enum: ["normal", "rush", "vip"], default: "normal" },
    tableNumber: { type: Number, default: null },
    tableId: { type: String, default: null },
    tableSession: { type: Schema.Types.ObjectId, ref: "TableSession", default: null },
    locked: { type: Boolean, default: false },
    editExpiresAt: { type: Date, default: null },
    guestLabel: { type: String, default: "" },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    acceptedAt: { type: Date, default: null },
    preparedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    servedAt: { type: Date, default: null },
    completionConfirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "" },
    cancellationReason: { type: String, default: "" },
    reopenedAt: { type: Date, default: null },
    reopenedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reopenReason: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: "" },
    assignedWaiter: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedCook: { type: Schema.Types.ObjectId, ref: "User", default: null },
    billRequestedAt: { type: Date, default: null },
    paymentStartedAt: { type: Date, default: null },
    preparationTimeMinutes: { type: Number, default: 0 },
    deliveryTimeMinutes: { type: Number, default: 0 },
    isReopened: { type: Boolean, default: false },
    originalOrderId: { type: String, default: "" },
    delayMinutes: { type: Number, default: 0 },
    delayAlertSent: { type: Boolean, default: false },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
  },
  { timestamps: true, optimisticConcurrency: true },
);

orderSchema.index({ tableSession: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ assignedWaiter: 1, status: 1 });
orderSchema.index({ priority: 1, status: 1, createdAt: 1 });
orderSchema.index({ delayMinutes: -1, status: 1 });
orderSchema.index({ tableNumber: 1 });
orderSchema.index({ tableId: 1 });
orderSchema.index({ assignedCook: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ code: 1 });
orderSchema.index({ paymentStatus: 1, status: 1 });
orderSchema.index({ branchId: 1, status: 1, createdAt: -1 });
orderSchema.index({ tableSession: 1, status: 1 });

const Order = mongoose.models.Order || model("Order", orderSchema);

export { ORDER_STATUSES, PAYMENT_STATUSES };
export default Order;
