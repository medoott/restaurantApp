import Recipe from "../../../DB/model/Recipe.model.js";
import Product from "../../../DB/model/Product.model.js";
import InventoryItem from "../../../DB/model/InventoryItem.model.js";
import Shortage from "../../../DB/model/Shortage.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

export const listRecipes = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const search = String(query.search || "").trim();
  const productId = String(query.productId || "").trim();
  const isActive = query.isActive !== undefined ? query.isActive === "true" || query.isActive === true : undefined;

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [{ productName: regex }, { instructions: regex }];
  }
  if (productId) filter.product = productId;
  if (isActive !== undefined) filter.isActive = isActive;

  const [items, total] = await Promise.all([
    Recipe.find(filter)
      .populate("product", "name price category")
      .populate("ingredients.inventoryItem", "name unit currentStock")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Recipe.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getRecipeById = async (id) => {
  const recipe = await Recipe.findById(id)
    .populate("product", "name price category")
    .populate("ingredients.inventoryItem", "name unit currentStock costPerUnit")
    .lean();
  if (!recipe) throw new AppError("Recipe not found.", 404);
  return recipe;
};

export const getRecipesByProduct = async (productId) => {
  const recipes = await Recipe.find({ product: productId })
    .populate("ingredients.inventoryItem", "name unit currentStock costPerUnit")
    .sort({ createdAt: -1 })
    .lean();
  return recipes;
};

export const createRecipe = async (payload) => {
  const { product, productName, servings, ingredients, instructions, prepTime } = payload;

  if (!product) throw new AppError("Product ID is required.", 400);

  const productDoc = await Product.findById(product).lean();
  if (!productDoc) throw new AppError("Product not found.", 404);

  const resolvedProductName = productName || productDoc.name;
  if (!resolvedProductName) throw new AppError("Product name is required.", 400);

  const resolvedServings = Math.max(Number(servings) || 1, 1);
  let totalCost = 0;
  const resolvedIngredients = [];

  if (ingredients && ingredients.length > 0) {
    for (const ing of ingredients) {
      if (!ing.inventoryItem) throw new AppError("Each ingredient must have an inventoryItem ID.", 400);

      const invItem = await InventoryItem.findById(ing.inventoryItem).lean();
      if (!invItem) throw new AppError(`Inventory item not found: ${ing.inventoryItem}`, 404);

      const qty = Math.max(Number(ing.quantity) || 0, 0);
      const itemName = ing.itemName || invItem.name;
      const unit = ing.unit || invItem.unit;

      resolvedIngredients.push({
        inventoryItem: invItem._id,
        itemName,
        quantity: qty,
        unit,
      });

      const costPerUnit = invItem.costPerUnit || 0;
      totalCost += qty * costPerUnit;
    }
  }

  const recipe = await Recipe.create({
    product,
    productName: resolvedProductName,
    servings: resolvedServings,
    ingredients: resolvedIngredients,
    instructions: String(instructions || "").trim(),
    prepTime: Math.max(Number(prepTime) || 0, 0),
    costPerServing: totalCost,
    isActive: true,
  });

  return recipe;
};

export const updateRecipe = async (id, payload) => {
  const recipe = await Recipe.findById(id);
  if (!recipe) throw new AppError("Recipe not found.", 404);

  const { product, productName, servings, ingredients, instructions, prepTime, isActive } = payload;

  if (product !== undefined && product !== recipe.product.toString()) {
    const productDoc = await Product.findById(product).lean();
    if (!productDoc) throw new AppError("Product not found.", 404);
    recipe.product = product;
    recipe.productName = productName || productDoc.name;
  }

  if (productName !== undefined) recipe.productName = productName;
  if (servings !== undefined) recipe.servings = Math.max(Number(servings) || 1, 1);
  if (instructions !== undefined) recipe.instructions = String(instructions).trim();
  if (prepTime !== undefined) recipe.prepTime = Math.max(Number(prepTime) || 0, 0);
  if (isActive !== undefined) recipe.isActive = isActive;

  if (ingredients && ingredients.length > 0) {
    const resolvedIngredients = [];
    let totalCost = 0;

    for (const ing of ingredients) {
      if (!ing.inventoryItem) throw new AppError("Each ingredient must have an inventoryItem ID.", 400);

      const invItem = await InventoryItem.findById(ing.inventoryItem).lean();
      if (!invItem) throw new AppError(`Inventory item not found: ${ing.inventoryItem}`, 404);

      const qty = Math.max(Number(ing.quantity) || 0, 0);
      const itemName = ing.itemName || invItem.name;
      const unit = ing.unit || invItem.unit;

      resolvedIngredients.push({
        inventoryItem: invItem._id,
        itemName,
        quantity: qty,
        unit,
      });

      totalCost += qty * (invItem.costPerUnit || 0);
    }

    recipe.ingredients = resolvedIngredients;
    recipe.costPerServing = totalCost;
  }

  await recipe.save();
  return recipe;
};

export const deleteRecipe = async (id) => {
  const recipe = await Recipe.findByIdAndDelete(id).lean();
  if (!recipe) throw new AppError("Recipe not found.", 404);
  return { message: "Recipe deleted." };
};

export const deductInventoryForOrder = async (productName, quantity, userId = null) => {
  const orderQty = Math.max(Number(quantity) || 1, 1);
  const deductionLog = [];
  const shortages = [];

  const recipe = await Recipe.findOne({ productName, isActive: true })
    .populate("ingredients.inventoryItem", "name currentStock unit costPerUnit")
    .lean();

  if (!recipe) {
    return {
      deducted: false,
      message: `No active recipe found for "${productName}".`,
      deductionLog: [],
      shortages: [],
    };
  }

  for (const ing of recipe.ingredients) {
    const item = ing.inventoryItem;
    if (!item) {
      shortages.push({ itemName: ing.itemName, reason: "Inventory item reference missing." });
      continue;
    }

    const totalNeeded = ing.quantity * orderQty;

    if (item.currentStock < totalNeeded) {
      const available = item.currentStock;
      const shortBy = totalNeeded - available;

      if (available > 0) {
        const beforeStock = item.currentStock;
        item.currentStock = 0;
        await InventoryItem.updateOne(
          { _id: item._id },
          {
            $set: { currentStock: 0 },
            $push: {
              movements: {
                type: "reduce",
                qty: available,
                beforeStock,
                afterStock: 0,
                date: new Date(),
                note: `Deducted for order: ${productName} x${orderQty} (partial)`,
                userId,
              },
            },
          },
        );

        deductionLog.push({
          itemName: item.name,
          needed: totalNeeded,
          deducted: available,
          shortBy,
          fullDeduction: false,
        });
      } else {
        deductionLog.push({
          itemName: item.name,
          needed: totalNeeded,
          deducted: 0,
          shortBy: totalNeeded,
          fullDeduction: false,
        });
      }

      await Shortage.create({
        item: item.name,
        inventoryItemId: item._id,
        quantityNeeded: shortBy,
        message: `Short ${shortBy} ${item.unit} of ${item.name} for recipe "${productName}"`,
        createdBy: "System",
      });

      shortages.push({ itemName: item.name, shortBy, unit: item.unit });
    } else {
      const beforeStock = item.currentStock;
      await InventoryItem.updateOne(
        { _id: item._id },
        {
          $set: { currentStock: item.currentStock - totalNeeded },
          $push: {
            movements: {
              type: "reduce",
              qty: totalNeeded,
              beforeStock,
              afterStock: beforeStock - totalNeeded,
              date: new Date(),
              note: `Deducted for order: ${productName} x${orderQty}`,
              userId,
            },
          },
        },
      );

      deductionLog.push({
        itemName: item.name,
        needed: totalNeeded,
        deducted: totalNeeded,
        shortBy: 0,
        fullDeduction: true,
      });
    }
  }

  return {
    deducted: shortages.length === 0,
    recipe: recipe._id,
    productName,
    quantity: orderQty,
    deductionLog,
    shortages,
  };
};

export const calculateRecipeCost = async (recipeId) => {
  const recipe = await Recipe.findById(recipeId)
    .populate("ingredients.inventoryItem", "name costPerUnit")
    .lean();

  if (!recipe) throw new AppError("Recipe not found.", 404);

  let totalCost = 0;
  const breakdown = [];

  for (const ing of recipe.ingredients) {
    const item = ing.inventoryItem;
    const costPerUnit = item ? Number(item.costPerUnit) || 0 : 0;
    const lineCost = ing.quantity * costPerUnit;
    totalCost += lineCost;

    breakdown.push({
      itemName: ing.itemName,
      quantity: ing.quantity,
      unit: ing.unit,
      costPerUnit,
      lineCost,
    });
  }

  return {
    recipeId: recipe._id,
    productName: recipe.productName,
    servings: recipe.servings,
    costPerServing: totalCost,
    breakdown,
  };
};

export const getRecipeCostAnalysis = async () => {
  const recipes = await Recipe.find({ isActive: true })
    .populate("product", "name price")
    .populate("ingredients.inventoryItem", "name costPerUnit")
    .lean();

  const analysis = [];

  for (const recipe of recipes) {
    let costPerServing = 0;

    for (const ing of recipe.ingredients) {
      const item = ing.inventoryItem;
      const costPerUnit = item ? Number(item.costPerUnit) || 0 : 0;
      costPerServing += ing.quantity * costPerUnit;
    }

    const sellingPrice = recipe.product ? Number(recipe.product.price) || 0 : 0;
    const margin = sellingPrice > 0
      ? Number((((sellingPrice - costPerServing) / sellingPrice) * 100).toFixed(2))
      : null;

    analysis.push({
      recipeId: recipe._id,
      productName: recipe.productName,
      productId: recipe.product?._id || null,
      sellingPrice,
      costPerServing: Number(costPerServing.toFixed(2)),
      profitPerServing: sellingPrice > 0 ? Number((sellingPrice - costPerServing).toFixed(2)) : null,
      margin,
      servings: recipe.servings,
      isActive: recipe.isActive,
    });
  }

  analysis.sort((a, b) => (a.margin ?? -Infinity) - (b.margin ?? -Infinity));

  return analysis;
};
