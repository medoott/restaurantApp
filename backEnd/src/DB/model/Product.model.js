import mongoose, { Schema, model } from "mongoose";

const PRODUCT_AVAILABILITY = ["available", "limited", "unavailable", "seasonal"];

const productSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: false, trim: true },
    category: { type: String, default: "Misc", index: true },
    price: { type: Number, default: 0 },
    desc: { type: String, default: "" },
    img: { type: String, default: "" },
    allergens: [{ type: String }],
    ingredients: [{ type: String }],
    nutritionalInfo: {
      calories: { type: Number, default: 0 },
      protein: { type: String, default: "" },
      carbs: { type: String, default: "" },
      fat: { type: String, default: "" },
    },
    prepTimeMinutes: { type: Number, default: 10 },
    availability: { type: String, enum: PRODUCT_AVAILABILITY, default: "available", index: true },
    isPopular: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    isSignature: { type: Boolean, default: false },
    customizationOptions: [{
      name: { type: String },
      type: { type: String, enum: ["select", "multi", "toggle", "text"] },
      options: [{ label: String, priceAdjustment: { type: Number, default: 0 } }],
      required: { type: Boolean, default: false },
      maxSelections: { type: Number, default: 0 },
    }],
    stockLevel: { type: Number, default: 999 },
    maxPerOrder: { type: Number, default: 0 },
    taxCategory: { type: String, default: "standard" },
    sortOrder: { type: Number, default: 0 },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, sortOrder: 1 });
productSchema.index({ isPopular: 1 });
productSchema.index({ isRecommended: 1 });
productSchema.index({ branchId: 1 });
productSchema.index({ branchId: 1, isActive: 1 });
productSchema.index({ branchId: 1, category: 1, sortOrder: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 1 });
productSchema.index({ isSignature: 1 });

const Product = mongoose.models.Product || model("Product", productSchema);

export { PRODUCT_AVAILABILITY };
export default Product;
