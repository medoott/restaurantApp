import mongoose, { Schema, model } from "mongoose";

const TABLE_SECTIONS = ["Indoor", "Outdoor", "VIP", "Family", "Bar", "Patio", "Balcony", "Private Room"];
const TABLE_STATUSES = [
  "available", "reserved", "occupied", "ordering", "preparing",
  "serving", "dining", "waiting_for_bill", "payment",
  "needs_cleaning", "cleaning_in_progress", "out_of_service"
];

const tableSchema = new Schema(
  {
    tableNumber: { type: Number, required: true, unique: true, index: true },
    qrCode: { type: String, unique: true, sparse: true, index: true },
    status: {
      type: String,
      enum: TABLE_STATUSES,
      default: "available",
    },
    capacity: { type: Number, default: 4 },
    minCapacity: { type: Number, default: 1 },
    section: { type: String, enum: TABLE_SECTIONS, default: "Indoor" },
    branch: { type: String, default: "" },
    notes: { type: String, default: "" },
    currentSession: { type: Schema.Types.ObjectId, ref: "TableSession", default: null },
    currentVisit: { type: Schema.Types.ObjectId, ref: "Visit", default: null },
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lockedReason: { type: String, default: "" },
    mergedInto: { type: Schema.Types.ObjectId, ref: "Table", default: null },
    mergedTables: [{ type: Schema.Types.ObjectId, ref: "Table" }],
    seatCount: { type: Number, default: 4 },
    assignedWaiter: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedWaiters: [{ type: Schema.Types.ObjectId, ref: "User" }],
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    shape: { type: String, enum: ["circle", "rectangle", "square", "round"], default: "circle" },
    cleaning: {
      assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    metrics: {
      totalSittingsToday: { type: Number, default: 0 },
      lastCleanedAt: { type: Date, default: null },
      averageTurnoverMinutes: { type: Number, default: 0 },
      totalRevenueGenerated: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

tableSchema.index({ section: 1, status: 1 });
tableSchema.index({ status: 1 });
tableSchema.index({ branch: 1 });
tableSchema.index({ branch: 1, status: 1 });
tableSchema.index({ section: 1 });
tableSchema.index({ assignedWaiter: 1 });
tableSchema.index({ currentSession: 1 });
tableSchema.index({ currentVisit: 1 });

const Table = mongoose.models.Table || model("Table", tableSchema);

export { TABLE_SECTIONS, TABLE_STATUSES };
export default Table;
