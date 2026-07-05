import mongoose, { Schema, model } from "mongoose";

const recipeSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, required: true },
    servings: { type: Number, default: 1 },
    ingredients: [
      {
        inventoryItem: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, default: "pcs" },
      },
    ],
    instructions: { type: String, default: "" },
    prepTime: { type: Number, default: 0 },
    costPerServing: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

recipeSchema.index({ product: 1, isActive: 1 });

recipeSchema.methods.calculateCost = function () {
  let total = 0;
  for (const ing of this.ingredients) {
    total += ing.quantity * (ing.costPerUnit || 0);
  }
  this.costPerServing = total;
  return total;
};

const Recipe = mongoose.models.Recipe || model("Recipe", recipeSchema);

export default Recipe;
