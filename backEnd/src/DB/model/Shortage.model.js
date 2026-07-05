import mongoose, { Schema, model } from "mongoose";

const SHORTAGE_STATUSES = ["Pending", "Resolved", "Dismissed"];

const shortageSchema = new Schema(
  {
    item: { type: String, required: true },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
    },
    quantityNeeded: { type: Number, default: 1, min: 1 },
    message: { type: String, default: "Need restock" },
    status: {
      type: String,
      enum: SHORTAGE_STATUSES,
      default: "Pending",
      index: true,
    },
    createdBy: { type: String, default: "Cook" },
    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

shortageSchema.index({ status: 1, createdAt: -1 });
shortageSchema.index({ inventoryItemId: 1 });

const Shortage = mongoose.models.Shortage || model("Shortage", shortageSchema);

export { SHORTAGE_STATUSES };
export default Shortage;
