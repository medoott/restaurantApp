import mongoose, { Schema, model } from "mongoose";

const VISIT_SOURCES = ["walk_in", "reservation", "online", "phone", "vip"];
const VISIT_STATUSES = [
  "waiting", "arrived", "seated", "dining", "bill_requested",
  "payment", "payment_completed", "closed", "cancelled",
];

const visitSchema = new Schema(
  {
    visitNumber: { type: String, unique: true, index: true },
    source: { type: String, enum: VISIT_SOURCES, default: "walk_in" },
    status: { type: String, enum: VISIT_STATUSES, default: "waiting", index: true },

    // Guest information (backward compatible)
    guestName: { type: String, default: "" },
    guestPhone: { type: String, default: "" },
    guestCount: { type: Number, default: 1 },
    email: { type: String, default: "" },
    customerProfileId: { type: Schema.Types.ObjectId, ref: "CustomerProfile", default: null },
    isVIP: { type: Boolean, default: false },
    membershipLevel: { type: String, default: "bronze" },
    tags: [{ type: String }],

    // Table assignment (backward compatible)
    table: { type: Schema.Types.ObjectId, ref: "Table", default: null, index: true },
    tableNumber: { type: Number, default: null },
    tableSection: { type: String, default: "" },

    // Reservation link
    reservation: { type: Schema.Types.ObjectId, ref: "Reservation", default: null },

    // Staff assignments
    waiter: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    host: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cashier: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // Session
    session: { type: Schema.Types.ObjectId, ref: "TableSession", default: null },
    sessionToken: { type: String, default: "" },

    // Orders and requests
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    requestIds: [{ type: Schema.Types.ObjectId, ref: "WaiterRequest" }],
    paymentSessionIds: [{ type: Schema.Types.ObjectId, ref: "PaymentSession" }],

    // Queue reference
    queueEntry: { type: Schema.Types.ObjectId, ref: "GuestQueue", default: null },
    queuePosition: { type: Number, default: null },
    queueEstimatedWaitMinutes: { type: Number, default: 0 },

    // Financial
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "partial", "paid", "refunded"], default: "unpaid" },

    // Timestamps
    arrivedAt: { type: Date, default: Date.now },
    seatedAt: { type: Date, default: null },
    firstOrderAt: { type: Date, default: null },
    lastOrderAt: { type: Date, default: null },
    billRequestedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    // Metrics
    totalOrders: { type: Number, default: 0 },
    requestCount: { type: Number, default: 0 },
    totalDiningMinutes: { type: Number, default: 0 },

    // Audit
    closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancellationReason: { type: String, default: "" },
    notes: { type: String, default: "" },
    branch: { type: String, default: "" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

visitSchema.index({ table: 1, status: 1 });
visitSchema.index({ waiter: 1, status: 1 });
visitSchema.index({ status: 1, createdAt: -1 });
visitSchema.index({ createdAt: -1 });
visitSchema.index({ guestPhone: 1 });
visitSchema.index({ isVIP: 1 });
visitSchema.index({ tableNumber: 1, status: 1 });
visitSchema.index({ branchId: 1, status: 1 });

visitSchema.pre("save", function (next) {
  if (this.seatedAt && this.closedAt) {
    this.totalDiningMinutes = Math.round((this.closedAt - this.seatedAt) / 60000);
  }
  this.totalOrders = (this.orders || []).length;
  this.requestCount = (this.requestIds || []).length;
  next();
});

const Visit = mongoose.models.Visit || model("Visit", visitSchema);

export { VISIT_SOURCES, VISIT_STATUSES };
export default Visit;
