import mongoose, { Schema, model } from "mongoose";

const SUPPLIER_STATUSES = ["active", "inactive", "blacklisted"];

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    company: { type: String, default: "", trim: true },
    contactPerson: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    alternativePhone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    taxId: { type: String, default: "", trim: true },
    paymentTerms: { type: String, default: "net30" },
    status: { type: String, enum: SUPPLIER_STATUSES, default: "active" },
    productsSupplied: [{ type: Schema.Types.ObjectId, ref: "InventoryItem" }],
    productNames: [{ type: String }],
    notes: { type: String, default: "" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalPurchases: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date, default: null },
    purchaseHistory: [
      {
        orderId: { type: String },
        date: { type: Date },
        total: { type: Number },
        status: { type: String, enum: ["pending", "received", "cancelled"] },
        itemCount: { type: Number },
      },
    ],
    deliveryHistory: [
      {
        date: { type: Date },
        onTime: { type: Boolean },
        delayMinutes: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

supplierSchema.index({ status: 1 });
supplierSchema.index({ rating: -1 });

const Supplier = mongoose.models.Supplier || model("Supplier", supplierSchema);

export { SUPPLIER_STATUSES };
export default Supplier;
