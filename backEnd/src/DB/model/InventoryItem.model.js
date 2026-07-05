import mongoose, { Schema, model } from "mongoose";

const UNITS = ["kg", "g", "L", "ml", "pcs", "units", "boxes", "bags", "bottles", "cans"];

const MOVEMENT_TYPES = ["restock", "reduce", "transfer_in", "transfer_out", "adjustment", "wastage", "expired"];

const inventoryItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: "Uncategorized", trim: true, index: true },
    currentStock: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 10 },
    maxStockLevel: { type: Number, default: 100 },
    unit: { type: String, enum: UNITS, default: "pcs" },
    costPerUnit: { type: Number, default: 0, min: 0 },
    supplier: { type: String, default: "", trim: true },
    storageLocation: { type: String, default: "", trim: true },
    lastRestockDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    movements: [
      {
        type: { type: String, enum: MOVEMENT_TYPES, required: true },
        qty: { type: Number, required: true },
        beforeStock: { type: Number, required: true },
        afterStock: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String, default: "" },
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
  },
  { timestamps: true },
);

inventoryItemSchema.index({ currentStock: 1 });
inventoryItemSchema.index({ expirationDate: 1 });

inventoryItemSchema.virtual("status").get(function () {
  if (this.expirationDate && this.expirationDate <= new Date()) return "expired";
  if (this.currentStock <= 0) return "out_of_stock";
  if (this.currentStock <= this.minStockLevel * 0.25) return "critical";
  if (this.currentStock <= this.minStockLevel) return "low_stock";
  if (
    this.expirationDate &&
    this.expirationDate > new Date() &&
    this.expirationDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  ) {
    return "near_expiration";
  }
  return "in_stock";
});

inventoryItemSchema.set("toJSON", { virtuals: true });
inventoryItemSchema.set("toObject", { virtuals: true });

const InventoryItem =
  mongoose.models.InventoryItem || model("InventoryItem", inventoryItemSchema);

export { UNITS, MOVEMENT_TYPES };
export default InventoryItem;
