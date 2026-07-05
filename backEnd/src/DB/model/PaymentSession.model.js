import mongoose, { Schema, model } from "mongoose";

const PAYMENT_SESSION_STATUSES = ["pending", "processing", "completed", "cancelled", "refunded"];
const PAYMENT_METHODS = ["Cash", "Card", "Online", "Mobile Wallet", "Voucher", "Split"];

const paymentSessionSchema = new Schema(
  {
    visitId: { type: Schema.Types.ObjectId, ref: "Visit", default: null, index: true },
    visitNumber: { type: String, default: "" },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    orderId: { type: String, default: "" },
    orderIds: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    tableNumber: { type: Number, default: null },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: PAYMENT_SESSION_STATUSES,
      default: "pending",
      index: true,
    },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "Cash" },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percentage", "fixed", "coupon"], default: "fixed" },
    couponCode: { type: String, default: "" },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    note: { type: String, default: "" },
    receiptGenerated: { type: Boolean, default: false },
    receiptUrl: { type: String, default: "" },
    isSplitPayment: { type: Boolean, default: false },
    splitGroup: { type: String, default: "" },
    splitTotal: { type: Number, default: null },
    parentSessionId: { type: Schema.Types.ObjectId, ref: "PaymentSession", default: null },
    refundedAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: "" },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    tipAmount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    items: [
      {
        name: String,
        qty: Number,
        price: Number,
        total: Number,
        category: { type: String, default: "" },
        assignedGuest: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true, optimisticConcurrency: true },
);

paymentSessionSchema.index({ status: 1, createdAt: 1 });
paymentSessionSchema.index({ requestedBy: 1, status: 1 });
paymentSessionSchema.index({ cashierId: 1, status: 1 });
paymentSessionSchema.index({ isSplitPayment: 1, splitGroup: 1 });

const PaymentSession = mongoose.models.PaymentSession || model("PaymentSession", paymentSessionSchema);

export { PAYMENT_SESSION_STATUSES, PAYMENT_METHODS };
export default PaymentSession;
