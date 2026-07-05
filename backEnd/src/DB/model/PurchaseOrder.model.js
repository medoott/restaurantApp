import mongoose, { Schema, model } from "mongoose";

const PO_STATUSES = ["draft", "pending", "approved", "ordered", "partially_received", "received", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "partial", "paid"];

const purchaseOrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, default: "" },
    items: [
      {
        inventoryItem: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, default: "pcs" },
        unitPrice: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
        receivedQuantity: { type: Number, default: 0 },
      },
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: PO_STATUSES, default: "draft", index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date, default: null },
    receivedDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const PurchaseOrder = mongoose.models.PurchaseOrder || model("PurchaseOrder", purchaseOrderSchema);

export { PO_STATUSES, PAYMENT_STATUSES };
export default PurchaseOrder;
