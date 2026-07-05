import mongoose, { Schema, model } from "mongoose";

const tableSessionSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: "Table", required: true, index: true },
    sessionToken: { type: String, unique: true, index: true, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "closed"],
      default: "active",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    orderIds: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    closedAt: { type: Date, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

tableSessionSchema.methods.isExpired = function () {
  return this.expiresAt <= new Date() || this.status !== "active";
};

tableSessionSchema.methods.touch = function () {
  this.lastActivityAt = new Date();
  this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return this.save();
};

const TableSession = mongoose.models.TableSession || model("TableSession", tableSessionSchema);

export default TableSession;
